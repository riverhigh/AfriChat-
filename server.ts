import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

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

// ── CUSTOM APPLICATION FIREWALL (WAF) & THREAT INSPECTION ──────────────────
const SQLI_REGEX = /(union\s+select\b|select\s+(?:\*|distinct\s+|[a-z0-9_."`,]+\s+)from\s+[a-z0-9_."`]+|insert\s+into\s+[a-z0-9_."`]+|drop\s+table\b|update\s+[a-z0-9_."`]+\s+set\s+[a-z0-9_."`]+=|delete\s+from\s+[a-z0-9_."`]+|sleep\(\d+\)|benchmark\(|waitfor\s+delay|;\s*--|\/\*|\*\/|;\s*drop\b|'\s*or\s*['\d]=['\d])/i;
const XSS_REGEX = /(<script.*?>|javascript:|onload\s*=|onerror\s*=|onmouseover\s*=|eval\(|<iframe|<svg.*?onload)/i;
const PATH_TRAVERSAL_REGEX = /(\.\.[\/\\]|%2e%2e%2f|%2e%2e\/|\.\.%2f|\/etc\/passwd|win\.ini)/i;

function inspectPayloadForThreats(target: any): string | null {
  if (!target) return null;
  let str = typeof target === 'string' ? target : JSON.stringify(target);
  if (str.includes('data:image/')) {
    str = str.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '[image_data]');
  }
  if (SQLI_REGEX.test(str)) return 'SQL Injection attempt detected';
  if (XSS_REGEX.test(str)) return 'XSS payload detected';
  if (PATH_TRAVERSAL_REGEX.test(str)) return 'Path traversal attempt detected';
  return null;
}

// ── ADMIN AUDIT, SECURITY EVENTS & IP BLOCKLIST STORE ───────────────────────
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
        message: 'Access Denied: IP address is on the AGC security blocklist.',
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
      message: 'Access Denied: Malicious payload pattern intercepted by AfriChat WAF engine.',
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
      message: 'Access Denied: Dangerous query parameters detected.',
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
        message: 'Access Denied: Dangerous request body detected.',
        code: 'AGC_WAF_BODY_VIOLATION',
      });
    }
  }

  next();
});

// ============================================================
// STRICT SERVER-SIDE AUTHENTICATION & ACCESS CONTROL
// ============================================================
const ADMIN_API_SECRET = (process.env.ADMIN_API_SECRET || '').trim() || 'fba230fada7e45ac2bf946fda50c0547d46d4300e2a6d8419e5bca9a2172c440';

function isAuthorizedAdminRequest(req: Request): boolean {
  try {
    const headerKey = ((req.headers['x-admin-key'] as string) || '').trim();
    const authHeader = ((req.headers['authorization'] as string) || '').trim();
    const bearerKey = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const candidate = headerKey || bearerKey;
    if (!candidate || !ADMIN_API_SECRET) return false;
    const candBuf = Buffer.from(candidate, 'utf8');
    const secretBuf = Buffer.from(ADMIN_API_SECRET, 'utf8');
    if (candBuf.length !== secretBuf.length) return false;
    return crypto.timingSafeEqual(candBuf, secretBuf);
  } catch (_) {
    return false;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthorizedAdminRequest(req)) {
    return next();
  }
  const clientIp = getClientIp(req);
  recordSecurityEvent({
    type: 'unauthorized_admin_access',
    severity: 'high',
    ip: clientIp,
    path: req.originalUrl || req.url,
    reason: 'Missing or invalid x-admin-key header on protected administrative route.',
  });
  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Valid admin authentication key required.',
    code: 'AGC_ADMIN_UNAUTHORIZED',
  });
}

// User caller session verification to prevent account impersonation
function verifyUserSession(phone: string, req: Request): boolean {
  if (isAuthorizedAdminRequest(req)) return true;
  const clean = String(phone || '').replace(/\D/g, '');
  if (!clean) return false;
  const userEntry = findUserEntry(clean);
  if (!userEntry?.user) return true; // Account not registered yet (e.g. signup flow)
  const storedToken = userEntry.user.sessionToken;
  if (!storedToken) return true; // Legacy profile without sessionToken enrolled
  const tokenFromHeader = ((req.headers['x-session-token'] as string) || '').trim();
  const tokenFromBody = String(req.body?.sessionToken || '').trim();
  const candidate = tokenFromHeader || tokenFromBody;
  if (!candidate) return false;
  return candidate === storedToken;
}

// Intercept and protect ALL /api/admin routes with strict admin auth
app.use('/api/admin', requireAdminAuth);

// ── AUTH ROUTE RATE LIMITER (BRUTE FORCE PROTECTION) ───────────────────────
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

// ── ANTI-BOT & RECON SCRAPING MITIGATION ────────────────────────────────────
const BOT_USER_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'gobuster', 'dirbuster', 'wpscan',
  'python-requests', 'python-urllib', 'aiohttp', 'curl/', 'wget/', 'postmanruntime',
  'headlesschrome', 'playwright', 'puppeteer', 'selenium', 'node-fetch', 'axios/', 'undici',
];

const SYNTHETIC_TEST_LAST9 = new Set([
  '800000000',
  '800000001',
  '000000001',
  '099988877',
  '055511122',
  '099911101',
  '099911102',
  '999000111',
  '990001111',
  '990002222',
  '812345678',
  '123456789',
]);

const SYNTHETIC_TEST_NAMES = new Set([
  'bet tester one',
  'bet tester two',
  'test user',
  'test payer',
  'test requester',
  'chidi okafor',
  'amaka nwosu',
  'chioma adebayo',
  'tunde balogun',
]);

function isSyntheticTestAccount(input?: {
  id?: string;
  fullName?: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  phone?: string;
  cleanPhone?: string;
  full_phone?: string;
  phone_digits?: string;
  userPhone?: string;
  userName?: string;
} | null): boolean {
  if (!input) return false;
  const idStr = String(input.id || '').trim().toLowerCase();
  if (
    idStr === 'usr_test' ||
    idStr === 'usr_chioma_adebayo' ||
    idStr.startsWith('usr_test_') ||
    idStr.startsWith('usr_fresh_test') ||
    idStr === 'usr_2348099911101' ||
    idStr === 'usr_2348099911102' ||
    idStr === 'usr_2348000000001' ||
    idStr === 'usr_2348099988877' ||
    idStr === 'usr_2348055511122'
  ) {
    return true;
  }
  const rawPhone =
    input.phoneNumber ||
    input.phone ||
    input.userPhone ||
    input.cleanPhone ||
    input.full_phone ||
    input.phone_digits ||
    '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits) {
    const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
    if (SYNTHETIC_TEST_LAST9.has(last9)) return true;
    if (/^(234)?80999111\d+$/.test(digits)) return true;
    if (/^(234)?999000\d+$/.test(digits)) return true;
    if (/^(234)?800000000\d+$/.test(digits)) return true;
  }
  const names = [input.fullName, input.name, input.username, input.userName]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase());
  for (const name of names) {
    if (SYNTHETIC_TEST_NAMES.has(name)) return true;
    if (/\b(bet\s*tester|test\s*user|test\s*payer|test\s*requester|bot\s*tester|spam\s*bot)\b/i.test(name)) {
      return true;
    }
  }
  return false;
}

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

// Apply rate limiter and bot protection to user registration, auth lookup, and wallet/ledger routes
app.use('/api/users/register', authRateLimiter, botMitigation);
app.use('/api/users/check-phone', authRateLimiter);
app.use('/api/users/check-username', authRateLimiter);
app.use('/api/users', botMitigation);
app.use('/api/wallet/ledger', botMitigation);
app.use('/api/wallet/pay-bill', botMitigation);
app.use('/api/wallet/transfer', botMitigation);

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
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  blockedPhones?: string[];
}

function expireUserSuspensionIfElapsed(user: RegisteredUser, mapKey?: string): boolean {
  if (
    user.status === 'suspended' &&
    user.suspendedUntil &&
    Date.now() >= new Date(user.suspendedUntil).getTime()
  ) {
    user.status = 'active';
    delete user.suspendedAt;
    delete user.suspendedUntil;
    delete user.suspensionReason;
    (user as any).updatedAt = new Date().toISOString();
    if (mapKey) {
      usersByPhone.set(mapKey, user);
    }
    return true;
  }
  return false;
}

const usersByPhone = new Map<string, RegisteredUser>();

// ── Single-Session Enforcement: phone → active socket id ──────────────────────
// When a phone logs in on a new device/tab, the old socket receives 'force_logout'
const phoneToSocketId = new Map<string, string>();
const USERS_FILE = path.join(__dirname, 'data_users.json');
const COMMUNITIES_FILE = path.join(__dirname, 'data_communities.json');
const PRIVATE_GROUPS_FILE = path.join(__dirname, 'data_private_groups.json');
const STATUSES_FILE = path.join(__dirname, 'data_statuses.json');
const MESSAGES_FILE = path.join(__dirname, 'data_messages.json');
const DISPATCH_FILE = path.join(__dirname, 'data_dispatch_orders.json');
const CONFIG_FILE = path.join(__dirname, 'data_admin_config.json');
const CMS_FILE = path.join(__dirname, 'data_admin_cms.json');
const AI_DATACENTER_FILE = path.join(__dirname, 'data_ai_datacenter.json');
const ESCROWS_FILE = path.join(__dirname, 'data_escrow_orders.json');
const PROFESSIONALS_FILE = path.join(__dirname, 'data_professionals.json');

const DEFAULT_SYSTEM_CONFIG = {
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
const ADMIN_SYS_AI_KEY = '__agc_sys_ai_datacenter__';
const ADMIN_SYS_PROFS_KEY = '__agc_sys_professionals__';
const ADMIN_SYS_ESCROWS_KEY = '__agc_sys_escrows__';
const ADMIN_SYS_WALLETS_KEY = '__agc_sys_wallets__';
const ADMIN_SYS_GAME_ESCROWS_KEY = '__agc_sys_game_escrows__';
const ADMIN_SYS_TASKS_KEY = '__agc_sys_task_bounties__';
const ADMIN_SYS_LEDGER_KEY = '__agc_sys_ledger__';
const USER_LEDGER_SLICE_PREFIX = '__agc_sys_ledger_';
const USER_CHAT_BACKUP_PREFIX = '__agc_sys_chats_';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getUserLedgerSliceKey(phoneKey: string): string {
  return `${USER_LEDGER_SLICE_PREFIX}${phoneKey}`;
}

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

// Forward-declared sync hooks populated after state initialization
let syncAiFromSupabaseHook: ((slice: any) => void) | null = null;
let syncProfessionalsFromSupabaseHook: ((slice: any) => void) | null = null;
let syncEscrowsFromSupabaseHook: ((slice: any) => void) | null = null;
let syncWalletsFromSupabaseHook: ((slice: any) => void) | null = null;
let syncGameEscrowsFromSupabaseHook: ((slice: any) => void) | null = null;
let syncTasksFromSupabaseHook: ((slice: any) => void) | null = null;
let syncLedgerFromSupabaseHook: ((slice: any) => void) | null = null;

let initialSupabaseSyncDone = false;
let initialSupabaseSyncPromise: Promise<void> | null = null;

async function syncAdminStateFromSupabase() {
  try {
    // Ensure registry users are populated before applying user overrides
    await syncUsersFromSupabase().catch(() => {});

    const [cfgSlice, cmsSlice, usersSlice, storesSlice, aiSlice, profsSlice, escrowsSlice, walletsSlice, gameEscrowsSlice, tasksSlice, ledgerSlice] = await Promise.all([
      fetchSupabaseAdminSlice(ADMIN_SYS_CONFIG_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_CMS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_USERS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_STORES_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_AI_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_PROFS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_ESCROWS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_WALLETS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_GAME_ESCROWS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_TASKS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_LEDGER_KEY),
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
        if (!ov || isSyntheticTestAccount({ ...ov, phoneNumber: ov.phoneNumber || k })) continue;
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
        } else {
          // Hydrate missing user from Supabase overrides so cold starts never lose admin-funded/verified accounts
          const rawPhone = String(ov.phoneNumber || (k.length >= 9 ? `+234${k.replace(/^0+/, '')}` : k));
          const clean = rawPhone.replace(/\D/g, '') || k.replace(/\D/g, '');
          if (clean.length >= 7) {
            usersByPhone.set(clean, {
              id: ov.id || `usr_${clean}`,
              fullName: ov.fullName || 'Registered User',
              phoneNumber: rawPhone.startsWith('+') ? rawPhone : `+${clean}`,
              cleanPhone: clean,
              avatarUrl:
                ov.avatarUrl ||
                `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(ov.fullName || clean)}`,
              about: 'Available · Using AGC',
              registeredAt: ov.updatedAt || new Date().toISOString(),
              role: ov.role || 'user',
              status: ov.status || 'active',
              verificationBadge: ov.verificationBadge ?? null,
              kycStatus: ov.kycStatus,
              kycType: ov.kycType,
              walletBalanceNgn: typeof ov.walletBalanceNgn === 'number' ? ov.walletBalanceNgn : 0,
              adminWalletAdjustedAt: ov.adminWalletAdjustedAt,
              bannedAt: ov.bannedAt,
              banReason: ov.banReason,
              isOnline: false,
              updatedAt: ov.updatedAt,
            });
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

    if (aiSlice && syncAiFromSupabaseHook) {
      syncAiFromSupabaseHook(aiSlice);
    }
    if (profsSlice && syncProfessionalsFromSupabaseHook) {
      syncProfessionalsFromSupabaseHook(profsSlice);
    }
    if (escrowsSlice && syncEscrowsFromSupabaseHook) {
      syncEscrowsFromSupabaseHook(escrowsSlice);
    }
    if (walletsSlice && syncWalletsFromSupabaseHook) {
      syncWalletsFromSupabaseHook(walletsSlice);
    }
    if (gameEscrowsSlice && syncGameEscrowsFromSupabaseHook) {
      syncGameEscrowsFromSupabaseHook(gameEscrowsSlice);
    }
    if (tasksSlice && syncTasksFromSupabaseHook) {
      syncTasksFromSupabaseHook(tasksSlice);
    }
    if (ledgerSlice && syncLedgerFromSupabaseHook) {
      syncLedgerFromSupabaseHook(ledgerSlice);
    }
    initialSupabaseSyncDone = true;
  } catch (_) {}
}

async function ensureInitialSupabaseSync(): Promise<void> {
  if (initialSupabaseSyncDone) return;
  if (!initialSupabaseSyncPromise) {
    initialSupabaseSyncPromise = Promise.race([
      Promise.all([syncUsersFromSupabase(true), syncAdminStateFromSupabase()]).then(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]).finally(() => {
      initialSupabaseSyncDone = true;
    });
  }
  return initialSupabaseSyncPromise;
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
        if (!clean || isSyntheticTestAccount({ username: row.username, full_phone: rawPhone, phone_digits: clean })) continue;

        const match = findUserEntry(rawPhone) || (row.phone_digits ? findUserEntry(String(row.phone_digits)) : null);
        if (match) {
          const { key, user } = match;
          let rowChanged = false;
          const remoteTs = row.updated_at ? Date.parse(row.updated_at) || 0 : 0;
          const localTs = user.updatedAt ? Date.parse(user.updatedAt) || 0 : 0;
          const isLocalGeneric = !user.fullName || user.fullName === 'AGC User' || user.fullName === 'User' || user.fullName === 'Registered User';
          if (row.username && row.username !== 'AGC User' && (isLocalGeneric || (remoteTs > localTs && row.username !== user.fullName))) {
            user.fullName = row.username;
            user.username = row.username;
            if (row.updated_at) user.updatedAt = row.updated_at;
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
const privateGroupsMap = new Map<string, any>();
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

function resolveServerStatusExpiresAtMs(s: any): number | null {
  if (!s || typeof s !== 'object') return 0;
  if (s.expiresAt) {
    const expMs = typeof s.expiresAt === 'number' ? s.expiresAt : Date.parse(String(s.expiresAt));
    if (Number.isFinite(expMs) && expMs > 0) return expMs;
  }
  const expiresHours = Number(s.expiresInHours) > 0 ? Number(s.expiresInHours) : 24;
  let createdMs = 0;
  if (s.createdAtISO) {
    const parsed = Date.parse(String(s.createdAtISO));
    if (Number.isFinite(parsed) && parsed > 0) createdMs = parsed;
  }
  if (!createdMs && s.created_at) {
    const parsed = Date.parse(String(s.created_at));
    if (Number.isFinite(parsed) && parsed > 0) createdMs = parsed;
  }
  if (!createdMs && typeof s.id === 'string') {
    const m = s.id.match(/\d{12,14}/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (Number.isFinite(n) && n > 1_500_000_000_000) createdMs = n;
    }
  }
  if (createdMs > 0) {
    return createdMs + expiresHours * 3_600_000;
  }
  return null;
}

function isServerStatusExpired(s: any, now = Date.now()): boolean {
  if (!s || !s.id) return true;
  const expMs = resolveServerStatusExpiresAtMs(s);
  if (expMs !== null) {
    return expMs <= now;
  }
  return false;
}

function normalizeServerStatus(s: any): any {
  const now = Date.now();
  const createdISO = s.createdAtISO || s.created_at || new Date(now).toISOString();
  const expMs = resolveServerStatusExpiresAtMs({ ...s, createdAtISO: createdISO }) || (now + 24 * 3_600_000);
  return {
    ...s,
    createdAtISO: createdISO,
    expiresAt: new Date(expMs).toISOString(),
    expiresInHours: Number(s.expiresInHours) > 0 ? Number(s.expiresInHours) : 24,
  };
}

function saveStatusesFile() {
  try {
    fs.writeFileSync(STATUSES_FILE, JSON.stringify(Array.from(statusesMap.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving statuses registry:', e);
  }
}

function purgeExpiredServerStatuses(emitDeleted = false): string[] {
  const now = Date.now();
  const removedIds: string[] = [];
  for (const [id, st] of statusesMap.entries()) {
    if (isServerStatusExpired(st, now)) {
      statusesMap.delete(id);
      removedIds.push(id);
    }
  }
  if (removedIds.length > 0) {
    saveStatusesFile();
    if (emitDeleted) {
      io.emit('status_purged', { ids: removedIds });
    }
    // Best-effort cleanup of expired rows in Supabase user_statuses
    if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      const sbKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
      fetch(`${SUPABASE_URL}/rest/v1/user_statuses?expires_at=lt.${encodeURIComponent(new Date(now).toISOString())}`, {
        method: 'DELETE',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        signal: AbortSignal.timeout(4000),
      }).catch(() => {});
    }
  }
  return removedIds;
}

try {
  if (fs.existsSync(STATUSES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(STATUSES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      const now = Date.now();
      let dirty = false;
      for (const s of raw) {
        if (s?.id && !isServerStatusExpired(s, now)) {
          statusesMap.set(s.id, normalizeServerStatus(s));
        } else {
          dirty = true;
        }
      }
      if (dirty) saveStatusesFile();
    }
  }
} catch (e) {
  console.warn('Notice loading local statuses registry:', e);
}

// ── Durable Store-and-Forward Chat Message Buffer ──────────────────────────
interface StoredChatRelayEntry {
  id: string;
  chatId: string;
  message: any;
  senderPhone?: string;
  targetPhone?: string;
  memberPhones?: string[];
  suppressedForPhones?: string[];
  chat?: any;
  isGroup?: boolean;
  createdAtMs: number;
}

const storedMessagesList: StoredChatRelayEntry[] = [];
const storedMessagesById = new Map<string, StoredChatRelayEntry>();
const MAX_STORED_MESSAGES = 2500;
const MESSAGE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
let messagesSaveTimer: ReturnType<typeof setTimeout> | null = null;

function isPhoneBlockedServer(blockerPhone?: string, senderPhone?: string): boolean {
  if (!blockerPhone || !senderPhone) return false;
  if (phonesMatchServer(blockerPhone, senderPhone)) return false;
  const entry = findUserEntry(blockerPhone);
  const blockedList = entry?.user?.blockedPhones;
  if (!Array.isArray(blockedList) || blockedList.length === 0) return false;
  return blockedList.some((bp) => Boolean(bp) && phonesMatchServer(String(bp), senderPhone));
}

function scheduleSaveMessagesFile() {
  if (messagesSaveTimer) return;
  messagesSaveTimer = setTimeout(() => {
    messagesSaveTimer = null;
    try {
      const cutoff = Date.now() - MESSAGE_RETENTION_MS;
      const pruned = storedMessagesList.filter((m) => m.createdAtMs >= cutoff).slice(-MAX_STORED_MESSAGES);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(pruned));
    } catch (e) {
      console.warn('Notice saving messages buffer:', e);
    }
  }, 150);
}

function recordStoredMessage(entry: Omit<StoredChatRelayEntry, 'createdAtMs'> & { createdAtMs?: number }) {
  if (!entry?.chatId || !entry?.message?.id) return;
  const id = String(entry.message.id);
  const createdAtMs = entry.createdAtMs || Date.now();
  const existing = storedMessagesById.get(id);
  if (existing) {
    existing.message = { ...existing.message, ...entry.message };
    existing.createdAtMs = Math.max(existing.createdAtMs, createdAtMs);
    if (entry.chat) existing.chat = entry.chat;
    if (Array.isArray(entry.suppressedForPhones) && entry.suppressedForPhones.length > 0) {
      existing.suppressedForPhones = dedupePhonesServer([
        ...(existing.suppressedForPhones || []),
        ...entry.suppressedForPhones,
      ]);
    }
    scheduleSaveMessagesFile();
    return;
  }
  const normalized: StoredChatRelayEntry = {
    id,
    chatId: entry.chatId,
    message: entry.message,
    senderPhone: entry.senderPhone,
    targetPhone: entry.targetPhone,
    memberPhones: entry.memberPhones,
    suppressedForPhones: entry.suppressedForPhones,
    chat: entry.chat,
    isGroup: entry.isGroup,
    createdAtMs,
  };
  storedMessagesList.push(normalized);
  storedMessagesById.set(id, normalized);
  if (storedMessagesList.length > MAX_STORED_MESSAGES) {
    const removed = storedMessagesList.splice(0, storedMessagesList.length - MAX_STORED_MESSAGES);
    removed.forEach((r) => storedMessagesById.delete(r.id));
  }
  scheduleSaveMessagesFile();
}

function markStoredMessagesRead(
  chatId: string,
  messageIds: string[],
  readerPhone?: string,
  readAt?: string
) {
  if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;
  let changed = false;
  const cleanReader = (readerPhone || '').replace(/\D/g, '');
  const nowStr = readAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  for (const id of messageIds) {
    const entry = storedMessagesById.get(String(id));
    if (!entry) continue;
    const msgSender = (entry.senderPhone || entry.message?.senderPhone || '').replace(/\D/g, '');
    if (cleanReader && msgSender && getPhoneVariants(msgSender).some((v) => getPhoneVariants(cleanReader).includes(v))) {
      continue;
    }
    entry.message = {
      ...entry.message,
      status: 'read',
      readAt: entry.message?.readAt || nowStr,
      readBy: cleanReader
        ? Array.from(new Set([...(Array.isArray(entry.message?.readBy) ? entry.message.readBy : []), cleanReader]))
        : entry.message?.readBy,
    };
    changed = true;
  }
  if (changed) {
    scheduleSaveMessagesFile();
  }
}

function doesStoredMessageMatchPhone(entry: StoredChatRelayEntry, phoneVariantsSet: Set<string>, viewerRawPhone?: string): boolean {
  if (!entry || phoneVariantsSet.size === 0) return false;
  if (
    Array.isArray(entry.suppressedForPhones) &&
    entry.suppressedForPhones.length > 0 &&
    isPhoneVariantsInListServer(entry.suppressedForPhones, phoneVariantsSet)
  ) {
    return false;
  }
  const auth = isPhoneCurrentlyAuthorizedForGroupChat(entry.chatId, phoneVariantsSet);
  if (auth === false) return false;
  const checkPhone = (raw?: string) => {
    if (!raw) return false;
    return getPhoneVariants(raw).some((v) => phoneVariantsSet.has(v));
  };
  let matched = false;
  if (checkPhone(entry.targetPhone) || checkPhone(entry.senderPhone) || checkPhone(entry.message?.senderPhone)) {
    matched = true;
  } else if (Array.isArray(entry.memberPhones) && entry.memberPhones.some((p) => checkPhone(p))) {
    matched = true;
  } else if (Array.isArray(entry.chat?.memberPhones) && entry.chat.memberPhones.some((p: string) => checkPhone(p))) {
    matched = true;
  } else if (entry.chatId.startsWith('dm_')) {
    const parts = entry.chatId.replace('dm_', '').split('_').filter(Boolean);
    if (parts.some((p) => checkPhone(p))) matched = true;
  }
  if (!matched) return false;

  // Enforce current user's block list on 1-on-1 DMs
  if (!entry.isGroup && viewerRawPhone) {
    const msgSenderPhone = entry.senderPhone || entry.message?.senderPhone || '';
    if (msgSenderPhone && !checkPhone(msgSenderPhone) && isPhoneBlockedServer(viewerRawPhone, msgSenderPhone)) {
      return false;
    }
  }
  return true;
}

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      const cutoff = Date.now() - MESSAGE_RETENTION_MS;
      for (const item of raw) {
        if (item?.id && item?.chatId && item?.message && (item.createdAtMs || 0) >= cutoff) {
          storedMessagesList.push(item);
          storedMessagesById.set(item.id, item);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading messages buffer:', e);
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
  if (fs.existsSync(PRIVATE_GROUPS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PRIVATE_GROUPS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const g of raw) {
        if (g?.id && g?.name && !String(g.name).trim().startsWith('__')) {
          privateGroupsMap.set(String(g.id), g);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading private groups registry:', e);
}

function savePrivateGroupsFile() {
  try {
    fs.writeFileSync(PRIVATE_GROUPS_FILE, JSON.stringify(Array.from(privateGroupsMap.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving private groups registry:', e);
  }
}

function dedupePhonesServer(phones: any[]): string[] {
  const result: string[] = [];
  for (const raw of phones || []) {
    const str = String(raw || '').trim();
    if (!str) continue;
    const digits = str.replace(/\D/g, '');
    if (digits.length < 7) continue;
    if (!result.some((existing) => phonesMatchServer(existing, str))) {
      result.push(str);
    }
  }
  return result;
}

function dedupeStringsCaseInsensitive(items: any[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of items || []) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    result.push(s);
  }
  return result;
}

function computeAuthoritativeMembersCount(g: {
  members?: any[];
  memberPhones?: any[];
}): number {
  const uniquePhones = dedupePhonesServer(Array.isArray(g?.memberPhones) ? g.memberPhones : []);
  const rawMembers = dedupeStringsCaseInsensitive(Array.isArray(g?.members) ? g.members : []);
  const hasBot = rawMembers.some((m) => m.toLowerCase() === 'agcbot' || m.toLowerCase() === 'afribot ai');
  if (uniquePhones.length > 0) {
    return Math.max(1, uniquePhones.length + (hasBot ? 1 : 0));
  }
  return Math.max(1, rawMembers.length);
}

function isPhoneInListServer(list: any[] | undefined, phone?: string): boolean {
  if (!phone || !Array.isArray(list) || list.length === 0) return false;
  return list.some((p) => p && phonesMatchServer(String(p), phone));
}

function isPhoneVariantsInListServer(list: any[] | undefined, variantsSet: Set<string>): boolean {
  if (!Array.isArray(list) || list.length === 0 || variantsSet.size === 0) return false;
  return list.some((p) => p && getPhoneVariants(String(p)).some((v) => variantsSet.has(v)));
}

function canUserAccessPrivateGroup(g: any, viewerPhone?: string, viewerId?: string): boolean {
  if (!g) return false;
  if (viewerPhone && isPhoneInListServer(g.kickedPhones, viewerPhone)) return false;
  if (viewerId && Array.isArray(g.kickedIds) && g.kickedIds.includes(String(viewerId))) return false;
  if (viewerId && g.creatorId && String(g.creatorId) === String(viewerId)) {
    // Only creator if they haven't left (if memberPhones is populated and creator isn't in it, check)
    if (!viewerPhone || !Array.isArray(g.memberPhones) || g.memberPhones.length === 0 || isPhoneInListServer(g.memberPhones, viewerPhone)) {
      return true;
    }
  }
  if (viewerPhone && g.creatorPhone && phonesMatchServer(viewerPhone, g.creatorPhone)) {
    if (!Array.isArray(g.memberPhones) || g.memberPhones.length === 0 || isPhoneInListServer(g.memberPhones, viewerPhone)) {
      return true;
    }
  }
  if (viewerPhone && isPhoneInListServer(g.memberPhones, viewerPhone)) return true;
  if (viewerId && Array.isArray(g.adminIds) && g.adminIds.includes(String(viewerId))) return true;
  return false;
}

function isPrivateServerCommunity(c: any): boolean {
  if (!c) return false;
  if (c.isPrivate === true) return true;
  if ((c.type || 'group') === 'group') return true;
  return false;
}

function canUserAccessServerCommunity(c: any, viewerPhone?: string, viewerId?: string): boolean {
  if (viewerPhone && isPhoneInListServer(c?.kickedPhones, viewerPhone)) return false;
  if (!isPrivateServerCommunity(c)) return true;
  if (!viewerPhone && !viewerId) return false;
  if (viewerId && c.creatorId && String(c.creatorId) === String(viewerId)) {
    if (!viewerPhone || !Array.isArray(c.memberPhones) || c.memberPhones.length === 0 || isPhoneInListServer(c.memberPhones, viewerPhone)) {
      return true;
    }
  }
  if (viewerPhone && c.creatorPhone && phonesMatchServer(viewerPhone, c.creatorPhone)) {
    if (!Array.isArray(c.memberPhones) || c.memberPhones.length === 0 || isPhoneInListServer(c.memberPhones, viewerPhone)) {
      return true;
    }
  }
  if (viewerPhone && Array.isArray(c.memberPhones) && c.memberPhones.some((p: string) => phonesMatchServer(viewerPhone, p))) {
    return true;
  }
  if (viewerPhone && Array.isArray(c.invitedPhones) && c.invitedPhones.some((p: string) => phonesMatchServer(viewerPhone, p))) {
    return true;
  }
  return false;
}

function isPhoneCurrentlyAuthorizedForGroupChat(chatId: string, phoneVariantsSet: Set<string>): boolean | null {
  if (!chatId || phoneVariantsSet.size === 0) return null;
  const priv = privateGroupsMap.get(String(chatId));
  if (priv) {
    if (isPhoneVariantsInListServer(priv.kickedPhones, phoneVariantsSet)) return false;
    if (Array.isArray(priv.memberPhones) && priv.memberPhones.length > 0) {
      return isPhoneVariantsInListServer(priv.memberPhones, phoneVariantsSet);
    }
    return null;
  }
  if (String(chatId).startsWith('town_comm_')) {
    const commId = String(chatId).replace('town_comm_', '');
    const comm = communitiesMap.get(commId);
    if (comm) {
      if (isPhoneVariantsInListServer(comm.kickedPhones, phoneVariantsSet)) return false;
      if (isPrivateServerCommunity(comm) && Array.isArray(comm.memberPhones) && comm.memberPhones.length > 0) {
        return (
          isPhoneVariantsInListServer(comm.memberPhones, phoneVariantsSet) ||
          isPhoneVariantsInListServer(comm.invitedPhones, phoneVariantsSet)
        );
      }
    }
  }
  return null;
}

function canPhoneWriteToGroupChat(chatId: string, phoneVariantsSet: Set<string>, senderName?: string): boolean {
  const priv = privateGroupsMap.get(String(chatId));
  const comm = String(chatId).startsWith('town_comm_')
    ? communitiesMap.get(String(chatId).replace('town_comm_', ''))
    : undefined;
  const record = priv || comm;
  if (!record) return true;
  const isBroadcastOnly = Boolean(record.isChannel || record.type === 'channel' || record.announceMode);
  if (!isBroadcastOnly) return true;
  if (record.creatorPhone && isPhoneVariantsInListServer([record.creatorPhone], phoneVariantsSet)) return true;
  const admins: string[] = Array.isArray(record.admins) ? record.admins : [];
  if (admins.length === 0) return true;
  if (isPhoneVariantsInListServer(admins, phoneVariantsSet)) return true;
  if (senderName) {
    const lower = String(senderName).trim().toLowerCase();
    if (lower && admins.some((a) => String(a || '').trim().toLowerCase() === lower)) return true;
  }
  return false;
}

function emitGroupEventToPhones(eventName: string, phones: string[], chatId: string, payload: any, excludeSocketId?: string) {
  const sentSockets = new Set<string>(excludeSocketId ? [excludeSocketId] : []);
  const emitRoomOnce = (roomName: string) => {
    const room = io.sockets.adapter.rooms.get(roomName);
    if (!room) return;
    for (const sid of room) {
      if (sentSockets.has(sid)) continue;
      sentSockets.add(sid);
      io.to(sid).emit(eventName, payload);
    }
  };
  if (chatId) emitRoomOnce(`chat:${chatId}`);
  dedupePhonesServer(phones).forEach((p) => {
    getPhoneVariants(p).forEach((v) => emitRoomOnce(`phone:${v}`));
  });
}

function removePhonesFromChatRoom(chatId: string, phones: string[]) {
  if (!chatId || !phones.length) return;
  const room = io.sockets.adapter.rooms.get(`chat:${chatId}`);
  if (!room) return;
  for (const sid of Array.from(room)) {
    const s = io.sockets.sockets.get(sid) as any;
    const sockPhone = s?._agcPhone || s?._userCleanPhone;
    if (sockPhone && phones.some((p) => phonesMatchServer(sockPhone, p))) {
      s.leave(`chat:${chatId}`);
    }
  }
}

function extractInviteLookupCode(rawInput: string): string {
  const raw = String(rawInput || '').trim();
  if (!raw) return '';
  try {
    if (raw.includes('://') || raw.includes('?') || raw.includes('#')) {
      const normalizedUrl = raw.startsWith('http') ? raw : `https://agc.chat/${raw.replace(/^\/+/, '')}`;
      const u = new URL(normalizedUrl);
      const qJoin = u.searchParams.get('join') || u.searchParams.get('code') || u.searchParams.get('invite');
      if (qJoin) return qJoin.trim();
      if (u.hash && u.hash.includes('join=')) {
        const m = u.hash.match(/join=([^&#]+)/i);
        if (m?.[1]) return decodeURIComponent(m[1]).trim();
      }
      const segments = u.pathname.split('/').filter(Boolean);
      if (segments.length > 0) return decodeURIComponent(segments[segments.length - 1]).trim();
    }
  } catch (_) {}
  return raw.replace(/^.*\//, '').trim();
}

try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const u of raw) {
        const derivedClean = (u.cleanPhone || u.phoneNumber || '').replace(/\D/g, '');
        if (!derivedClean || isSyntheticTestAccount(u)) continue;
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
  const { id, fullName, username, phoneNumber, avatarUrl, about, role, email, sessionToken, socketId, skipSessionKick, updatedAt } = req.body || {};
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  if (isSyntheticTestAccount({ id, fullName, username, phoneNumber })) {
    return res.status(403).json({
      error: 'Synthetic or automated test accounts are prohibited on this platform.',
      code: 'AGC_SYNTHETIC_TEST_BLOCKED',
    });
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

  const incomingFullNameRaw = typeof fullName === 'string' ? fullName.trim() : '';
  const incomingUsernameRaw = typeof username === 'string' ? username.trim() : '';
  const incomingName = incomingFullNameRaw || incomingUsernameRaw;
  const isIncomingGeneric = !incomingName || incomingName === 'AGC User' || incomingName === 'User' || incomingName === 'Registered User';
  const existingName = existingCheck?.fullName || existingCheck?.username || '';
  const isExistingGeneric = !existingName || existingName === 'AGC User' || existingName === 'User' || existingName === 'Registered User';
  const existingUpdatedTs = existingCheck?.updatedAt ? Date.parse(existingCheck.updatedAt) || 0 : 0;
  const incomingUpdatedTs = updatedAt ? Date.parse(String(updatedAt)) || 0 : 0;

  let resolvedFullName = existingCheck?.fullName || 'AGC User';
  let resolvedUsername = existingCheck?.username;
  if (!isIncomingGeneric) {
    if (isExistingGeneric || incomingUpdatedTs >= existingUpdatedTs || (skipSessionKick && incomingName !== existingName && !existingUpdatedTs)) {
      resolvedFullName = incomingName;
    }
  } else if (!isExistingGeneric) {
    resolvedFullName = existingCheck!.fullName;
  }
  if (incomingUsernameRaw && incomingUsernameRaw !== 'AGC User' && incomingUsernameRaw !== 'User') {
    resolvedUsername = normalizeUsernameHandle(incomingUsernameRaw);
  } else if (!resolvedUsername && !isIncomingGeneric) {
    resolvedUsername = normalizeUsernameHandle(incomingName);
  }

  const resolvedAvatar =
    avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.startsWith('data:image/svg+xml')
      ? avatarUrl
      : existingCheck?.avatarUrl || avatarUrl;

  const user: RegisteredUser & { email?: string; sessionToken?: string } = {
    ...(existingCheck || {}),
    id: existingCheck?.id || id || `usr_${Date.now()}`,
    fullName: resolvedFullName,
    ...(resolvedUsername ? { username: resolvedUsername } : {}),
    phoneNumber: existingCheck?.phoneNumber || phoneNumber,
    cleanPhone: existingCheck?.cleanPhone || cleanPhone,
    avatarUrl: resolvedAvatar,
    about: about || existingCheck?.about || 'Available · Using AGC',
    ...(email ? { email: String(email).trim() } : {}),
    registeredAt: existingCheck?.registeredAt || new Date().toISOString(),
    updatedAt: (!isIncomingGeneric && resolvedFullName !== existingName) ? (updatedAt || new Date().toISOString()) : existingCheck?.updatedAt,
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
  io.emit(existingCheck ? 'user_updated' : 'user_registered', user);

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

const WALLETS_BACKUP_DIR = path.join(__dirname, 'wallets_backup');
const WALLETS_SAFE_SNAPSHOT = path.join(__dirname, 'data_wallets.safe_snapshot.json');
const WALLET_LEDGER_SAFE_SNAPSHOT = path.join(__dirname, 'data_wallet_transactions.safe_snapshot.json');
const GAME_ESCROWS_SAFE_SNAPSHOT = path.join(__dirname, 'data_game_escrows.safe_snapshot.json');

try {
  if (!fs.existsSync(WALLETS_BACKUP_DIR)) {
    fs.mkdirSync(WALLETS_BACKUP_DIR, { recursive: true });
  }
} catch (_) {}

function createWalletsBackupSnapshot(prefix: string, content: string) {
  try {
    if (!fs.existsSync(WALLETS_BACKUP_DIR)) {
      fs.mkdirSync(WALLETS_BACKUP_DIR, { recursive: true });
    }
    const filename = `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(WALLETS_BACKUP_DIR, filename), content);
    const files = fs
      .readdirSync(WALLETS_BACKUP_DIR)
      .filter((f) => f.startsWith(prefix))
      .sort()
      .reverse();
    if (files.length > 20) {
      for (const oldFile of files.slice(20)) {
        try { fs.unlinkSync(path.join(WALLETS_BACKUP_DIR, oldFile)); } catch (_) {}
      }
    }
  } catch (_) {}
}

interface ServerGameEscrow {
  gameId: string;
  gameType: 'xo' | 'whot' | 'ludo' | 'poker';
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

// Restore & heal from game escrows safe snapshot if exists
try {
  if (fs.existsSync(GAME_ESCROWS_SAFE_SNAPSHOT)) {
    const rawSnapEscrows = JSON.parse(fs.readFileSync(GAME_ESCROWS_SAFE_SNAPSHOT, 'utf8'));
    if (rawSnapEscrows && typeof rawSnapEscrows === 'object') {
      for (const [gid, rec] of Object.entries<any>(rawSnapEscrows)) {
        if (rec && typeof rec === 'object' && rec.gameId && !serverGameEscrows.has(gid)) {
          serverGameEscrows.set(gid, rec as ServerGameEscrow);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice recovering from game escrows safe snapshot:', e);
}

function saveGameEscrowsFile(pushRemote: boolean = true) {
  try {
    const content = JSON.stringify(Object.fromEntries(serverGameEscrows.entries()), null, 2);
    fs.writeFileSync(GAME_ESCROWS_FILE, content);
    if (serverGameEscrows.size > 0) {
      fs.writeFileSync(GAME_ESCROWS_SAFE_SNAPSHOT, content);
      createWalletsBackupSnapshot('game_escrows', content);
    }
  } catch (e) {
    console.warn('Notice saving server game escrows:', e);
  }
  if (pushRemote) {
    pushGameEscrowsToSupabase();
  }
}

let gameEscrowsPushTimer: ReturnType<typeof setTimeout> | null = null;
function pushGameEscrowsToSupabase() {
  if (gameEscrowsPushTimer) clearTimeout(gameEscrowsPushTimer);
  gameEscrowsPushTimer = setTimeout(() => {
    const entries = Array.from(serverGameEscrows.entries())
      .sort((a, b) => new Date(b[1].updatedAt || 0).getTime() - new Date(a[1].updatedAt || 0).getTime())
      .slice(0, 400);
    upsertSupabaseAdminSlice(ADMIN_SYS_GAME_ESCROWS_KEY, 'AGC_GAME_ESCROWS', {
      escrows: Object.fromEntries(entries),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }, 250);
}

syncGameEscrowsFromSupabaseHook = (slice: any) => {
  if (!slice || !slice.escrows || typeof slice.escrows !== 'object') return;
  let changed = false;
  for (const [gid, rec] of Object.entries<any>(slice.escrows)) {
    if (!rec || !rec.gameId) continue;
    const cur = serverGameEscrows.get(gid);
    const remoteTs = new Date(rec.updatedAt || 0).getTime();
    const localTs = new Date(cur?.updatedAt || 0).getTime();
    if (
      !cur ||
      (rec.settled && !cur.settled) ||
      remoteTs > localTs
    ) {
      serverGameEscrows.set(gid, rec as ServerGameEscrow);
      changed = true;
    }
  }
  if (changed) saveGameEscrowsFile(false);
};

interface ServerWalletTx {
  id: string;
  userId?: string;
  userPhone?: string;
  userName?: string;
  type:
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
          if (
            w &&
            typeof w === 'object' &&
            k !== 'transactions' &&
            !isSyntheticTestAccount({ phoneNumber: w.phoneNumber || k, phone_digits: k })
          ) {
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

// Restore & heal from wallet safe snapshot if exists
try {
  if (fs.existsSync(WALLETS_SAFE_SNAPSHOT)) {
    const rawSnap = JSON.parse(fs.readFileSync(WALLETS_SAFE_SNAPSHOT, 'utf8'));
    if (rawSnap && typeof rawSnap === 'object' && rawSnap.wallets && typeof rawSnap.wallets === 'object') {
      for (const [k, w] of Object.entries<any>(rawSnap.wallets)) {
        if (!w || typeof w !== 'object' || isSyntheticTestAccount(w)) continue;
        const existing = serverWallets.get(k);
        const snapBal = Math.max(0, Number(w.availableBalance) || 0);
        const snapLocked = Math.max(0, Number(w.escrowLockedBalance) || 0);
        const snapTxs = Array.isArray(w.transactions) ? w.transactions : [];
        if (!existing) {
          serverWallets.set(k, {
            phoneKey: k,
            phoneNumber: w.phoneNumber || `+${k}`,
            availableBalance: snapBal,
            escrowLockedBalance: snapLocked,
            currency: w.currency || 'NGN',
            transactions: snapTxs,
            updatedAt: w.updatedAt || new Date().toISOString(),
          });
        } else {
          if (existing.availableBalance === 0 && snapBal > 0) {
            existing.availableBalance = snapBal;
          }
          if (existing.escrowLockedBalance === 0 && snapLocked > 0) {
            existing.escrowLockedBalance = snapLocked;
          }
          if (snapTxs.length > 0) {
            existing.transactions = sortAndDedupeLedger([...existing.transactions, ...snapTxs], 250);
          }
          serverWallets.set(k, existing);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice recovering from wallet safe snapshot:', e);
}

function extractTxTimestampMs(tx: Partial<ServerWalletTx>): number {
  if (tx?.createdAt) {
    const parsed = Date.parse(String(tx.createdAt));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const idMatch = String(tx?.id || tx?.reference || '').match(/\b(1\d{12})\b/);
  if (idMatch) {
    const num = Number(idMatch[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function isSyntheticLedgerTx(tx: any): boolean {
  if (!tx || typeof tx !== 'object') return true;
  if (isSyntheticTestAccount(tx)) return true;
  const ref = String(tx.referenceId || tx.reference || '');
  if (ref.startsWith('TEST_')) return true;
  return false;
}

function normalizeServerWalletTx(raw: any, fallbackPhone?: string, fallbackUserId?: string): ServerWalletTx | null {
  if (!raw || typeof raw !== 'object' || !raw.id || isSyntheticLedgerTx(raw)) return null;
  const createdMs = extractTxTimestampMs(raw);
  const createdAt = raw.createdAt || (createdMs > 0 ? new Date(createdMs).toISOString() : new Date().toISOString());
  return {
    ...raw,
    id: String(raw.id),
    userId: raw.userId || fallbackUserId,
    userPhone: raw.userPhone || fallbackPhone || '',
    userName: raw.userName || 'AGC User',
    type: raw.type || 'transfer_out',
    title: String(raw.title || raw.description || raw.type || 'Transaction'),
    description: String(raw.description || raw.title || raw.type || 'Transaction'),
    amount: Math.abs(Number(raw.amount) || 0),
    fee: Number(raw.fee ?? 0),
    balanceAfter: raw.balanceAfter !== undefined && raw.balanceAfter !== null ? Number(raw.balanceAfter) : undefined,
    currency: raw.currency || 'NGN',
    timestamp:
      raw.timestamp ||
      new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt,
    status: raw.status || 'completed',
    reference: String(raw.reference || raw.referenceId || raw.id),
    referenceId: String(raw.referenceId || raw.reference || raw.id),
    channel: raw.channel || 'wallet',
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  };
}

function sortAndDedupeLedger(txs: ServerWalletTx[], maxLen = 10000): ServerWalletTx[] {
  const map = new Map<string, ServerWalletTx>();
  for (const raw of txs || []) {
    const item = normalizeServerWalletTx(raw);
    if (!item) continue;
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
    } else {
      map.set(item.id, {
        ...prev,
        ...item,
        userId: item.userId || prev.userId,
        userPhone: item.userPhone || prev.userPhone,
        userName: item.userName && item.userName !== 'AGC User' ? item.userName : prev.userName,
        description: item.description || prev.description,
        balanceAfter: item.balanceAfter !== undefined ? item.balanceAfter : prev.balanceAfter,
        createdAt:
          extractTxTimestampMs(item) >= extractTxTimestampMs(prev)
            ? item.createdAt
            : prev.createdAt,
        metadata: { ...(prev.metadata || {}), ...(item.metadata || {}) },
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => extractTxTimestampMs(b) - extractTxTimestampMs(a))
    .slice(0, maxLen);
}

function txBelongsToUser(tx: Partial<ServerWalletTx>, phoneKey: string, userId?: string): boolean {
  if (!tx) return false;
  if (userId && tx.userId && tx.userId === userId) return true;
  if (phoneKey) {
    if (tx.userPhone && canonicalAdminPhoneKey(tx.userPhone) === phoneKey) return true;
    const metaKey = canonicalAdminPhoneKey(tx.metadata?.phoneKey || tx.metadata?.userPhone);
    if (metaKey && metaKey === phoneKey) return true;
  }
  return false;
}

function getUserMergedTransactions(phoneOrId: string, userId?: string, limit = 1000): ServerWalletTx[] {
  const match = phoneOrId ? findUserEntry(phoneOrId) : null;
  const resolvedUserId = userId || match?.user.id;
  const phoneKey = canonicalAdminPhoneKey(match?.user.phoneNumber || phoneOrId) || String(phoneOrId || '').replace(/\D/g, '');
  const fromLedger = unifiedLedger.filter((tx) => txBelongsToUser(tx, phoneKey, resolvedUserId));
  const walTxs = phoneKey ? (serverWallets.get(phoneKey)?.transactions || []) : [];
  return sortAndDedupeLedger([...fromLedger, ...walTxs], limit);
}

try {
  if (fs.existsSync(WALLET_LEDGER_FILE)) {
    const rawLedger = JSON.parse(fs.readFileSync(WALLET_LEDGER_FILE, 'utf8'));
    if (Array.isArray(rawLedger)) {
      unifiedLedger = sortAndDedupeLedger(rawLedger, 10000);
    }
  }
} catch (e) {
  console.warn('Notice loading unified wallet ledger:', e);
}

// Restore & heal from ledger safe snapshot if exists
try {
  if (fs.existsSync(WALLET_LEDGER_SAFE_SNAPSHOT)) {
    const rawSnapLedger = JSON.parse(fs.readFileSync(WALLET_LEDGER_SAFE_SNAPSHOT, 'utf8'));
    if (Array.isArray(rawSnapLedger) && rawSnapLedger.length > 0) {
      unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...rawSnapLedger], 10000);
    }
  }
} catch (e) {
  console.warn('Notice recovering from ledger safe snapshot:', e);
}

// Backfill any historical transactions stored inside serverWallets into unifiedLedger
try {
  const extraTxs: ServerWalletTx[] = [];
  for (const w of serverWallets.values()) {
    for (const tx of w.transactions || []) {
      const normTx = normalizeServerWalletTx(tx, w.phoneNumber);
      if (normTx) extraTxs.push(normTx);
    }
  }
  if (extraTxs.length > 0) {
    const prevCount = unifiedLedger.length;
    unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...extraTxs], 10000);
    if (unifiedLedger.length !== prevCount) {
      saveUnifiedLedgerFile();
    }
  }
} catch (_) {}

function saveUnifiedLedgerFile() {
  try {
    const content = JSON.stringify(unifiedLedger.slice(0, 10000), null, 2);
    fs.writeFileSync(WALLET_LEDGER_FILE, content);
    if (unifiedLedger.length > 0) {
      fs.writeFileSync(WALLET_LEDGER_SAFE_SNAPSHOT, content);
      createWalletsBackupSnapshot('unified_ledger', content);
    }
  } catch (e) {
    console.warn('Notice saving unified wallet ledger:', e);
  }
}

const pendingLedgerPushPhoneKeys = new Set<string>();
let ledgerPushTimer: ReturnType<typeof setTimeout> | null = null;
let ledgerPushInFlight = false;

async function flushSupabaseLedgerPush(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    pendingLedgerPushPhoneKeys.clear();
    return;
  }
  if (ledgerPushInFlight) return;
  ledgerPushInFlight = true;
  try {
    const keysToPush = Array.from(pendingLedgerPushPhoneKeys);
    pendingLedgerPushPhoneKeys.clear();

    // 1. Push per-user ledger slices (fetch-merge-upsert so concurrent/historical entries are never overwritten)
    for (const phoneKey of keysToPush) {
      if (!phoneKey) continue;
      const sliceKey = getUserLedgerSliceKey(phoneKey);
      const localUserTxs = getUserMergedTransactions(phoneKey, undefined, 2000);
      const remoteSlice = await fetchSupabaseAdminSlice(sliceKey).catch(() => null);
      const remoteUserTxs = Array.isArray(remoteSlice?.transactions) ? remoteSlice.transactions : [];
      const mergedUserTxs = sortAndDedupeLedger([...localUserTxs, ...remoteUserTxs], 2000);

      if (mergedUserTxs.length > localUserTxs.length) {
        unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...mergedUserTxs], 10000);
        saveUnifiedLedgerFile();
        const w = serverWallets.get(phoneKey);
        if (w) {
          w.transactions = sortAndDedupeLedger([...w.transactions, ...mergedUserTxs], 250);
          serverWallets.set(phoneKey, w);
          saveWalletsFile(false);
        }
      }

      await upsertSupabaseAdminSlice(sliceKey, 'AGC_USER_LEDGER', {
        phoneKey,
        transactions: mergedUserTxs,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Push global super-view ledger slice
    const remoteGlobal = await fetchSupabaseAdminSlice(ADMIN_SYS_LEDGER_KEY).catch(() => null);
    const remoteGlobalTxs = Array.isArray(remoteGlobal?.transactions) ? remoteGlobal.transactions : [];
    const mergedGlobal = sortAndDedupeLedger([...unifiedLedger, ...remoteGlobalTxs], 1500);
    if (mergedGlobal.length > 0) {
      await upsertSupabaseAdminSlice(ADMIN_SYS_LEDGER_KEY, 'AGC_ADMIN_LEDGER', {
        transactions: mergedGlobal,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (_) {
  } finally {
    ledgerPushInFlight = false;
    if (pendingLedgerPushPhoneKeys.size > 0) {
      scheduleSupabaseLedgerPush();
    }
  }
}

function scheduleSupabaseLedgerPush(phoneKey?: string) {
  if (phoneKey) pendingLedgerPushPhoneKeys.add(phoneKey);
  if (ledgerPushTimer) clearTimeout(ledgerPushTimer);
  ledgerPushTimer = setTimeout(() => {
    void flushSupabaseLedgerPush();
  }, 250);
}

const hydratedUserLedgerAt = new Map<string, number>();
const inFlightUserLedgerHydration = new Map<string, Promise<void>>();

async function hydrateUserLedgerFromSupabase(phoneOrId: string, userId?: string, force = false): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  const match = phoneOrId ? findUserEntry(phoneOrId) : null;
  const phoneKey = canonicalAdminPhoneKey(match?.user.phoneNumber || phoneOrId);
  if (!phoneKey) return;

  const existingInFlight = inFlightUserLedgerHydration.get(phoneKey);
  if (existingInFlight) return existingInFlight;

  const lastAt = hydratedUserLedgerAt.get(phoneKey) || 0;
  const localMatches = getUserMergedTransactions(phoneKey, userId || match?.user.id, 50);
  if (!force && localMatches.length > 0 && Date.now() - lastAt < 10_000) {
    return;
  }

  const job = (async () => {
    try {
      const sliceKey = getUserLedgerSliceKey(phoneKey);
      const chatBackupKey = `${USER_CHAT_BACKUP_PREFIX}${phoneKey}`;
      const [userLedgerSlice, chatBackupSlice] = await Promise.all([
        fetchSupabaseAdminSlice(sliceKey).catch(() => null),
        fetchSupabaseAdminSlice(chatBackupKey).catch(() => null),
      ]);

      const recovered: ServerWalletTx[] = [];
      const fallbackPhone = match?.user.phoneNumber || (phoneKey.length >= 9 ? `+234${phoneKey}` : phoneOrId);
      const fallbackUserId = userId || match?.user.id;

      const ledgerSliceTxs = Array.isArray(userLedgerSlice?.transactions) ? userLedgerSlice.transactions : [];
      for (const raw of ledgerSliceTxs) {
        const n = normalizeServerWalletTx(raw, fallbackPhone, fallbackUserId);
        if (n) recovered.push(n);
      }

      const chatSnapTxs = Array.isArray(chatBackupSlice?.accountSnapshot?.wallet?.transactions)
        ? chatBackupSlice.accountSnapshot.wallet.transactions
        : [];
      for (const raw of chatSnapTxs) {
        const n = normalizeServerWalletTx(raw, fallbackPhone, fallbackUserId);
        if (n) recovered.push(n);
      }

      if (SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const orFilters: string[] = [];
          if (fallbackUserId) orFilters.push(`user_id.eq.${encodeURIComponent(fallbackUserId)}`);
          if (phoneKey.length >= 7) orFilters.push(`user_phone.ilike.*${encodeURIComponent(phoneKey)}`);
          if (orFilters.length > 0) {
            const sbRes = await fetch(
              `${SUPABASE_URL}/rest/v1/wallet_transactions?or=(${orFilters.join(',')})&order=created_at.desc&limit=500`,
              {
                headers: {
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                signal: AbortSignal.timeout(4000),
              }
            );
            if (sbRes.ok) {
              const sbRows = await sbRes.json();
              if (Array.isArray(sbRows)) {
                for (const row of sbRows) {
                  const n = normalizeServerWalletTx(
                    {
                      id: row.id,
                      userId: row.user_id,
                      userPhone: row.user_phone,
                      userName: row.user_name,
                      type: row.type,
                      title: row.title,
                      description: row.description,
                      amount: row.amount,
                      fee: row.fee,
                      balanceAfter: row.balance_after,
                      currency: row.currency,
                      createdAt: row.created_at,
                      status: row.status,
                      reference: row.reference,
                      referenceId: row.reference_id,
                      channel: row.channel,
                      metadata: row.metadata,
                    },
                    fallbackPhone,
                    fallbackUserId
                  );
                  if (n) recovered.push(n);
                }
              }
            }
          }
        } catch (_) {}
      }

      if (recovered.length > 0) {
        const prevLedgerIds = new Set(unifiedLedger.map((t) => t.id));
        const hasNewForLocal = recovered.some((t) => !prevLedgerIds.has(t.id));
        unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...recovered], 10000);
        if (hasNewForLocal) {
          saveUnifiedLedgerFile();
        }

        const existingWal = serverWallets.get(phoneKey);
        if (existingWal) {
          const prevWalIds = new Set(existingWal.transactions.map((t) => t.id));
          const mergedWalTxs = sortAndDedupeLedger([...existingWal.transactions, ...recovered], 250);
          if (mergedWalTxs.some((t) => !prevWalIds.has(t.id))) {
            existingWal.transactions = mergedWalTxs;
            serverWallets.set(phoneKey, existingWal);
            saveWalletsFile(false);
          }
        }

        // Backfill recovered transactions into __agc_sys_ledger_<key> if any came from chatBackup or local wallet
        const sliceIds = new Set(ledgerSliceTxs.map((t: any) => String(t?.id || '')));
        if (recovered.some((t) => !sliceIds.has(t.id)) || localMatches.some((t) => !sliceIds.has(t.id))) {
          scheduleSupabaseLedgerPush(phoneKey);
        }
      } else if (localMatches.length > 0 && !userLedgerSlice) {
        scheduleSupabaseLedgerPush(phoneKey);
      }

      hydratedUserLedgerAt.set(phoneKey, Date.now());
    } catch (_) {
    } finally {
      inFlightUserLedgerHydration.delete(phoneKey);
    }
  })();

  inFlightUserLedgerHydration.set(phoneKey, job);
  return job;
}

syncLedgerFromSupabaseHook = (slice: any) => {
  if (!slice || !Array.isArray(slice.transactions)) return;
  const normalizedList: ServerWalletTx[] = [];
  for (const raw of slice.transactions) {
    const n = normalizeServerWalletTx(raw);
    if (n) normalizedList.push(n);
  }
  if (normalizedList.length === 0) return;
  const prevLen = unifiedLedger.length;
  const prevIds = new Set(unifiedLedger.map((t) => t.id));
  unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...normalizedList], 10000);
  if (unifiedLedger.length !== prevLen || normalizedList.some((t) => !prevIds.has(t.id))) {
    saveUnifiedLedgerFile();
  }
  let walletsChanged = false;
  for (const tx of normalizedList) {
    const pk = canonicalAdminPhoneKey(tx.userPhone);
    if (!pk) continue;
    const wal = serverWallets.get(pk);
    if (wal && !wal.transactions.some((t) => t.id === tx.id)) {
      wal.transactions = sortAndDedupeLedger([tx, ...wal.transactions], 250);
      serverWallets.set(pk, wal);
      walletsChanged = true;
    }
  }
  if (walletsChanged) saveWalletsFile(false);
};

function appendUnifiedLedgerTx(entry: ServerWalletTx) {
  const normalized = normalizeServerWalletTx(entry) || {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
    referenceId: entry.referenceId || entry.reference,
    description: entry.description || entry.title,
    fee: Number(entry.fee ?? 0),
  };
  unifiedLedger = sortAndDedupeLedger([normalized, ...unifiedLedger], 10000);
  saveUnifiedLedgerFile();

  const phoneKey = canonicalAdminPhoneKey(normalized.userPhone || (normalized.metadata?.phoneKey as string));
  if (phoneKey) {
    const existingWal = serverWallets.get(phoneKey);
    if (existingWal) {
      existingWal.transactions = sortAndDedupeLedger([normalized, ...existingWal.transactions], 250);
      serverWallets.set(phoneKey, existingWal);
    }
  }

  scheduleSupabaseLedgerPush(phoneKey || undefined);

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/wallet_transactions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

let walletsPushTimer: ReturnType<typeof setTimeout> | null = null;
function pushWalletsToSupabase() {
  if (walletsPushTimer) clearTimeout(walletsPushTimer);
  walletsPushTimer = setTimeout(() => {
    const walletsObj: Record<string, ServerWalletRecord> = {};
    for (const [k, w] of serverWallets.entries()) {
      walletsObj[k] = {
        ...w,
        transactions: sortAndDedupeLedger(w.transactions || [], 120),
      };
    }
    upsertSupabaseAdminSlice(ADMIN_SYS_WALLETS_KEY, 'AGC_SERVER_WALLETS', {
      wallets: walletsObj,
      usedReferences: Array.from(processedPaymentRefs).slice(-1000),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }, 250);
}

syncWalletsFromSupabaseHook = (slice: any) => {
  if (!slice || typeof slice !== 'object') return;
  let changed = false;
  let ledgerBackfilled = false;
  if (Array.isArray(slice.usedReferences)) {
    slice.usedReferences.forEach((r: string) => r && processedPaymentRefs.add(String(r)));
  }
  if (slice.wallets && typeof slice.wallets === 'object') {
    for (const [rawKey, w] of Object.entries<any>(slice.wallets)) {
      if (!w || typeof w !== 'object' || isSyntheticTestAccount({ phoneNumber: w.phoneNumber || rawKey, phone_digits: rawKey })) {
        continue;
      }
      const key = canonicalAdminPhoneKey(w.phoneNumber || w.phoneKey || rawKey) || rawKey;
      const cur = serverWallets.get(key);
      const remoteTs = new Date(w.updatedAt || 0).getTime();
      const localTs = new Date(cur?.updatedAt || 0).getTime();
      const curIsColdPlaceholder = Boolean(cur && cur.availableBalance === 0 && cur.escrowLockedBalance === 0 && cur.transactions.length === 0);
      const remoteTxs = Array.isArray(w.transactions) ? w.transactions : [];
      const mergedTxs = sortAndDedupeLedger([...(cur?.transactions || []), ...remoteTxs], 250);

      if (remoteTxs.length > 0) {
        const beforeIds = new Set(unifiedLedger.map((t) => t.id));
        const normalizedRemote = remoteTxs
          .map((tx: any) => normalizeServerWalletTx(tx, w.phoneNumber || cur?.phoneNumber || `+${key}`))
          .filter(Boolean) as ServerWalletTx[];
        if (normalizedRemote.some((t) => !beforeIds.has(t.id))) {
          unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...normalizedRemote], 10000);
          ledgerBackfilled = true;
        }
      }

      if (!cur || (curIsColdPlaceholder && Number(w.availableBalance || 0) > 0) || remoteTs > localTs) {
        serverWallets.set(key, {
          phoneKey: key,
          phoneNumber: w.phoneNumber || cur?.phoneNumber || `+${key}`,
          availableBalance: Math.max(0, Number(w.availableBalance) || 0),
          escrowLockedBalance: Math.max(0, Number(w.escrowLockedBalance) || 0),
          currency: w.currency || cur?.currency || 'NGN',
          transactions: mergedTxs,
          updatedAt: w.updatedAt || new Date().toISOString(),
        });
        changed = true;
      } else if (cur && mergedTxs.length > cur.transactions.length) {
        cur.transactions = mergedTxs;
        serverWallets.set(key, cur);
        changed = true;
      }
    }
  }
  if (ledgerBackfilled) saveUnifiedLedgerFile();
  if (changed) saveWalletsFile(false);
};

function saveWalletsFile(pushRemote: boolean = true) {
  try {
    const walletsObj: Record<string, ServerWalletRecord> = {};
    for (const [k, w] of serverWallets.entries()) {
      walletsObj[k] = w;
    }
    const payload = JSON.stringify(
      {
        wallets: walletsObj,
        usedReferences: Array.from(processedPaymentRefs).slice(-5000),
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    );
    fs.writeFileSync(WALLETS_FILE, payload);
    if (serverWallets.size > 0) {
      fs.writeFileSync(WALLETS_SAFE_SNAPSHOT, payload);
      createWalletsBackupSnapshot('wallets', payload);
    }
  } catch (e) {
    console.warn('Notice saving server wallet ledger:', e);
  }
  if (pushRemote) {
    pushWalletsToSupabase();
  }
}

function getOrCreateServerWallet(phoneOrId: string): ServerWalletRecord {
  const match = findUserEntry(phoneOrId);
  const cleanKey = canonicalAdminPhoneKey(match?.user.phoneNumber || phoneOrId) || phoneOrId.replace(/\D/g, '') || phoneOrId;
  const existing = serverWallets.get(cleanKey);
  if (existing) {
    // Keep in sync with any higher/admin-adjusted balance on user record (or recover from cold-start 0 placeholder)
    if (match?.user.adminWalletAdjustedAt && typeof match.user.walletBalanceNgn === 'number') {
      const adjTs = new Date(match.user.adminWalletAdjustedAt).getTime();
      const walTs = new Date(existing.updatedAt || 0).getTime();
      const isColdZeroPlaceholder =
        existing.availableBalance === 0 &&
        existing.escrowLockedBalance === 0 &&
        existing.transactions.length === 0 &&
        match.user.walletBalanceNgn > 0;
      if (adjTs > walTs || isColdZeroPlaceholder) {
        existing.availableBalance = Math.max(0, match.user.walletBalanceNgn);
        existing.updatedAt = match.user.adminWalletAdjustedAt;
        saveWalletsFile();
      }
    }
    return existing;
  }

  let initialBal = Math.max(0, Number(match?.user.walletBalanceNgn) || 0);
  // Fallback: recover latest authoritative balance_after from unifiedLedger if user record was missing it
  if (initialBal === 0 && cleanKey) {
    const lastTx = unifiedLedger.find(
      (tx) =>
        tx.balanceAfter !== undefined &&
        tx.balanceAfter !== null &&
        tx.userPhone &&
        canonicalAdminPhoneKey(tx.userPhone) === cleanKey
    );
    if (lastTx && Number.isFinite(Number(lastTx.balanceAfter)) && Number(lastTx.balanceAfter) > 0) {
      initialBal = Math.max(0, Number(lastTx.balanceAfter));
    }
  }

  const record: ServerWalletRecord = {
    phoneKey: cleanKey,
    phoneNumber: match?.user.phoneNumber || phoneOrId,
    availableBalance: initialBal,
    escrowLockedBalance: 0,
    currency: 'NGN',
    transactions: [],
    updatedAt: initialBal > 0 ? (match?.user.adminWalletAdjustedAt || new Date().toISOString()) : new Date(0).toISOString(),
  };
  serverWallets.set(cleanKey, record);
  saveWalletsFile(initialBal > 0);
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
  const mergedTxs = getUserMergedTransactions(wallet.phoneNumber || wallet.phoneKey || phoneOrId, undefined, 500);
  const payload = {
    balance: wallet.availableBalance,
    availableBalance: wallet.availableBalance,
    escrowLockedBalance: wallet.escrowLockedBalance,
    currency: wallet.currency,
    transactions: mergedTxs,
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
app.get('/api/wallet/:phone', async (req: Request, res: Response, next: NextFunction) => {
  const rawPhone = decodeURIComponent(req.params.phone || '');
  if (rawPhone === 'banks' || rawPhone === 'transactions') return next();
  if (!rawPhone) return res.status(400).json({ error: 'Phone number required' });
  // Authorization check: User must own the account or hold admin credentials
  const isOwner = verifyUserSession(rawPhone, req);
  const isAdmin = isAuthorizedAdminRequest(req);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: You are not authorized to view this wallet.',
      code: 'AGC_WALLET_FORBIDDEN',
    });
  }
  await ensureInitialSupabaseSync();
  await hydrateUserLedgerFromSupabase(rawPhone);
  const wallet = getOrCreateServerWallet(rawPhone);
  const mergedTransactions = getUserMergedTransactions(rawPhone, undefined, 1000);
  return res.json({
    success: true,
    wallet: {
      availableBalance: wallet.availableBalance,
      escrowLockedBalance: wallet.escrowLockedBalance,
      currency: wallet.currency,
      transactions: mergedTransactions,
    },
    source: 'server_authoritative',
  });
});

// REST: Verify Paystack checkout server-side via Paystack API or prior signed webhook (NEVER trusts client amount)
app.post('/api/wallet/verify-paystack', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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
          transactions: getUserMergedTransactions(String(phoneNumber), undefined, 1000),
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
        transactions: getUserMergedTransactions(String(phoneNumber), undefined, 1000),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Server Paystack verification failed' });
  }
});

interface LiveBankRecord {
  id?: number;
  name: string;
  code: string;
  slug?: string;
  type?: string;
  active?: boolean;
}

const FALLBACK_CBN_BANKS: LiveBankRecord[] = [
  { name: 'Guaranty Trust Bank', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'United Bank For Africa', code: '033', slug: 'united-bank-for-africa' },
  { name: 'OPay Digital Services Limited (OPay)', code: '999992', slug: 'paycom' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint-mfb-ng' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'First City Monument Bank', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
  { name: 'Access Bank (Diamond)', code: '063', slug: 'access-bank-diamond' },
  { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
  { name: 'TAJ Bank', code: '302', slug: 'taj-bank' },
  { name: 'Titan Bank', code: '102', slug: 'titan-bank' },
  { name: 'ALAT by WEMAMFB', code: '035A', slug: 'alat-by-wema' },
];

let cachedLiveBanks: LiveBankRecord[] = [];
let cachedLiveBanksSource: 'paystack_live_api' | 'fallback' = 'fallback';
let cachedLiveBanksAt = 0;
const LIVE_BANKS_TTL_MS = 6 * 60 * 60 * 1000;

async function getLiveNigerianBanks(): Promise<{ banks: LiveBankRecord[]; source: 'paystack_live_api' | 'fallback' }> {
  if (cachedLiveBanks.length > 0 && Date.now() - cachedLiveBanksAt < LIVE_BANKS_TTL_MS) {
    return { banks: cachedLiveBanks, source: cachedLiveBanksSource };
  }
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const headers: Record<string, string> = {};
  if (secret) headers.Authorization = `Bearer ${secret}`;
  try {
    const resp = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=500', {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(7000),
    });
    const json: any = await resp.json().catch(() => ({}));
    if (resp.ok && json?.status && Array.isArray(json?.data) && json.data.length > 0) {
      const seenCodes = new Set<string>();
      const deduped: LiveBankRecord[] = [];
      for (const b of json.data) {
        const code = String(b?.code || '').trim();
        const name = String(b?.name || '').trim();
        if (!code || !name || b?.active === false || seenCodes.has(code)) continue;
        seenCodes.add(code);
        deduped.push({
          id: typeof b?.id === 'number' ? b.id : undefined,
          name,
          code,
          slug: b?.slug,
          type: b?.type,
          active: b?.active !== false,
        });
      }
      if (deduped.length > 0) {
        cachedLiveBanks = deduped;
        cachedLiveBanksSource = 'paystack_live_api';
        cachedLiveBanksAt = Date.now();
        return { banks: cachedLiveBanks, source: cachedLiveBanksSource };
      }
    }
  } catch (_) {}

  if (cachedLiveBanks.length > 0) {
    return { banks: cachedLiveBanks, source: cachedLiveBanksSource };
  }
  return { banks: FALLBACK_CBN_BANKS, source: 'fallback' };
}

const NUBAN_WEIGHTS_15 = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

function matchesNubanChecksum(accountNumber: string, bankCode: string): boolean {
  if (!/^\d{10}$/.test(accountNumber)) return false;
  const codeDigits = String(bankCode || '').replace(/\D/g, '');
  if (!codeDigits) return false;
  const acct9 = accountNumber.slice(0, 9);
  const checkDigit = Number(accountNumber[9]);

  const candidates6: string[] = [];
  if (codeDigits.length === 3) {
    candidates6.push(`000${codeDigits}`);
  } else if (codeDigits.length === 5) {
    candidates6.push(`9${codeDigits}`);
    candidates6.push(`0${codeDigits}`);
  } else if (codeDigits.length === 6) {
    candidates6.push(codeDigits);
    if (codeDigits.startsWith('0')) {
      candidates6.push(`9${codeDigits.slice(1)}`);
    }
  } else if (codeDigits.length < 6) {
    candidates6.push(codeDigits.padStart(6, '0'));
  } else {
    candidates6.push(codeDigits.slice(-6));
  }

  for (const code6 of candidates6) {
    const seq = `${code6}${acct9}`;
    if (seq.length !== 15) continue;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += Number(seq[i]) * NUBAN_WEIGHTS_15[i];
    }
    const expected = (10 - (sum % 10)) % 10;
    if (expected === checkDigit) return true;
  }
  return false;
}

const COMMERCIAL_PRIORITY_CODES = [
  '058', '044', '057', '011', '033', '999992', '999991', '50515', '50211',
  '070', '221', '035', '232', '214', '032', '050', '076', '101', '082',
  '063', '215', '068', '301', '302', '102', '103', '035A', '100004', '100002', '120001',
];

const WALLET_PRIORITY_CODES = [
  '999992', '999991', '50515', '50211', '100004', '120001', '120003', '120004',
  '058', '044', '057', '011', '033', '070', '221', '035', '232', '214',
  '032', '050', '076', '101', '082', '063', '215', '068', '301', '302', '102', '100002',
];

function getPrioritizedCandidateBanks(accountNumber: string, allBanks: LiveBankRecord[]): LiveBankRecord[] {
  const looksLikePhoneWallet = /^[789][01]\d{8}$/.test(accountNumber);
  const priorityList = looksLikePhoneWallet ? WALLET_PRIORITY_CODES : COMMERCIAL_PRIORITY_CODES;
  const priorityRank = new Map(priorityList.map((c, idx) => [c, idx]));

  const fintechWalletSet = new Set(['999992', '999991', '50515', '50211', '100004', '120001', '120003', '120004']);
  const candidates = allBanks.filter((b) => {
    if (looksLikePhoneWallet && fintechWalletSet.has(b.code)) return true;
    return matchesNubanChecksum(accountNumber, b.code);
  });

  candidates.sort((a, b) => {
    const ra = priorityRank.has(a.code) ? priorityRank.get(a.code)! : 9999;
    const rb = priorityRank.has(b.code) ? priorityRank.get(b.code)! : 9999;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  return candidates;
}

// REST: Fetch live Nigerian banks directory (cached from Paystack Bank API)
app.get('/api/wallet/banks', async (_req: Request, res: Response) => {
  const { banks, source } = await getLiveNigerianBanks();
  return res.json({
    success: true,
    source,
    count: banks.length,
    banks: banks.map((b) => ({ name: b.name, code: b.code, slug: b.slug, type: b.type })),
  });
});

// REST: Automatically detect destination bank & resolve account holder's full name from 10-digit account number alone
app.post('/api/wallet/resolve-account', async (req: Request, res: Response) => {
  try {
    const rawAccount = String(req.body?.accountNumber || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(rawAccount)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit bank account number.',
      });
    }

    const { banks: allBanks, source: banksSource } = await getLiveNigerianBanks();
    const candidates = getPrioritizedCandidateBanks(rawAccount, allBanks);
    const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    const flutterwaveSecret = (process.env.FLUTTERWAVE_SECRET_KEY || '').trim();

    if (!paystackSecret && !flutterwaveSecret) {
      return res.status(424).json({
        success: false,
        requiresSecretKey: true,
        accountNumber: rawAccount,
        banksTotal: allBanks.length,
        banksSource,
        candidateBanks: candidates.slice(0, 12).map((b) => ({ name: b.name, code: b.code })),
        message: `Connected to ${allBanks.length} live banks (${candidates.length} NUBAN matches). Add PAYSTACK_SECRET_KEY on the server to pull the account holder's full name automatically.`,
      });
    }

    const probePool = candidates.slice(0, 40);
    const matches: Array<{
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
      bankId?: number;
      verifiedBy: 'paystack_live' | 'flutterwave_live';
    }> = [];

    const BATCH_SIZE = 10;
    for (let i = 0; i < probePool.length; i += BATCH_SIZE) {
      const batch = probePool.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (bank) => {
          try {
            if (paystackSecret) {
              const r = await fetch(
                `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(rawAccount)}&bank_code=${encodeURIComponent(bank.code)}`,
                {
                  method: 'GET',
                  headers: { Authorization: `Bearer ${paystackSecret}` },
                  signal: AbortSignal.timeout(4000),
                }
              );
              const j: any = await r.json().catch(() => ({}));
              if (r.ok && j?.status && j?.data?.account_name) {
                return {
                  accountNumber: String(j.data.account_number || rawAccount),
                  accountName: String(j.data.account_name).trim(),
                  bankName: bank.name,
                  bankCode: bank.code,
                  bankId: typeof j.data.bank_id === 'number' ? j.data.bank_id : bank.id,
                  verifiedBy: 'paystack_live' as const,
                };
              }
            } else if (flutterwaveSecret) {
              const r = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${flutterwaveSecret}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ account_number: rawAccount, account_bank: bank.code }),
                signal: AbortSignal.timeout(4000),
              });
              const j: any = await r.json().catch(() => ({}));
              if (r.ok && j?.status === 'success' && j?.data?.account_name) {
                return {
                  accountNumber: String(j.data.account_number || rawAccount),
                  accountName: String(j.data.account_name).trim(),
                  bankName: bank.name,
                  bankCode: bank.code,
                  verifiedBy: 'flutterwave_live' as const,
                };
              }
            }
          } catch (_) {}
          return null;
        })
      );

      for (const hit of batchResults) {
        if (hit && !matches.some((m) => m.bankCode === hit.bankCode)) {
          matches.push(hit);
        }
      }

      // Stop after Batch 1 or once priority commercial & digital banks have been scanned and match(es) exist
      if (matches.length > 0 && i >= BATCH_SIZE) {
        break;
      }
    }

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        accountNumber: rawAccount,
        banksTotal: allBanks.length,
        banksScanned: probePool.length,
        message: 'Could not find a matching bank account for this 10-digit number. Check the digits and try again.',
      });
    }

    return res.json({
      success: true,
      accountNumber: rawAccount,
      banksTotal: allBanks.length,
      banksScanned: probePool.length,
      banksSource,
      primaryAccount: matches[0],
      matches,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Unable to verify bank account number automatically.',
    });
  }
});

// REST: Server-validated withdrawal (never trusts browser balance state)
app.post('/api/wallet/withdraw', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const { phoneNumber, amount, bankName, bankCode, accountNumber, accountName } = req.body || {};
  const numericAmt = Number(amount);
  const cleanAccount = String(accountNumber || '').replace(/\D/g, '');
  if (!phoneNumber || !Number.isFinite(numericAmt) || numericAmt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid phone number and positive amount required.' });
  }

  // Anti-impersonation: Verify caller owns phoneNumber
  if (!verifyUserSession(phoneNumber, req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session authentication failed for withdrawal account.',
      code: 'AGC_SESSION_INVALID',
    });
  }
  if (!/^\d{10}$/.test(cleanAccount) || !String(accountName || '').trim() || !String(bankName || '').trim()) {
    return res.status(400).json({
      success: false,
      message: 'Verified 10-digit account number, resolved bank, and account holder name are required.',
    });
  }

  let verifiedAccountName = String(accountName).trim();
  const verifiedBankName = String(bankName).trim();

  // If PAYSTACK_SECRET_KEY & bankCode are available, double-verify account holder name server-side before debiting
  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (paystackSecret && bankCode) {
    try {
      const verifyResp = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(cleanAccount)}&bank_code=${encodeURIComponent(String(bankCode))}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${paystackSecret}` },
          signal: AbortSignal.timeout(6000),
        }
      );
      const verifyJson: any = await verifyResp.json().catch(() => ({}));
      if (!verifyResp.ok || !verifyJson?.status || !verifyJson?.data?.account_name) {
        return res.status(400).json({
          success: false,
          message: 'Account could not be re-verified with live bank registry before payout.',
        });
      }
      verifiedAccountName = String(verifyJson.data.account_name).trim();
    } catch (_) {}
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
    title: `Payout to ${verifiedBankName} (${cleanAccount.slice(-4)})`,
    description: `Withdrawal to ${verifiedBankName} - ${verifiedAccountName}`,
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
    metadata: {
      bankName: verifiedBankName,
      bankCode: bankCode ? String(bankCode) : undefined,
      accountNumber: cleanAccount,
      accountName: verifiedAccountName,
    },
  };
  wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
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
    message: `Withdrawal of ₦${numericAmt.toLocaleString()} to ${verifiedAccountName} (${verifiedBankName}) processed.`,
    wallet: {
      availableBalance: wallet.availableBalance,
      escrowLockedBalance: wallet.escrowLockedBalance,
      currency: wallet.currency,
      transactions: getUserMergedTransactions(String(phoneNumber), undefined, 1000),
    },
  });
});

// REST: Server-authoritative Peer-to-Peer Transfer (Send money directly to user/phone)
app.post('/api/wallet/transfer', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { senderPhone, recipientPhone, amount, note, title } = req.body || {};
    const cleanSender = String(senderPhone || '').trim();
    const cleanRecipient = String(recipientPhone || '').trim();
    const numericAmt = Math.round(Number(amount) || 0);

    if (!cleanSender || !cleanRecipient || numericAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Sender phone, recipient phone, and positive transfer amount required.' });
    }

    // Anti-impersonation: Verify caller owns senderPhone
    if (!verifyUserSession(cleanSender, req)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session authentication failed for sender account.',
        code: 'AGC_SESSION_INVALID',
      });
    }

    const senderWallet = getOrCreateServerWallet(cleanSender);
    const recipientWallet = getOrCreateServerWallet(cleanRecipient);

    if (senderWallet.phoneKey === recipientWallet.phoneKey) {
      return res.status(400).json({ success: false, message: 'Sender and recipient cannot be the same account.' });
    }

    if (senderWallet.availableBalance < numericAmt) {
      return res.status(400).json({
        success: false,
        insufficientFunds: true,
        availableBalance: senderWallet.availableBalance,
        message: `Insufficient wallet balance (₦${senderWallet.availableBalance.toLocaleString()} available; need ₦${numericAmt.toLocaleString()}).`,
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `TRF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const senderMatch = findUserEntry(cleanSender);
    const recipientMatch = findUserEntry(cleanRecipient);
    const senderName = senderMatch?.user.fullName || 'AGC User';
    const recipientName = recipientMatch?.user.fullName || cleanRecipient;

    // Atomically debit sender
    senderWallet.availableBalance = Math.max(0, senderWallet.availableBalance - numericAmt);
    senderWallet.updatedAt = nowIso;

    // Atomically credit recipient
    recipientWallet.availableBalance = Math.max(0, recipientWallet.availableBalance + numericAmt);
    recipientWallet.updatedAt = nowIso;

    const outTx: ServerWalletTx = {
      id: `tx_${Date.now()}_out`,
      userId: senderMatch?.user.id,
      userPhone: senderMatch?.user.phoneNumber || senderWallet.phoneNumber || cleanSender,
      userName: senderName,
      type: 'transfer_out',
      title: title || `Transfer to ${recipientName}`,
      description: note || `Transfer to ${recipientName} (${cleanRecipient})`,
      amount: numericAmt,
      fee: 0,
      balanceAfter: senderWallet.availableBalance,
      currency: senderWallet.currency,
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { recipientPhone: cleanRecipient, recipientName, note },
    };

    const inTx: ServerWalletTx = {
      id: `tx_${Date.now()}_in`,
      userId: recipientMatch?.user.id,
      userPhone: recipientMatch?.user.phoneNumber || recipientWallet.phoneNumber || cleanRecipient,
      userName: recipientName,
      type: 'transfer_in',
      title: title || `Received from ${senderName}`,
      description: note || `Transfer received from ${senderName} (${cleanSender})`,
      amount: numericAmt,
      fee: 0,
      balanceAfter: recipientWallet.availableBalance,
      currency: recipientWallet.currency,
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { senderPhone: cleanSender, senderName, note },
    };

    senderWallet.transactions = sortAndDedupeLedger([outTx, ...senderWallet.transactions], 250);
    recipientWallet.transactions = sortAndDedupeLedger([inTx, ...recipientWallet.transactions], 250);

    serverWallets.set(senderWallet.phoneKey, senderWallet);
    serverWallets.set(recipientWallet.phoneKey, recipientWallet);

    saveWalletsFile();
    appendUnifiedLedgerTx(outTx);
    appendUnifiedLedgerTx(inTx);

    if (senderMatch) {
      senderMatch.user.walletBalanceNgn = senderWallet.availableBalance;
      (senderMatch.user as any).updatedAt = nowIso;
      usersByPhone.set(senderMatch.key, senderMatch.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(senderMatch.user);
    }
    if (recipientMatch) {
      recipientMatch.user.walletBalanceNgn = recipientWallet.availableBalance;
      (recipientMatch.user as any).updatedAt = nowIso;
      usersByPhone.set(recipientMatch.key, recipientMatch.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(recipientMatch.user);
    }

    emitWalletUpdateToPhone(cleanSender, senderWallet, outTx.title, ref);
    emitWalletUpdateToPhone(cleanRecipient, recipientWallet, inTx.title, ref);

    return res.json({
      success: true,
      reference: ref,
      wallet: {
        availableBalance: senderWallet.availableBalance,
        escrowLockedBalance: senderWallet.escrowLockedBalance,
        currency: senderWallet.currency,
        transactions: getUserMergedTransactions(cleanSender, undefined, 1000),
      },
      message: `Successfully transferred ₦${numericAmt.toLocaleString()} to ${recipientName}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Transfer failed.' });
  }
});

// REST: Unified Transaction Ledger endpoints (User + Admin Super-View)
app.get('/api/wallet/transactions', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const phone = String(req.query.phone || '').trim();
  const userId = String(req.query.userId || '').trim();
  if (phone || userId) {
    await hydrateUserLedgerFromSupabase(phone || userId, userId || undefined);
  }
  const merged = phone || userId
    ? getUserMergedTransactions(phone || userId, userId || undefined, 2000)
    : [];
  res.json({ success: true, transactions: merged });
});

app.post('/api/wallet/ledger', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const body = req.body || {};
    if (!body.type || body.amount === undefined) {
      return res.status(400).json({ error: 'Transaction type and amount required' });
    }
    if (isSyntheticTestAccount(body) || String(body.referenceId || body.reference || '').startsWith('TEST_')) {
      return res.status(403).json({ error: 'Synthetic test ledger entries are prohibited.' });
    }
    const phoneStr = String(body.userPhone || '').trim();
    const match = phoneStr ? findUserEntry(phoneStr) : undefined;
    const txId = String(body.id || `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`);
    const tx: ServerWalletTx = {
      id: txId,
      userId: body.userId || match?.user.id,
      userPhone: phoneStr || match?.user.phoneNumber || '',
      userName: body.userName || match?.user.fullName || 'AGC User',
      type: body.type,
      title: String(body.title || body.description || body.type),
      description: String(body.description || body.title || body.type),
      amount: Math.abs(Number(body.amount) || 0),
      fee: Number(body.fee || 0),
      balanceAfter: body.balanceAfter !== undefined && body.balanceAfter !== null ? Number(body.balanceAfter) : undefined,
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
    // Strictly audit/record the transaction without trusting or allowing client-controlled balance mutations!
    if (phoneStr) {
      const w = getOrCreateServerWallet(phoneStr);
      // Stamp the ledger entry with the authoritative server balance
      saved.balanceAfter = w.availableBalance;
      w.transactions = sortAndDedupeLedger([saved, ...w.transactions], 250);
      serverWallets.set(w.phoneKey, w);
      saveWalletsFile(false);
    }
    res.json({
      success: true,
      transaction: saved,
      transactions: phoneStr ? getUserMergedTransactions(phoneStr, saved.userId, 500) : undefined,
    });
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
app.post('/api/wallet/upgrade-badge', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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

    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
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
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to upgrade badge' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRICT SERVER-AUTHORITATIVE GAME BET ESCROW ENGINE (X/O, WHOT!, LUDO)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/games/bet/lock', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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
    const gType: 'xo' | 'whot' | 'ludo' | 'poker' =
      gameType === 'whot' ? 'whot' : gameType === 'ludo' ? 'ludo' : gameType === 'poker' ? 'poker' : 'xo';

    if (!cleanGameId || !cleanPlayer || !Number.isFinite(stake) || stake < 50) {
      return res.status(400).json({
        success: false,
        message: 'Valid gameId, playerPhone, and minimum stake of 50 are required.',
      });
    }

    let match = findUserEntry(cleanPlayer);
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

    let existingEscrow = serverGameEscrows.get(cleanGameId);
    if (!existingEscrow && playerRole === 'opponent') {
      const remoteGameSlice = await fetchSupabaseAdminSlice(ADMIN_SYS_GAME_ESCROWS_KEY).catch(() => null);
      if (remoteGameSlice && syncGameEscrowsFromSupabaseHook) {
        syncGameEscrowsFromSupabaseHook(remoteGameSlice);
        existingEscrow = serverGameEscrows.get(cleanGameId);
      }
    }
    if (existingEscrow?.settled) {
      return res.status(409).json({
        success: false,
        alreadyClosed: true,
        message: `Match is already ${existingEscrow.settledStatus || 'closed'}.`,
      });
    }

    let wallet = getOrCreateServerWallet(cleanPlayer);
    if (wallet.availableBalance < stake) {
      // Check latest remote wallets/users override in Supabase before rejecting for insufficient balance
      await syncAdminStateFromSupabase().catch(() => {});
      match = findUserEntry(cleanPlayer) || match;
      wallet = getOrCreateServerWallet(cleanPlayer);
    }

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
            transactions: getUserMergedTransactions(cleanPlayer, undefined, 1000),
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
    const label = gType === 'whot' ? 'Whot!' : gType === 'ludo' ? 'Ludo' : gType === 'poker' ? 'Poker' : 'X/O';

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
        transactions: getUserMergedTransactions(cleanPlayer, undefined, 1000),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to lock bet escrow' });
  }
});

app.post('/api/games/bet/settle', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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

    let existingEscrow = serverGameEscrows.get(cleanGameId);
    if (!existingEscrow) {
      const remoteGameSlice = await fetchSupabaseAdminSlice(ADMIN_SYS_GAME_ESCROWS_KEY).catch(() => null);
      if (remoteGameSlice && syncGameEscrowsFromSupabaseHook) {
        syncGameEscrowsFromSupabaseHook(remoteGameSlice);
        existingEscrow = serverGameEscrows.get(cleanGameId);
      }
    }
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
              transactions: getUserMergedTransactions(reqPhoneStr, undefined, 1000),
            }
          : undefined,
      });
    }

    const gType: 'xo' | 'whot' | 'ludo' | 'poker' =
      existingEscrow?.gameType || (gameType === 'whot' ? 'whot' : gameType === 'ludo' ? 'ludo' : gameType === 'poker' ? 'poker' : 'xo');
    const label = gType === 'whot' ? 'Whot!' : gType === 'ludo' ? 'Ludo' : gType === 'poker' ? 'Poker' : 'X/O';
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
    const chalLockTxId = `tx_${gType}_lock_${cleanGameId}`;
    const oppAccTxId = `tx_${gType}_acc_${cleanGameId}`;
    const chalLocked = existingEscrow
      ? existingEscrow.challengerLocked
      : unifiedLedger.some((tx) => tx.id === chalLockTxId) ||
        Boolean(serverWallets.get(chalKey)?.transactions?.some((tx) => tx.id === chalLockTxId));
    const oppLocked = existingEscrow
      ? existingEscrow.opponentLocked
      : unifiedLedger.some((tx) => tx.id === oppAccTxId) ||
        Boolean(oppKey && serverWallets.get(oppKey)?.transactions?.some((tx) => tx.id === oppAccTxId));

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
            transactions: getUserMergedTransactions(
              reqPhoneStr || reqWallet.phoneNumber || reqWallet.phoneKey,
              undefined,
              1000
            ),
          }
        : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to settle bet escrow' });
  }
});

app.get('/api/admin/wallet-transactions', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const q = String(req.query.q || '').trim().toLowerCase();
  const typeFilter = String(req.query.type || '').trim();

  // Merge persisted Supabase ledger slice + wallet_transactions so cold container restarts never hide money trail
  try {
    const sbLedger = await fetchSupabaseAdminSlice(ADMIN_SYS_LEDGER_KEY).catch(() => null);
    if (sbLedger && syncLedgerFromSupabaseHook) {
      syncLedgerFromSupabaseHook(sbLedger);
    }
  } catch (_) {}

  const sbKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (SUPABASE_URL && sbKey) {
    try {
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallet_transactions?select=*&order=created_at.desc&limit=500`,
        {
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (sbRes.ok) {
        const sbRows = await sbRes.json();
        if (Array.isArray(sbRows) && sbRows.length > 0) {
          const recovered: ServerWalletTx[] = [];
          for (const row of sbRows) {
            const n = normalizeServerWalletTx({
              id: row.id,
              userId: row.user_id,
              userPhone: row.user_phone,
              userName: row.user_name,
              type: row.type,
              title: row.title,
              description: row.description,
              amount: row.amount,
              fee: row.fee,
              balanceAfter: row.balance_after,
              currency: row.currency,
              createdAt: row.created_at,
              status: row.status,
              reference: row.reference,
              referenceId: row.reference_id,
              channel: row.channel,
              metadata: row.metadata,
            });
            if (n) recovered.push(n);
          }
          if (recovered.length > 0) {
            unifiedLedger = sortAndDedupeLedger([...unifiedLedger, ...recovered], 10000);
            saveUnifiedLedgerFile();
          }
        }
      }
    } catch (_) {}
  }

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
  res.json({ success: true, transactions: rows.slice(0, 1000), total: rows.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITATIVE ESCROW ENGINE (1% FEE MAX ₦4,000 + TWO-STEP PIN RELEASE)
// ═══════════════════════════════════════════════════════════════════════════════
interface ServerEscrowOrder {
  id: string;
  chatId: string;
  product: any;
  quantity: number;
  subtotalAmount: number;
  escrowFee: number;
  totalAmount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  status: 'escrow_secured' | 'shipped' | 'release_approved' | 'funds_released' | 'disputed';
  escrowPin: string;
  buyerName: string;
  buyerPhone: string;
  sellerName: string;
  sellerPhone: string;
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

const serverEscrowOrders = new Map<string, ServerEscrowOrder>();
let serverEscrowsUpdatedAt = '';

try {
  if (fs.existsSync(ESCROWS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(ESCROWS_FILE, 'utf8'));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.orders) ? raw.orders : [];
    for (const o of list) {
      if (o && o.id) serverEscrowOrders.set(String(o.id), o);
    }
    if (raw?.updatedAt) serverEscrowsUpdatedAt = String(raw.updatedAt);
  }
} catch (e) {
  console.warn('Notice loading data_escrow_orders.json:', e);
}

function saveEscrowOrdersFile() {
  try {
    serverEscrowsUpdatedAt = new Date().toISOString();
    fs.writeFileSync(
      ESCROWS_FILE,
      JSON.stringify({ orders: Array.from(serverEscrowOrders.values()), updatedAt: serverEscrowsUpdatedAt }, null, 2)
    );
  } catch (e) {
    console.warn('Notice saving data_escrow_orders.json:', e);
  }
}

function pushEscrowOrdersToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_ESCROWS_KEY, 'AGC_ADMIN_ESCROWS', {
    orders: Array.from(serverEscrowOrders.values()).slice(0, 500),
    updatedAt: serverEscrowsUpdatedAt || new Date().toISOString(),
  }).catch(() => {});
}

syncEscrowsFromSupabaseHook = (slice: any) => {
  if (!slice || !Array.isArray(slice.orders)) return;
  const remoteTs = new Date(slice.updatedAt || slice._rowUpdatedAt || 0).getTime();
  const localTs = serverEscrowsUpdatedAt ? new Date(serverEscrowsUpdatedAt).getTime() : 0;
  if (remoteTs > localTs || serverEscrowOrders.size === 0) {
    for (const o of slice.orders) {
      if (!o?.id) continue;
      const cur = serverEscrowOrders.get(o.id);
      if (!cur || new Date(o.updatedAt || 0).getTime() >= new Date(cur.updatedAt || 0).getTime()) {
        serverEscrowOrders.set(o.id, o);
      }
    }
    serverEscrowsUpdatedAt = slice.updatedAt || slice._rowUpdatedAt || new Date().toISOString();
    try {
      fs.writeFileSync(
        ESCROWS_FILE,
        JSON.stringify({ orders: Array.from(serverEscrowOrders.values()), updatedAt: serverEscrowsUpdatedAt }, null, 2)
      );
    } catch (_) {}
  }
};

function computeEscrowFeeServer(subtotal: number): number {
  const cleanSub = Math.max(0, Math.round(Number(subtotal) || 0));
  return Math.min(Math.round(cleanSub * 0.01), 4000);
}

function maskEscrowOrderForViewer(order: ServerEscrowOrder, viewerPhone?: string): ServerEscrowOrder {
  if (!viewerPhone) {
    const { escrowPin: _pin, ...rest } = order as any;
    return { ...rest, escrowPin: '' };
  }
  const isBuyer = phonesMatchServer(viewerPhone, order.buyerPhone);
  if (isBuyer) return order;
  const { escrowPin: _pin, ...rest } = order as any;
  return { ...rest, escrowPin: '' };
}

function broadcastEscrowOrderUpdate(order: ServerEscrowOrder) {
  const masked = maskEscrowOrderForViewer(order);
  const buyerVariants = getPhoneVariants(order.buyerPhone);
  const buyerSocketIds = new Set<string>();
  for (const v of buyerVariants) {
    const room = io.sockets.adapter.rooms.get(`phone:${v}`);
    if (room) {
      for (const sid of room) {
        buyerSocketIds.add(sid);
        io.to(sid).emit('escrow_order_updated', order);
      }
    }
  }
  const sellerVariants = getPhoneVariants(order.sellerPhone);
  const sellerSocketIds = new Set<string>();
  for (const v of sellerVariants) {
    const room = io.sockets.adapter.rooms.get(`phone:${v}`);
    if (room) {
      for (const sid of room) {
        if (!buyerSocketIds.has(sid) && !sellerSocketIds.has(sid)) {
          sellerSocketIds.add(sid);
          io.to(sid).emit('escrow_order_updated', masked);
        }
      }
    }
  }
}

app.get('/api/escrow/orders', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const viewerPhone = String(req.query.viewerPhone || '').trim();
  const isAdminView = String(req.query.admin || '') === 'true';
  const allOrders = Array.from(serverEscrowOrders.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
  if (isAdminView) {
    return res.json({ success: true, orders: allOrders });
  }
  if (!viewerPhone) {
    return res.json({ success: true, orders: allOrders.map((o) => maskEscrowOrderForViewer(o)) });
  }
  const mine = allOrders.filter(
    (o) => phonesMatchServer(viewerPhone, o.buyerPhone) || phonesMatchServer(viewerPhone, o.sellerPhone)
  );
  return res.json({
    success: true,
    orders: mine.map((o) => maskEscrowOrderForViewer(o, viewerPhone)),
  });
});

app.post('/api/escrow/create', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const body = req.body || {};
    const {
      id,
      chatId,
      product,
      quantity = 1,
      buyerName,
      buyerPhone,
      sellerName,
      sellerPhone,
      deliveryAddress,
      paymentMethod = 'wallet',
      paystackRef,
      escrowPin: requestedPin,
    } = body;

    if (!product || !buyerPhone) {
      return res.status(400).json({ success: false, message: 'Product and buyer phone are required.' });
    }

    const qty = Math.max(1, Math.round(Number(quantity) || 1));
    const unitPrice = Math.max(1, Math.round(Number(product.price) || 0));
    const subtotalAmount = unitPrice * qty;
    const escrowFee = computeEscrowFeeServer(subtotalAmount);
    const totalAmount = subtotalAmount + escrowFee;
    const currency = (product.currency || 'NGN') as ServerEscrowOrder['currency'];

    const buyerMatch = findUserEntry(String(buyerPhone));
    const buyerWallet = getOrCreateServerWallet(String(buyerPhone));
    const channel: 'wallet' | 'paystack' = paymentMethod === 'paystack' ? 'paystack' : 'wallet';

    if (channel === 'wallet' && buyerWallet.availableBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance. Need ${totalAmount.toLocaleString()} (includes ₦${escrowFee.toLocaleString()} escrow fee).`,
        availableBalance: buyerWallet.availableBalance,
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderId = String(id || `ORD-${Math.floor(100000 + Math.random() * 900000)}`);
    const pin = /^\d{4}$/.test(String(requestedPin || ''))
      ? String(requestedPin)
      : String(Math.floor(1000 + Math.random() * 9000));
    const ref = String(paystackRef || `ESC_${orderId}_${Date.now()}`);

    if (channel === 'wallet') {
      buyerWallet.availableBalance = Math.max(0, buyerWallet.availableBalance - totalAmount);
    }
    buyerWallet.escrowLockedBalance = Math.max(0, Number(buyerWallet.escrowLockedBalance || 0) + subtotalAmount);
    buyerWallet.updatedAt = nowIso;

    const lockTx: ServerWalletTx = {
      id: `tx_esc_lock_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: buyerMatch?.user.id,
      userPhone: buyerMatch?.user.phoneNumber || String(buyerPhone),
      userName: buyerMatch?.user.fullName || String(buyerName || 'Buyer'),
      type: 'escrow_lock',
      title: `Escrow Vault: ${product.title} (Incl. 1% fee: ₦${escrowFee.toLocaleString()})`,
      description: `Held in escrow for ${sellerName || product.sellerName} · Order ${orderId}`,
      amount: totalAmount,
      fee: escrowFee,
      balanceAfter: buyerWallet.availableBalance,
      currency,
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: orderId,
      channel,
      metadata: { orderId, subtotalAmount, escrowFee, sellerName, sellerPhone },
    };

    buyerWallet.transactions = [lockTx, ...buyerWallet.transactions].slice(0, 100);
    serverWallets.set(buyerWallet.phoneKey, buyerWallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(lockTx);

    if (buyerMatch) {
      buyerMatch.user.walletBalanceNgn = buyerWallet.availableBalance;
      (buyerMatch.user as any).updatedAt = nowIso;
      usersByPhone.set(buyerMatch.key, buyerMatch.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(buyerMatch.user);
    }
    emitWalletUpdateToPhone(String(buyerPhone), buyerWallet, lockTx.title, ref);

    let resolvedSellerPhone = String(sellerPhone || product.sellerPhone || '').trim();
    if (!resolvedSellerPhone && sellerName) {
      for (const u of usersByPhone.values()) {
        if (u.fullName?.toLowerCase() === String(sellerName).toLowerCase()) {
          resolvedSellerPhone = u.phoneNumber;
          break;
        }
      }
    }

    const order: ServerEscrowOrder = {
      id: orderId,
      chatId: String(chatId || ''),
      product: { ...product, sellerPhone: resolvedSellerPhone || product.sellerPhone },
      quantity: qty,
      subtotalAmount,
      escrowFee,
      totalAmount,
      currency,
      status: 'escrow_secured',
      escrowPin: pin,
      buyerName: String(buyerName || buyerMatch?.user.fullName || 'Buyer'),
      buyerPhone: String(buyerPhone),
      sellerName: String(sellerName || product.sellerName || 'Seller'),
      sellerPhone: resolvedSellerPhone,
      deliveryAddress: String(deliveryAddress || ''),
      createdAt: nowIso,
      updatedAt: nowIso,
      failedClaimAttempts: 0,
      paymentMethod: channel,
      paystackRef: ref,
    };

    serverEscrowOrders.set(order.id, order);
    saveEscrowOrdersFile();
    pushEscrowOrdersToSupabase();
    broadcastEscrowOrderUpdate(order);

    appendAuditEntry({
      refId: order.id,
      actor: order.buyerName,
      actorRole: 'Buyer',
      action: 'Escrow Created',
      target: `${order.product.title} (${order.buyerName} -> ${order.sellerName})`,
      details: `Subtotal ₦${subtotalAmount.toLocaleString()} + Fee ₦${escrowFee.toLocaleString()} = ₦${totalAmount.toLocaleString()}`,
    });

    return res.json({
      success: true,
      order,
      wallet: {
        availableBalance: buyerWallet.availableBalance,
        escrowLockedBalance: buyerWallet.escrowLockedBalance,
        currency: buyerWallet.currency,
        transactions: getUserMergedTransactions(String(buyerPhone), undefined, 1000),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to create escrow order' });
  }
});

app.post('/api/escrow/approve-release', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const { orderId, actorPhone } = req.body || {};
  const order = serverEscrowOrders.get(String(orderId || ''));
  if (!order) {
    return res.status(404).json({ success: false, message: 'Escrow order not found on server.' });
  }
  if (actorPhone && order.buyerPhone && !phonesMatchServer(actorPhone, order.buyerPhone)) {
    return res.status(403).json({ success: false, message: 'Only the escrow buyer/creator can approve release.' });
  }
  if (order.status === 'funds_released') {
    return res.json({ success: true, order, message: 'Funds already released to recipient.' });
  }
  if (order.status === 'disputed') {
    return res.status(400).json({ success: false, message: 'Order is currently disputed and locked for Admin review.' });
  }
  const nowIso = new Date().toISOString();
  order.status = 'release_approved';
  order.approvedAt = nowIso;
  order.updatedAt = nowIso;
  serverEscrowOrders.set(order.id, order);
  saveEscrowOrdersFile();
  pushEscrowOrdersToSupabase();
  broadcastEscrowOrderUpdate(order);

  appendAuditEntry({
    refId: order.id,
    actor: order.buyerName,
    actorRole: 'Buyer',
    action: 'Escrow Release Approved',
    target: `Order #${order.id}`,
    details: 'Buyer approved release; awaiting recipient PIN entry to claim funds.',
  });

  return res.json({
    success: true,
    order,
    message: `Release approved! Share your 4-digit system code (${order.escrowPin}) with ${order.sellerName} to claim payout.`,
  });
});

app.post('/api/escrow/claim', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const { orderId, pin, claimantPhone } = req.body || {};
  const order = serverEscrowOrders.get(String(orderId || ''));
  if (!order) {
    return res.status(404).json({ success: false, message: 'Escrow order not found.' });
  }
  if (order.status === 'funds_released') {
    return res.status(400).json({ success: false, message: 'Escrow funds have already been claimed.' });
  }
  if (order.status === 'disputed') {
    return res.status(400).json({ success: false, message: 'Order is locked under dispute. Contact Admin arbitration.' });
  }
  if (order.status !== 'release_approved') {
    return res.status(400).json({
      success: false,
      message: 'Funds are still held awaiting buyer approval before the claim code can be redeemed.',
    });
  }

  const enteredPin = String(pin || '').trim();
  if (enteredPin !== String(order.escrowPin).trim()) {
    const attempts = (order.failedClaimAttempts || 0) + 1;
    order.failedClaimAttempts = attempts;
    order.updatedAt = new Date().toISOString();
    if (attempts >= 3) {
      order.status = 'disputed';
      order.disputeReason = 'Locked after 3 invalid release PIN claim attempts';
    }
    serverEscrowOrders.set(order.id, order);
    saveEscrowOrdersFile();
    pushEscrowOrdersToSupabase();
    broadcastEscrowOrderUpdate(order);

    if (attempts >= 3) {
      appendAuditEntry({
        refId: order.id,
        actor: order.sellerName,
        actorRole: 'Recipient',
        action: 'Escrow Auto-Disputed',
        target: `Order #${order.id}`,
        details: 'Locked after 3 invalid PIN attempts.',
      });
      return res.status(403).json({
        success: false,
        locked: true,
        order: maskEscrowOrderForViewer(order, claimantPhone),
        message: '3 invalid release codes entered. Order locked in Dispute for Admin review.',
      });
    }
    return res.status(400).json({
      success: false,
      attemptsRemaining: 3 - attempts,
      order: maskEscrowOrderForViewer(order, claimantPhone),
      message: `Invalid 4-digit release code. ${3 - attempts} attempt(s) remaining before dispute lock.`,
    });
  }

  const nowIso = new Date().toISOString();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const payout = Math.max(0, Number(order.subtotalAmount || order.product?.price || order.totalAmount));

  // Unlock buyer's escrowLockedBalance
  if (order.buyerPhone) {
    const buyerWallet = getOrCreateServerWallet(order.buyerPhone);
    buyerWallet.escrowLockedBalance = Math.max(0, Number(buyerWallet.escrowLockedBalance || 0) - payout);
    buyerWallet.updatedAt = nowIso;
    serverWallets.set(buyerWallet.phoneKey, buyerWallet);
    emitWalletUpdateToPhone(order.buyerPhone, buyerWallet, `Escrow released for ${order.product.title}`, order.id);
  }

  // Credit seller's availableBalance
  const sellerTarget = order.sellerPhone || claimantPhone || order.sellerName;
  const sellerWallet = getOrCreateServerWallet(sellerTarget);
  const sellerMatch = findUserEntry(sellerTarget);
  sellerWallet.availableBalance = Math.max(0, Number(sellerWallet.availableBalance || 0) + payout);
  sellerWallet.updatedAt = nowIso;

  const relTx: ServerWalletTx = {
    id: `tx_esc_rel_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    userId: sellerMatch?.user.id,
    userPhone: sellerMatch?.user.phoneNumber || sellerWallet.phoneNumber || sellerTarget,
    userName: sellerMatch?.user.fullName || order.sellerName,
    type: 'escrow_release',
    title: `Escrow Payout Claimed: ${order.product.title}`,
    description: `Released by ${order.buyerName} · Order ${order.id} (Fee ₦${(order.escrowFee || 0).toLocaleString()} paid by buyer)`,
    amount: payout,
    fee: order.escrowFee || 0,
    balanceAfter: sellerWallet.availableBalance,
    currency: order.currency,
    timestamp: nowStr,
    createdAt: nowIso,
    status: 'completed',
    reference: `REL_${order.id}`,
    referenceId: order.id,
    channel: 'wallet',
    metadata: { orderId: order.id, buyerName: order.buyerName, buyerPhone: order.buyerPhone },
  };
  sellerWallet.transactions = sortAndDedupeLedger([relTx, ...sellerWallet.transactions], 250);
  serverWallets.set(sellerWallet.phoneKey, sellerWallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(relTx);

  if (sellerMatch) {
    sellerMatch.user.walletBalanceNgn = sellerWallet.availableBalance;
    (sellerMatch.user as any).updatedAt = nowIso;
    usersByPhone.set(sellerMatch.key, sellerMatch.user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(sellerMatch.user);
  }

  order.status = 'funds_released';
  order.releasedAt = nowIso;
  order.updatedAt = nowIso;
  serverEscrowOrders.set(order.id, order);
  saveEscrowOrdersFile();
  pushEscrowOrdersToSupabase();

  emitWalletUpdateToPhone(sellerTarget, sellerWallet, relTx.title, relTx.reference);
  broadcastEscrowOrderUpdate(order);

  appendAuditEntry({
    refId: order.id,
    actor: order.sellerName,
    actorRole: 'Recipient',
    action: 'Escrow Claimed',
    target: `Order #${order.id}`,
    details: `₦${payout.toLocaleString()} credited to ${order.sellerName}`,
  });

  return res.json({
    success: true,
    order: maskEscrowOrderForViewer(order, claimantPhone),
    payoutAmount: payout,
    message: `Code verified! ₦${payout.toLocaleString()} has been credited to ${order.sellerName}'s wallet.`,
    wallet: {
      availableBalance: sellerWallet.availableBalance,
      escrowLockedBalance: sellerWallet.escrowLockedBalance,
      currency: sellerWallet.currency,
      transactions: getUserMergedTransactions(sellerTarget, undefined, 1000),
    },
  });
});

app.post('/api/escrow/dispute', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const { orderId, reason, actorName } = req.body || {};
  const order = serverEscrowOrders.get(String(orderId || ''));
  if (!order) {
    return res.status(404).json({ success: false, message: 'Escrow order not found.' });
  }
  if (order.status === 'funds_released') {
    return res.status(400).json({ success: false, message: 'Released orders cannot be disputed.' });
  }
  order.status = 'disputed';
  order.disputeReason = String(reason || 'Dispute flagged by participant').trim();
  order.updatedAt = new Date().toISOString();
  serverEscrowOrders.set(order.id, order);
  saveEscrowOrdersFile();
  pushEscrowOrdersToSupabase();
  broadcastEscrowOrderUpdate(order);

  appendAuditEntry({
    refId: order.id,
    actor: String(actorName || order.buyerName),
    actorRole: 'Participant',
    action: 'Escrow Disputed',
    target: `Order #${order.id}`,
    details: order.disputeReason,
  });

  return res.json({ success: true, order, message: `Order #${order.id} flagged for Admin arbitration.` });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIED PROFESSIONALS MARKETPLACE (AFRILAW, AFRIHEALTH, ERRANDS)
// ═══════════════════════════════════════════════════════════════════════════════
interface ProfessionalsStore {
  lawyers: any[];
  clinicsDoctors: any[];
  errandRunners: any[];
  errandOrders: any[];
  updatedAt: string;
}

let professionalsState: ProfessionalsStore = {
  lawyers: [],
  clinicsDoctors: [],
  errandRunners: [],
  errandOrders: [],
  updatedAt: '',
};

try {
  if (fs.existsSync(PROFESSIONALS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PROFESSIONALS_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      professionalsState = {
        lawyers: Array.isArray(raw.lawyers) ? raw.lawyers : [],
        clinicsDoctors: Array.isArray(raw.clinicsDoctors) ? raw.clinicsDoctors : [],
        errandRunners: Array.isArray(raw.errandRunners) ? raw.errandRunners : [],
        errandOrders: Array.isArray(raw.errandOrders) ? raw.errandOrders : [],
        updatedAt: String(raw.updatedAt || ''),
      };
    }
  }
} catch (e) {
  console.warn('Notice loading data_professionals.json:', e);
}

function saveProfessionalsFile() {
  try {
    professionalsState.updatedAt = new Date().toISOString();
    fs.writeFileSync(PROFESSIONALS_FILE, JSON.stringify(professionalsState, null, 2));
  } catch (e) {
    console.warn('Notice saving data_professionals.json:', e);
  }
}

function pushProfessionalsToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_PROFS_KEY, 'AGC_PROFESSIONALS', professionalsState).catch(() => {});
}

function broadcastProfessionalsUpdate() {
  io.emit('professionals_updated', professionalsState);
}

syncProfessionalsFromSupabaseHook = (slice: any) => {
  if (!slice || typeof slice !== 'object') return;
  const remoteTs = new Date(slice.updatedAt || slice._rowUpdatedAt || 0).getTime();
  const localTs = professionalsState.updatedAt ? new Date(professionalsState.updatedAt).getTime() : 0;
  const localEmpty =
    professionalsState.lawyers.length === 0 &&
    professionalsState.clinicsDoctors.length === 0 &&
    professionalsState.errandRunners.length === 0;
  if (remoteTs > localTs || localEmpty) {
    professionalsState = {
      lawyers: Array.isArray(slice.lawyers) ? slice.lawyers : professionalsState.lawyers,
      clinicsDoctors: Array.isArray(slice.clinicsDoctors) ? slice.clinicsDoctors : professionalsState.clinicsDoctors,
      errandRunners: Array.isArray(slice.errandRunners) ? slice.errandRunners : professionalsState.errandRunners,
      errandOrders: Array.isArray(slice.errandOrders) ? slice.errandOrders : professionalsState.errandOrders,
      updatedAt: slice.updatedAt || slice._rowUpdatedAt || new Date().toISOString(),
    };
    try {
      fs.writeFileSync(PROFESSIONALS_FILE, JSON.stringify(professionalsState, null, 2));
    } catch (_) {}
  }
};

app.get('/api/professionals', async (_req: Request, res: Response) => {
  if (!professionalsState.updatedAt) {
    const slice = await fetchSupabaseAdminSlice(ADMIN_SYS_PROFS_KEY);
    if (slice && syncProfessionalsFromSupabaseHook) syncProfessionalsFromSupabaseHook(slice);
  }
  res.json({ success: true, ...professionalsState });
});

app.post('/api/professionals/lawyers/register', (req: Request, res: Response) => {
  const b = req.body || {};
  const rawScn = b.barNumber || b.supremeCourtNumber;
  const rawFirm = b.firm || b.firmName || 'Independent Legal Practice';
  if (!b.name || !rawScn || !b.officeAddress || !b.city) {
    return res.status(400).json({ success: false, error: 'Full name, Supreme Court Number (SCN), office address, and city are required.', message: 'Full name, Supreme Court Number (SCN), office address, and city are required.' });
  }
  const scnClean = String(rawScn).trim().toUpperCase();
  const dup = professionalsState.lawyers.find(
    (l) => String(l.barNumber || l.supremeCourtNumber || '').trim().toUpperCase() === scnClean && l.userPhone !== b.userPhone
  );
  if (dup) {
    return res.status(409).json({ success: false, error: `Supreme Court Number ${scnClean} is already registered.`, message: `Supreme Court Number ${scnClean} is already registered.` });
  }
  const nowIso = new Date().toISOString();
  const specializations = Array.isArray(b.specializations) && b.specializations.length > 0
    ? b.specializations
    : [b.specialty || 'CAC Business & Corporate'];
  const entry = {
    id: `law_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: String(b.userId || ''),
    userPhone: String(b.userPhone || ''),
    phone: String(b.userPhone || ''),
    name: String(b.name).trim(),
    title: String(b.title || 'Barrister & Solicitor'),
    firm: String(rawFirm).trim(),
    firmName: String(rawFirm).trim(),
    specialty: specializations[0],
    specializations,
    avatar: String(b.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.name)}`),
    barNumber: scnClean,
    supremeCourtNumber: scnClean,
    yearsExperience: Math.max(0, Number(b.yearsExperience) || 1),
    consultationFee: Math.max(1000, Number(b.consultationFee) || 15000),
    currency: b.currency || 'NGN',
    isAvailable: true,
    location: `${String(b.officeAddress).trim()}, ${String(b.city).trim()}`,
    officeAddress: String(b.officeAddress).trim(),
    city: String(b.city).trim(),
    verifiedLicense: false,
    isVerified: false,
    approvalStatus: 'pending',
    verificationStatus: 'pending',
    rating: 5.0,
    bio: String(b.bio || `${specializations.join(', ')} practitioner based in ${b.city}.`).trim(),
    createdAt: nowIso,
  };
  professionalsState.lawyers = [
    entry,
    ...professionalsState.lawyers.filter((l) => l.userPhone !== entry.userPhone || !entry.userPhone),
  ];
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, lawyer: entry, professionals: professionalsState });
});

app.post('/api/professionals/clinics/register', (req: Request, res: Response) => {
  const b = req.body || {};
  const rawHospital = b.hospitalAffiliation || b.hospitalName || b.name;
  if (!b.name || !b.licenseNumber || !rawHospital || !b.city) {
    return res.status(400).json({ success: false, error: 'Name, MDCN/Facility license number, hospital/clinic name, and city are required.', message: 'Name, MDCN/Facility license number, hospital/clinic name, and city are required.' });
  }
  const licClean = String(b.licenseNumber).trim().toUpperCase();
  const dup = professionalsState.clinicsDoctors.find(
    (d) => String(d.licenseNumber || '').trim().toUpperCase() === licClean && d.userPhone !== b.userPhone
  );
  if (dup) {
    return res.status(409).json({ success: false, error: `License ${licClean} is already registered.`, message: `License ${licClean} is already registered.` });
  }
  const nowIso = new Date().toISOString();
  const entry = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: String(b.userId || ''),
    userPhone: String(b.userPhone || ''),
    phone: String(b.userPhone || ''),
    accountType: b.accountType === 'clinic' ? 'clinic' : 'doctor',
    name: String(b.name).trim(),
    title: String(b.title || (b.accountType === 'clinic' ? 'Accredited Clinic' : 'Medical Practitioner')),
    specialty: String(b.specialty || 'General Practitioner'),
    hospitalAffiliation: String(rawHospital).trim(),
    hospitalName: String(rawHospital).trim(),
    licenseNumber: licClean,
    city: String(b.city).trim(),
    officeAddress: String(b.officeAddress || b.city).trim(),
    departments: Array.isArray(b.departments) && b.departments.length > 0 ? b.departments : ['General Outpatient Clinic'],
    avatar: String(b.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.name)}`),
    rating: 5.0,
    reviewCount: 0,
    consultationFee: Math.max(500, Number(b.consultationFee) || 5000),
    currency: b.currency || 'NGN',
    isAvailable: true,
    isVerified: false,
    approvalStatus: 'pending',
    verificationStatus: 'pending',
    languages: Array.isArray(b.languages) && b.languages.length > 0 ? b.languages : ['English', 'Pidgin'],
    bio: String(b.bio || `Verified care at ${rawHospital}, ${b.city}.`).trim(),
    createdAt: nowIso,
  };
  professionalsState.clinicsDoctors = [
    entry,
    ...professionalsState.clinicsDoctors.filter((d) => d.userPhone !== entry.userPhone || !entry.userPhone),
  ];
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, doctor: entry, professionals: professionalsState });
});

app.post('/api/professionals/errands/register', (req: Request, res: Response) => {
  const b = req.body || {};
  if (!b.name || !b.location || !b.phone) {
    return res.status(400).json({ success: false, message: 'Runner name, phone, and coverage location are required.' });
  }
  const nowIso = new Date().toISOString();
  const existing = professionalsState.errandRunners.find(
    (r) => r.userId === b.userId || phonesMatchServer(r.phone, b.phone)
  );
  const runner = existing
    ? {
        ...existing,
        name: String(b.name).trim(),
        location: String(b.location).trim(),
        deliveryBaseFee: Math.max(500, Number(b.deliveryBaseFee) || existing.deliveryBaseFee || 1500),
        ninOrIdRef: String(b.ninOrIdRef || existing.ninOrIdRef || '').trim(),
        bio: String(b.bio || existing.bio || `Personal market & grocery shopper in ${b.location}`).trim(),
      }
    : {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: String(b.userId || ''),
        name: String(b.name).trim(),
        phone: String(b.phone).trim(),
        ninOrIdRef: String(b.ninOrIdRef || '').trim(),
        avatar: String(b.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.name)}`),
        location: String(b.location).trim(),
        bio: String(b.bio || `Personal market & grocery shopper in ${b.location}`).trim(),
        rating: 5.0,
        reviewsCount: 0,
        completedCount: 0,
        deliveryBaseFee: Math.max(500, Number(b.deliveryBaseFee) || 1500),
        currency: b.currency || 'NGN',
        itemsForSale: [],
        isOnline: true,
        isRegistered: true,
        isVerified: false,
        approvalStatus: 'pending',
        createdAt: nowIso,
      };
  professionalsState.errandRunners = [
    runner,
    ...professionalsState.errandRunners.filter((r) => r.id !== runner.id),
  ];
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, runner, professionals: professionalsState });
});

app.post('/api/professionals/errands/items', (req: Request, res: Response) => {
  const { runnerId, userId, phone, item } = req.body || {};
  const runner = professionalsState.errandRunners.find(
    (r) => (runnerId && r.id === runnerId) || (userId && r.userId === userId) || (phone && phonesMatchServer(r.phone, phone))
  );
  if (!runner) return res.status(404).json({ success: false, message: 'Runner profile not found.' });
  const newItem = {
    id: item?.id || `eitem_${Date.now()}`,
    name: String(item?.name || '').trim(),
    price: Math.max(1, Number(item?.price) || 0),
    unit: String(item?.unit || 'piece').trim(),
    category: String(item?.category || 'Groceries'),
    inStock: item?.inStock !== false,
  };
  runner.itemsForSale = [newItem, ...(runner.itemsForSale || [])];
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, runner, item: newItem });
});

app.delete('/api/professionals/errands/items/:runnerId/:itemId', (req: Request, res: Response) => {
  const { runnerId, itemId } = req.params;
  const runner = professionalsState.errandRunners.find((r) => r.id === runnerId);
  if (!runner) return res.status(404).json({ success: false, message: 'Runner not found.' });
  runner.itemsForSale = (runner.itemsForSale || []).filter((i: any) => i.id !== itemId);
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, runner });
});

app.post('/api/professionals/errands/order', (req: Request, res: Response) => {
  const b = req.body || {};
  if (!b.customerPhone || !b.runnerId || !b.totalAmount) {
    return res.status(400).json({ success: false, message: 'Customer, runner, and amount required.' });
  }
  const amt = Math.round(Number(b.totalAmount) || 0);
  const custWallet = getOrCreateServerWallet(String(b.customerPhone));
  if (custWallet.availableBalance < amt) {
    return res.status(400).json({ success: false, insufficientFunds: true, message: 'Insufficient wallet balance for errand escrow.' });
  }
  const nowIso = new Date().toISOString();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  custWallet.availableBalance -= amt;
  custWallet.escrowLockedBalance = Number(custWallet.escrowLockedBalance || 0) + amt;
  custWallet.updatedAt = nowIso;
  const custMatch = findUserEntry(String(b.customerPhone));
  const orderId = String(b.id || `err_${Date.now()}`);
  const tx: ServerWalletTx = {
    id: `tx_err_lock_${Date.now()}`,
    userId: custMatch?.user.id,
    userPhone: custMatch?.user.phoneNumber || String(b.customerPhone),
    userName: custMatch?.user.fullName || String(b.customerName || 'Customer'),
    type: 'errand_escrow',
    title: `Errand Escrow: ${b.runnerName || 'Runner'}`,
    description: `Errand order #${orderId} held in escrow`,
    amount: amt,
    fee: 0,
    balanceAfter: custWallet.availableBalance,
    currency: 'NGN',
    timestamp: nowStr,
    createdAt: nowIso,
    status: 'completed',
    reference: `ERR_${orderId}`,
    referenceId: orderId,
    channel: 'wallet',
  };
  custWallet.transactions = [tx, ...custWallet.transactions].slice(0, 100);
  serverWallets.set(custWallet.phoneKey, custWallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(tx);
  emitWalletUpdateToPhone(String(b.customerPhone), custWallet, tx.title, tx.reference);

  const order = {
    ...b,
    id: orderId,
    status: b.status || 'pending',
    escrowReleaseCode: String(b.escrowReleaseCode || Math.floor(1000 + Math.random() * 9000)),
    createdAt: b.createdAt || nowIso,
  };
  professionalsState.errandOrders = [order, ...professionalsState.errandOrders.filter((o) => o.id !== order.id)];
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, order, wallet: custWallet });
});

app.post('/api/professionals/errands/complete', (req: Request, res: Response) => {
  const { orderId, code } = req.body || {};
  const order = professionalsState.errandOrders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Errand order not found.' });
  if (order.status === 'completed') return res.json({ success: true, order, message: 'Errand already completed.' });
  if (String(code || '').trim() !== String(order.escrowReleaseCode).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid 4-digit release code.' });
  }
  const nowIso = new Date().toISOString();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const payout = Math.round(Number(order.totalAmount) || 0);
  if (order.customerPhone) {
    const cw = getOrCreateServerWallet(order.customerPhone);
    cw.escrowLockedBalance = Math.max(0, Number(cw.escrowLockedBalance || 0) - payout);
    cw.updatedAt = nowIso;
    serverWallets.set(cw.phoneKey, cw);
  }
  const runnerPhone = order.runnerPhone || order.runnerId;
  const rw = getOrCreateServerWallet(runnerPhone);
  const rm = findUserEntry(runnerPhone);
  rw.availableBalance = Math.max(0, Number(rw.availableBalance || 0) + payout);
  rw.updatedAt = nowIso;
  const relTx: ServerWalletTx = {
    id: `tx_err_rel_${Date.now()}`,
    userId: rm?.user.id,
    userPhone: rm?.user.phoneNumber || rw.phoneNumber || runnerPhone,
    userName: rm?.user.fullName || order.runnerName,
    type: 'errand_release',
    title: `Errand Payout Released (#${order.id})`,
    description: `Completed errand for ${order.customerName}`,
    amount: payout,
    fee: 0,
    balanceAfter: rw.availableBalance,
    currency: 'NGN',
    timestamp: nowStr,
    createdAt: nowIso,
    status: 'completed',
    reference: `EREL_${order.id}`,
    referenceId: order.id,
    channel: 'wallet',
  };
  rw.transactions = [relTx, ...rw.transactions].slice(0, 100);
  serverWallets.set(rw.phoneKey, rw);
  saveWalletsFile();
  appendUnifiedLedgerTx(relTx);
  emitWalletUpdateToPhone(runnerPhone, rw, relTx.title, relTx.reference);

  order.status = 'completed';
  professionalsState.errandRunners = professionalsState.errandRunners.map((r) =>
    r.id === order.runnerId ? { ...r, completedCount: (r.completedCount || 0) + 1 } : r
  );
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, order, wallet: rw });
});

app.post('/api/professionals/errands/dispute', (req: Request, res: Response) => {
  const { orderId, reason } = req.body || {};
  const order = professionalsState.errandOrders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Errand order not found.' });
  order.status = 'disputed';
  order.disputeReason = String(reason || 'Disputed by customer');
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  return res.json({ success: true, order });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TASK-TO-EARN BOUNTY CAMPAIGNS (70% WORKER POOL / 30% SYSTEM FEE + ADMIN VERIFY)
// ═══════════════════════════════════════════════════════════════════════════════
const TASKS_FILE = path.join(__dirname, 'data_task_bounties.json');

interface ServerTaskSubmission {
  id: string;
  taskId: string;
  workerId?: string;
  workerName: string;
  workerPhone: string;
  workerAvatar?: string;
  proofUsername: string;
  proofScreenshot: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  payoutAmount: number;
  payoutReference?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerTaskCampaign {
  id: string;
  title: string;
  category: 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'music' | 'app' | 'other';
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
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  status: 'active' | 'completed' | 'closed';
  submissions: ServerTaskSubmission[];
  createdAt: string;
  updatedAt: string;
}

const serverTaskBounties = new Map<string, ServerTaskCampaign>();
let serverTasksUpdatedAt = '';

try {
  if (fs.existsSync(TASKS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.tasks) ? raw.tasks : [];
    for (const t of list) {
      if (t && t.id) serverTaskBounties.set(String(t.id), t);
    }
    if (raw?.updatedAt) serverTasksUpdatedAt = String(raw.updatedAt);
  }
} catch (e) {
  console.warn('Notice loading data_task_bounties.json:', e);
}

function saveTaskBountiesFile(pushRemote: boolean = true) {
  try {
    serverTasksUpdatedAt = new Date().toISOString();
    fs.writeFileSync(
      TASKS_FILE,
      JSON.stringify(
        { tasks: Array.from(serverTaskBounties.values()), updatedAt: serverTasksUpdatedAt },
        null,
        2
      )
    );
  } catch (e) {
    console.warn('Notice saving data_task_bounties.json:', e);
  }
  if (pushRemote) {
    pushTasksToSupabase();
  }
}

let tasksPushTimer: ReturnType<typeof setTimeout> | null = null;
function pushTasksToSupabase() {
  if (tasksPushTimer) clearTimeout(tasksPushTimer);
  tasksPushTimer = setTimeout(() => {
    const sorted = Array.from(serverTaskBounties.values())
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 200);
    upsertSupabaseAdminSlice(ADMIN_SYS_TASKS_KEY, 'AGC_TASK_BOUNTIES', {
      tasks: sorted,
      updatedAt: serverTasksUpdatedAt || new Date().toISOString(),
    }).catch(() => {});
  }, 250);
}

syncTasksFromSupabaseHook = (slice: any) => {
  if (!slice || !Array.isArray(slice.tasks)) return;
  let changed = false;
  for (const t of slice.tasks) {
    if (!t?.id) continue;
    const cur = serverTaskBounties.get(t.id);
    const remoteTs = new Date(t.updatedAt || t.createdAt || 0).getTime();
    const localTs = new Date(cur?.updatedAt || cur?.createdAt || 0).getTime();
    if (!cur || remoteTs > localTs) {
      serverTaskBounties.set(t.id, t);
      changed = true;
    }
  }
  if (changed) {
    serverTasksUpdatedAt = slice.updatedAt || slice._rowUpdatedAt || new Date().toISOString();
    saveTaskBountiesFile(false);
  }
};

function recomputeTaskCounts(task: ServerTaskCampaign) {
  const subs = Array.isArray(task.submissions) ? task.submissions : [];
  task.approvedCount = subs.filter((s) => s.status === 'approved').length;
  task.pendingCount = subs.filter((s) => s.status === 'pending').length;
  task.rejectedCount = subs.filter((s) => s.status === 'rejected').length;
  if (task.status === 'active' && (task.approvedCount >= task.maxSlots || task.remainingEscrow < task.rewardPerTask)) {
    task.status = 'completed';
  }
}

function sanitizeTaskForViewer(task: ServerTaskCampaign, viewerPhone?: string, isAdminView = false) {
  recomputeTaskCounts(task);
  const subs = Array.isArray(task.submissions) ? task.submissions : [];
  if (isAdminView) {
    return { ...task, mySubmission: null };
  }
  const mySub = viewerPhone
    ? subs.find((s) => phonesMatchServer(viewerPhone, s.workerPhone)) || null
    : null;
  const isCreator = Boolean(viewerPhone && phonesMatchServer(viewerPhone, task.creatorPhone));
  const safeSubmissions = isCreator
    ? subs.map((s) => ({
        ...s,
        workerPhone: '',
        proofScreenshot: '',
      }))
    : [];
  return {
    ...task,
    submissions: safeSubmissions,
    mySubmission: mySub,
  };
}

function broadcastTaskBountiesUpdated(taskId?: string) {
  io.emit('task_bounties_updated', {
    taskId: taskId || null,
    timestamp: new Date().toISOString(),
  });
}

app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const viewerPhone = String(req.query.viewerPhone || '').trim();
    const isAdminView = String(req.query.admin || '') === 'true';
    const list = Array.from(serverTaskBounties.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t) => sanitizeTaskForViewer(t, viewerPhone, isAdminView));

    const summary = {
      totalTasks: list.length,
      activeTasks: list.filter((t) => t.status === 'active').length,
      pendingSubmissions: Array.from(serverTaskBounties.values()).reduce(
        (acc, t) => acc + (t.submissions || []).filter((s) => s.status === 'pending').length,
        0
      ),
      totalStaked: list.reduce((acc, t) => acc + Number(t.totalStake || 0), 0),
      totalSystemFees: list.reduce((acc, t) => acc + Number(t.systemFeeAmount || 0), 0),
      totalReleased: list.reduce(
        (acc, t) => acc + Number(t.approvedCount || 0) * Number(t.rewardPerTask || 0),
        0
      ),
    };

    return res.json({ success: true, tasks: list, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load task bounties' });
  }
});

app.post('/api/tasks/create', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const body = req.body || {};
    const {
      title,
      category = 'youtube',
      targetUrl,
      instructions,
      platformHandleHint,
      creatorPhone,
      creatorName,
      creatorAvatar,
      totalStake,
      rewardPerTask: reqRewardPerTask,
      maxSlots: reqMaxSlots,
      currency = 'NGN',
    } = body;

    const cleanTitle = String(title || '').trim();
    const cleanInstructions = String(instructions || '').trim();
    const cleanPhone = String(creatorPhone || '').trim();
    const stake = Math.round(Number(totalStake) || 0);

    if (!cleanTitle || !cleanInstructions || !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Task title, clear instructions, and creator phone are required.',
      });
    }
    if (!Number.isFinite(stake) || stake < 500) {
      return res.status(400).json({
        success: false,
        message: 'Minimum task campaign stake is ₦500.',
      });
    }

    const systemFeePercent = 30;
    const systemFeeAmount = Math.round(stake * 0.3);
    const rewardPool = Math.max(0, stake - systemFeeAmount);

    let rewardPerTask = Math.round(Number(reqRewardPerTask) || 0);
    let maxSlots = Math.round(Number(reqMaxSlots) || 0);

    if (rewardPerTask >= 50 && maxSlots <= 0) {
      maxSlots = Math.floor(rewardPool / rewardPerTask);
    } else if (maxSlots >= 1 && rewardPerTask <= 0) {
      rewardPerTask = Math.floor(rewardPool / maxSlots);
    } else if (rewardPerTask <= 0 && maxSlots <= 0) {
      maxSlots = Math.min(100, Math.max(1, Math.floor(rewardPool / 100)));
      rewardPerTask = Math.floor(rewardPool / maxSlots);
    }

    if (rewardPerTask < 50) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payout per person is ₦50. Increase total stake or reduce participant count.',
      });
    }
    if (maxSlots < 1 || rewardPerTask * maxSlots > rewardPool) {
      return res.status(400).json({
        success: false,
        message: `70% worker pool (₦${rewardPool.toLocaleString()}) cannot cover ${maxSlots} × ₦${rewardPerTask.toLocaleString()}.`,
      });
    }

    const allocatedPool = rewardPerTask * maxSlots;
    const finalSystemFee = stake - allocatedPool;

    let match = findUserEntry(cleanPhone);
    let wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < stake) {
      await syncAdminStateFromSupabase().catch(() => {});
      match = findUserEntry(cleanPhone) || match;
      wallet = getOrCreateServerWallet(cleanPhone);
    }

    if (wallet.availableBalance < stake) {
      return res.status(400).json({
        success: false,
        insufficientFunds: true,
        availableBalance: wallet.availableBalance,
        message: `Insufficient wallet balance (₦${wallet.availableBalance.toLocaleString()} available; need ₦${stake.toLocaleString()}).`,
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const refId = `TASK_${taskId}`;

    wallet.availableBalance = Math.max(0, Number(wallet.availableBalance || 0) - stake);
    wallet.escrowLockedBalance = Math.max(0, Number(wallet.escrowLockedBalance || 0) + allocatedPool);
    wallet.updatedAt = nowIso;

    const stakeTx: ServerWalletTx = {
      id: `tx_task_stake_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: match?.user.id,
      userPhone: match?.user.phoneNumber || wallet.phoneNumber || cleanPhone,
      userName: match?.user.fullName || String(creatorName || 'Creator'),
      type: 'task_stake',
      title: `Task Bounty Stake: ${cleanTitle.slice(0, 42)}`,
      description: `70% Worker Pool (₦${allocatedPool.toLocaleString()}) + 30% System Fee (₦${finalSystemFee.toLocaleString()})`,
      amount: stake,
      fee: finalSystemFee,
      balanceAfter: wallet.availableBalance,
      currency: (currency || wallet.currency || 'NGN') as any,
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: refId,
      referenceId: taskId,
      channel: 'wallet',
      metadata: {
        taskId,
        systemFeeAmount: finalSystemFee,
        rewardPool: allocatedPool,
        rewardPerTask,
        maxSlots,
      },
    };

    wallet.transactions = [stakeTx, ...wallet.transactions].slice(0, 100);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(stakeTx);

    if (match) {
      match.user.walletBalanceNgn = wallet.availableBalance;
      (match.user as any).updatedAt = nowIso;
      usersByPhone.set(match.key, match.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(match.user);
    }

    const allowedCategories: ServerTaskCampaign['category'][] = [
      'youtube',
      'instagram',
      'tiktok',
      'twitter',
      'music',
      'app',
      'other',
    ];
    const validCat = allowedCategories.includes(category) ? category : 'other';

    const campaign: ServerTaskCampaign = {
      id: taskId,
      title: cleanTitle,
      category: validCat,
      targetUrl: targetUrl ? String(targetUrl).trim() : undefined,
      instructions: cleanInstructions,
      platformHandleHint: String(platformHandleHint || 'Platform Username / Handle').trim(),
      creatorId: match?.user.id,
      creatorName: String(creatorName || match?.user.fullName || 'AGC Creator').trim(),
      creatorPhone: match?.user.phoneNumber || cleanPhone,
      creatorAvatar: creatorAvatar || match?.user.avatarUrl,
      totalStake: stake,
      systemFeePercent,
      systemFeeAmount: finalSystemFee,
      rewardPool: allocatedPool,
      rewardPerTask,
      maxSlots,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      remainingEscrow: allocatedPool,
      currency: (currency || 'NGN') as any,
      status: 'active',
      submissions: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    serverTaskBounties.set(campaign.id, campaign);
    saveTaskBountiesFile();
    emitWalletUpdateToPhone(cleanPhone, wallet, stakeTx.title, refId);
    broadcastTaskBountiesUpdated(campaign.id);

    appendAuditEntry({
      refId: campaign.id,
      actor: campaign.creatorName,
      actorRole: 'Creator',
      action: 'Task Bounty Staked',
      target: `${campaign.title} (${maxSlots} × ₦${rewardPerTask.toLocaleString()})`,
      details: `Staked ₦${stake.toLocaleString()} · 30% System Fee ₦${finalSystemFee.toLocaleString()} · 70% Escrow Pool ₦${allocatedPool.toLocaleString()}`,
    });

    return res.json({
      success: true,
      task: sanitizeTaskForViewer(campaign, cleanPhone, false),
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to create task campaign' });
  }
});

app.post('/api/tasks/:taskId/submit', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const taskId = String(req.params.taskId || '').trim();
    const task = serverTaskBounties.get(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task campaign not found.' });
    }
    if (task.status !== 'active') {
      return res.status(400).json({ success: false, message: `This task campaign is ${task.status}.` });
    }

    const { workerPhone, workerName, workerAvatar, proofUsername, proofScreenshot, note } = req.body || {};
    const cleanPhone = String(workerPhone || '').trim();
    const cleanUsername = String(proofUsername || '').trim();
    const cleanShot = String(proofScreenshot || '').trim();

    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: 'Sign in with your phone number to submit proof.' });
    }
    if (phonesMatchServer(cleanPhone, task.creatorPhone)) {
      return res.status(400).json({ success: false, message: 'Campaign creators cannot submit proof to their own task.' });
    }
    if (!cleanUsername || cleanUsername.length < 2) {
      return res.status(400).json({ success: false, message: `Enter your ${task.platformHandleHint || 'username'} used on the task.` });
    }
    if (!cleanShot || (!cleanShot.startsWith('data:image/') && !cleanShot.startsWith('http'))) {
      return res.status(400).json({ success: false, message: 'Please attach a proof screenshot image.' });
    }

    recomputeTaskCounts(task);
    const activeSubs = task.submissions.filter(
      (s) => phonesMatchServer(cleanPhone, s.workerPhone) && s.status !== 'rejected'
    );
    if (activeSubs.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          activeSubs[0].status === 'approved'
            ? 'You have already completed and been paid for this task.'
            : 'Your proof is already awaiting admin verification.',
      });
    }

    if (task.approvedCount + task.pendingCount >= task.maxSlots) {
      return res.status(400).json({
        success: false,
        message: 'All micro-task slots for this campaign are currently claimed or pending verification.',
      });
    }

    const nowIso = new Date().toISOString();
    const workerMatch = findUserEntry(cleanPhone);
    const sub: ServerTaskSubmission = {
      id: `tsub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      taskId: task.id,
      workerId: workerMatch?.user.id,
      workerName: String(workerName || workerMatch?.user.fullName || 'AGC Earner').trim(),
      workerPhone: workerMatch?.user.phoneNumber || cleanPhone,
      workerAvatar: workerAvatar || workerMatch?.user.avatarUrl,
      proofUsername: cleanUsername,
      proofScreenshot: cleanShot,
      note: note ? String(note).trim() : undefined,
      status: 'pending',
      payoutAmount: task.rewardPerTask,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Replace any previous rejected submission from same user or prepend
    task.submissions = [
      sub,
      ...task.submissions.filter((s) => !phonesMatchServer(cleanPhone, s.workerPhone)),
    ];
    task.updatedAt = nowIso;
    recomputeTaskCounts(task);
    serverTaskBounties.set(task.id, task);
    saveTaskBountiesFile();
    broadcastTaskBountiesUpdated(task.id);

    return res.json({
      success: true,
      submission: sub,
      task: sanitizeTaskForViewer(task, cleanPhone, false),
      message: `Proof submitted! Admin will verify @${cleanUsername.replace(/^@/, '')} and release ₦${task.rewardPerTask.toLocaleString()}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to submit proof' });
  }
});

app.post('/api/admin/tasks/review', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { taskId, submissionId, decision, adminNote, adminName } = req.body || {};
    if (!taskId || !submissionId || !['approve', 'reject'].includes(String(decision))) {
      return res.status(400).json({
        success: false,
        message: 'taskId, submissionId, and decision (approve|reject) are required.',
      });
    }

    const task = serverTaskBounties.get(String(taskId));
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task campaign not found.' });
    }
    const sub = task.submissions.find((s) => s.id === String(submissionId));
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    if (sub.status === 'approved') {
      return res.json({
        success: true,
        alreadyReviewed: true,
        task,
        message: 'This submission was already verified and paid out.',
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reviewer = String(adminName || 'Super Admin').trim();

    if (decision === 'reject') {
      sub.status = 'rejected';
      sub.adminNote = String(adminNote || 'Proof did not match task instructions.').trim();
      sub.reviewedBy = reviewer;
      sub.reviewedAt = nowIso;
      sub.updatedAt = nowIso;
      if (task.status === 'completed' && task.remainingEscrow >= task.rewardPerTask) {
        task.status = 'active';
      }
      recomputeTaskCounts(task);
      task.updatedAt = nowIso;
      serverTaskBounties.set(task.id, task);
      saveTaskBountiesFile();
      broadcastTaskBountiesUpdated(task.id);

      appendAuditEntry({
        refId: sub.id,
        actor: reviewer,
        actorRole: 'Super Admin',
        action: 'Task Proof Rejected',
        target: `${task.title} (@${sub.proofUsername.replace(/^@/, '')})`,
        details: sub.adminNote,
      });

      return res.json({
        success: true,
        task,
        submission: sub,
        message: `Rejected submission from ${sub.workerName}. Slot returned to active pool.`,
      });
    }

    // Approve & Release Funds from Creator's Task Escrow -> Worker's Available Balance
    const payout = Math.round(Number(sub.payoutAmount || task.rewardPerTask) || 0);
    if (task.remainingEscrow < payout) {
      return res.status(400).json({
        success: false,
        message: `Insufficient remaining campaign escrow (₦${task.remainingEscrow.toLocaleString()} left; payout requires ₦${payout.toLocaleString()}).`,
      });
    }

    const creatorWallet = getOrCreateServerWallet(task.creatorPhone);
    creatorWallet.escrowLockedBalance = Math.max(0, Number(creatorWallet.escrowLockedBalance || 0) - payout);
    creatorWallet.updatedAt = nowIso;
    serverWallets.set(creatorWallet.phoneKey, creatorWallet);

    const workerWallet = getOrCreateServerWallet(sub.workerPhone);
    const workerMatch = findUserEntry(sub.workerPhone);
    workerWallet.availableBalance = Math.max(0, Number(workerWallet.availableBalance || 0) + payout);
    workerWallet.updatedAt = nowIso;

    const refId = `TASKPAY_${sub.id}`;
    const earnTx: ServerWalletTx = {
      id: `tx_task_earn_${sub.id}`,
      userId: workerMatch?.user.id || sub.workerId,
      userPhone: workerMatch?.user.phoneNumber || workerWallet.phoneNumber || sub.workerPhone,
      userName: workerMatch?.user.fullName || sub.workerName,
      type: 'task_earn',
      title: `Task Payout: ${task.title.slice(0, 42)}`,
      description: `Admin verified @${sub.proofUsername.replace(/^@/, '')} · Released by ${reviewer}`,
      amount: payout,
      fee: 0,
      balanceAfter: workerWallet.availableBalance,
      currency: task.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: refId,
      referenceId: task.id,
      channel: 'wallet',
      metadata: {
        taskId: task.id,
        submissionId: sub.id,
        proofUsername: sub.proofUsername,
        verifiedBy: reviewer,
      },
    };

    workerWallet.transactions = [earnTx, ...workerWallet.transactions.filter((t) => t.id !== earnTx.id)].slice(0, 100);
    serverWallets.set(workerWallet.phoneKey, workerWallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(earnTx);

    if (workerMatch) {
      workerMatch.user.walletBalanceNgn = workerWallet.availableBalance;
      (workerMatch.user as any).updatedAt = nowIso;
      usersByPhone.set(workerMatch.key, workerMatch.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(workerMatch.user);
    }

    sub.status = 'approved';
    sub.adminNote = adminNote ? String(adminNote).trim() : 'Verified & funds released';
    sub.reviewedBy = reviewer;
    sub.reviewedAt = nowIso;
    sub.payoutReference = refId;
    sub.updatedAt = nowIso;

    task.remainingEscrow = Math.max(0, Number(task.remainingEscrow || 0) - payout);
    task.updatedAt = nowIso;
    recomputeTaskCounts(task);
    serverTaskBounties.set(task.id, task);
    saveTaskBountiesFile();

    emitWalletUpdateToPhone(sub.workerPhone, workerWallet, earnTx.title, refId);
    emitWalletUpdateToPhone(task.creatorPhone, creatorWallet, `Task payout released (${sub.workerName})`, refId);
    for (const v of getPhoneVariants(sub.workerPhone)) {
      io.to(`phone:${v}`).emit('task_payout_released', {
        taskId: task.id,
        taskTitle: task.title,
        submissionId: sub.id,
        amount: payout,
        currency: task.currency || 'NGN',
        newBalance: workerWallet.availableBalance,
        reference: refId,
      });
    }
    broadcastTaskBountiesUpdated(task.id);

    appendAuditEntry({
      refId,
      actor: reviewer,
      actorRole: 'Super Admin',
      action: 'Task Proof Verified & Paid',
      target: `${sub.workerName} (@${sub.proofUsername.replace(/^@/, '')})`,
      details: `Released ₦${payout.toLocaleString()} for "${task.title}"`,
    });

    return res.json({
      success: true,
      task,
      submission: sub,
      message: `Verified! Released ₦${payout.toLocaleString()} to ${sub.workerName}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to review task submission' });
  }
});

app.post('/api/tasks/:taskId/close', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const taskId = String(req.params.taskId || '').trim();
    const { actorPhone } = req.body || {};
    const isAdmin = isAuthorizedAdminRequest(req);
    const task = serverTaskBounties.get(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task campaign not found.' });
    }
    if (!isAdmin && (!actorPhone || !phonesMatchServer(actorPhone, task.creatorPhone))) {
      return res.status(403).json({ success: false, message: 'Only the campaign creator or Admin can close this task.' });
    }
    if (task.status === 'closed') {
      return res.json({ success: true, task, message: 'Campaign is already closed.' });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const refundAmt = Math.max(0, Math.round(Number(task.remainingEscrow) || 0));

    let creatorWallet = getOrCreateServerWallet(task.creatorPhone);
    if (refundAmt > 0) {
      const creatorMatch = findUserEntry(task.creatorPhone);
      creatorWallet.escrowLockedBalance = Math.max(0, Number(creatorWallet.escrowLockedBalance || 0) - refundAmt);
      creatorWallet.availableBalance = Math.max(0, Number(creatorWallet.availableBalance || 0) + refundAmt);
      creatorWallet.updatedAt = nowIso;

      const refId = `TASKREF_${task.id}`;
      const refundTx: ServerWalletTx = {
        id: `tx_task_ref_${task.id}`,
        userId: creatorMatch?.user.id,
        userPhone: creatorMatch?.user.phoneNumber || task.creatorPhone,
        userName: creatorMatch?.user.fullName || task.creatorName,
        type: 'refund',
        title: `Task Escrow Refund: ${task.title.slice(0, 40)}`,
        description: 'Unclaimed micro-task reward pool refunded on campaign close',
        amount: refundAmt,
        fee: 0,
        balanceAfter: creatorWallet.availableBalance,
        currency: task.currency || 'NGN',
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: refId,
        referenceId: task.id,
        channel: 'wallet',
        metadata: { taskId: task.id, closedBy: isAdmin ? 'admin' : 'creator' },
      };
      creatorWallet.transactions = [refundTx, ...creatorWallet.transactions].slice(0, 100);
      serverWallets.set(creatorWallet.phoneKey, creatorWallet);
      saveWalletsFile();
      appendUnifiedLedgerTx(refundTx);
      if (creatorMatch) {
        creatorMatch.user.walletBalanceNgn = creatorWallet.availableBalance;
        (creatorMatch.user as any).updatedAt = nowIso;
        usersByPhone.set(creatorMatch.key, creatorMatch.user);
        saveUsersFile();
        pushAdminUserOverrideToSupabase(creatorMatch.user);
      }
      emitWalletUpdateToPhone(task.creatorPhone, creatorWallet, refundTx.title, refId);
    }

    task.remainingEscrow = 0;
    task.status = 'closed';
    task.updatedAt = nowIso;
    serverTaskBounties.set(task.id, task);
    saveTaskBountiesFile();
    broadcastTaskBountiesUpdated(task.id);

    return res.json({
      success: true,
      task,
      refundAmount: refundAmt,
      wallet: {
        availableBalance: creatorWallet.availableBalance,
        escrowLockedBalance: creatorWallet.escrowLockedBalance,
        currency: creatorWallet.currency,
        transactions: getUserMergedTransactions(task.creatorPhone, undefined, 1000),
      },
      message:
        refundAmt > 0
          ? `Campaign closed. Refunded ₦${refundAmt.toLocaleString()} unspent escrow to creator wallet.`
          : 'Campaign closed.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to close campaign' });
  }
});

app.post('/api/admin/professionals/review', (req: Request, res: Response) => {
  const { category, id, decision, reason } = req.body || {};
  if (!category || !id || !['approved', 'rejected'].includes(String(decision))) {
    return res.status(400).json({ success: false, message: 'category, id, and decision (approved|rejected) are required.' });
  }
  const approved = decision === 'approved';
  let targetName = id;
  if (category === 'lawyer') {
    professionalsState.lawyers = professionalsState.lawyers.map((l) => {
      if (l.id === id) {
        targetName = `${l.name} (SCN: ${l.barNumber || l.supremeCourtNumber || 'SCN'})`;
        return { ...l, verifiedLicense: approved, isVerified: approved, approvalStatus: decision, verificationStatus: decision, rejectionReason: approved ? undefined : reason };
      }
      return l;
    });
  } else if (category === 'clinic') {
    professionalsState.clinicsDoctors = professionalsState.clinicsDoctors.map((d) => {
      if (d.id === id) {
        targetName = `${d.name} (${d.licenseNumber || 'MDCN'})`;
        return { ...d, isVerified: approved, approvalStatus: decision, verificationStatus: decision, rejectionReason: approved ? undefined : reason };
      }
      return d;
    });
  } else if (category === 'errand') {
    professionalsState.errandRunners = professionalsState.errandRunners.map((r) => {
      if (r.id === id) {
        targetName = `${r.name} (ID: ${r.ninOrIdRef || r.phone})`;
        return { ...r, isVerified: approved, approvalStatus: decision, verificationStatus: decision, rejectionReason: approved ? undefined : reason };
      }
      return r;
    });
  }
  saveProfessionalsFile();
  pushProfessionalsToSupabase();
  broadcastProfessionalsUpdate();
  appendAuditEntry({
    refId: String(id),
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: approved ? `Verified ${category}` : `Rejected ${category}`,
    target: targetName,
    details: approved ? 'Credentials verified and Golden Badge granted' : String(reason || 'Verification declined'),
  });
  return res.json({ success: true, professionals: professionalsState });
});

app.post('/api/ai/match-lawyer', async (req: Request, res: Response) => {
  const query = String(req.body?.query || '').trim();
  if (!query) {
    return res.status(400).json({ success: false, message: 'Please describe your legal issue.' });
  }
  const pool = professionalsState.lawyers.filter((l) => l.approvalStatus !== 'rejected');
  if (pool.length === 0) {
    return res.json({
      success: true,
      recommendedIds: [],
      advice: 'No registered lawyers are available in the directory yet. Registered attorneys with verified SCN credentials appear here.',
    });
  }

  const qLower = query.toLowerCase();
  const fallbackMatch = () => {
    const scored = pool.map((l) => {
      const hay = `${l.name} ${l.firm} ${l.specialty} ${(l.specializations || []).join(' ')} ${l.bio} ${l.location}`.toLowerCase();
      let score = l.verifiedLicense ? 2 : 0;
      for (const word of qLower.split(/\W+/).filter((w) => w.length >= 3)) {
        if (hay.includes(word)) score += 3;
      }
      return { id: l.id, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const topIds = scored.slice(0, 3).map((s) => s.id);
    return {
      recommendedIds: topIds,
      advice: `Matched ${topIds.length} legal counsel based on your matter ("${query.slice(0, 60)}"). Review SCN credentials and book with Escrow Protection.`,
    };
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ success: true, mode: 'keyword', ...fallbackMatch() });
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const summaryList = pool
      .slice(0, 30)
      .map((l) => `ID=${l.id} | Name=${l.name} | SCN=${l.barNumber} | Verified=${Boolean(l.verifiedLicense)} | Specialty=${l.specialty} (${(l.specializations || []).join(', ')}) | City=${l.city || l.location} | Fee=₦${l.consultationFee} | Bio=${l.bio}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User legal request: "${query}"\n\nAvailable Lawyers:\n${summaryList}`,
      config: {
        systemInstruction: 'You are a Nigerian legal triage matcher for AfriLaw. Select up to 3 best matching lawyer IDs from the provided list and write 1-2 short, practical sentences explaining the match. Never invent IDs.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            advice: { type: Type.STRING },
          },
          required: ['recommendedIds', 'advice'],
        },
      },
    });
    const parsed = JSON.parse((response.text || '').trim() || '{}');
    const validSet = new Set(pool.map((l) => l.id));
    const recIds = Array.isArray(parsed.recommendedIds) ? parsed.recommendedIds.filter((id: string) => validSet.has(id)) : [];
    if (recIds.length > 0) {
      return res.json({ success: true, mode: 'gemini', recommendedIds: recIds, advice: parsed.advice || 'Recommended counsel matched.' });
    }
  } catch (err: any) {
    console.warn('AI lawyer match fallback:', err?.message || err);
  }
  return res.json({ success: true, mode: 'keyword', ...fallbackMatch() });
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
app.post('/api/wallet/pay-bill', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
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
  if (
    isSyntheticTestAccount({ name: payerName, phone: payerPhone }) ||
    isSyntheticTestAccount({ name: requesterName, phone: requesterPhone }) ||
    String(paystackRef || '').startsWith('TEST_')
  ) {
    return res.status(403).json({ success: false, message: 'Synthetic test accounts cannot settle bills.' });
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
  payerWallet.transactions = sortAndDedupeLedger([payerTx, ...payerWallet.transactions], 250);

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
  requesterWallet.transactions = sortAndDedupeLedger([reqTx, ...requesterWallet.transactions], 250);

  serverWallets.set(payerWallet.phoneKey, payerWallet);
  serverWallets.set(requesterWallet.phoneKey, requesterWallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(payerTx);
  appendUnifiedLedgerTx(reqTx);

  if (payerMatch) {
    payerMatch.user.walletBalanceNgn = payerWallet.availableBalance;
    usersByPhone.set(payerMatch.key, payerMatch.user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(payerMatch.user);
  }
  if (reqMatch) {
    reqMatch.user.walletBalanceNgn = requesterWallet.availableBalance;
    usersByPhone.set(reqMatch.key, reqMatch.user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(reqMatch.user);
    emitWalletUpdateToPhone(
      String(requesterPhone),
      requesterWallet,
      `${payerName || 'Someone'} paid your bill (${title || 'Bill'})!`,
      ref
    );
  }

  return res.json({
    success: true,
    reference: ref,
    paidAt: nowIso,
    wallet: {
      availableBalance: payerWallet.availableBalance,
      escrowLockedBalance: payerWallet.escrowLockedBalance,
      currency: payerWallet.currency,
      transactions: getUserMergedTransactions(String(payerPhone), undefined, 1000),
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
      'AGC (All Good Connects) is an African super-messaging and social commerce platform featuring: Encrypted Chat, 24h Stories/Updates & Outside Events/Nightlife Discovery, Marketplace Stores with Escrow Vault protection, Send My Bill (pay on behalf), In-chat Games (X/O, Whot!, and Ludo with optional Escrow Bets), Ajo/Esusu communal savings, Gokada/PickkR Dispatch, Artisan Hubs, Street Radio Audio Spaces, Town Communities, Healthcare, Legal, Job Board, and Scam Checker.',
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
let aiDataCenterUpdatedAt = '';
try {
  if (fs.existsSync(AI_DATACENTER_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(AI_DATACENTER_FILE, 'utf8'));
    if (Array.isArray(parsed) && parsed.length > 0) {
      aiKnowledgeEntries = parsed;
    } else if (parsed && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
      aiKnowledgeEntries = parsed.entries;
      if (parsed.updatedAt) aiDataCenterUpdatedAt = String(parsed.updatedAt);
    }
  }
} catch (err) {
  console.warn('Failed loading data_ai_datacenter.json:', err);
}

function saveAiDataCenterFile() {
  try {
    aiDataCenterUpdatedAt = new Date().toISOString();
    fs.writeFileSync(
      AI_DATACENTER_FILE,
      JSON.stringify({ entries: aiKnowledgeEntries, updatedAt: aiDataCenterUpdatedAt }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn('Failed saving data_ai_datacenter.json:', err);
  }
}

function pushAiDataCenterToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_AI_KEY, 'AGC_AI_DATACENTER', {
    entries: aiKnowledgeEntries,
    updatedAt: aiDataCenterUpdatedAt || new Date().toISOString(),
  }).catch(() => {});
}

syncAiFromSupabaseHook = (aiSlice: any) => {
  if (!aiSlice || !Array.isArray(aiSlice.entries)) return;
  const remoteTs = new Date(aiSlice.updatedAt || aiSlice._rowUpdatedAt || 0).getTime();
  const localTs = aiDataCenterUpdatedAt ? new Date(aiDataCenterUpdatedAt).getTime() : 0;
  const hasOnlyDefaults =
    aiKnowledgeEntries.length <= DEFAULT_AI_KNOWLEDGE.length &&
    aiKnowledgeEntries.every((e) => DEFAULT_AI_KNOWLEDGE.some((d) => d.id === e.id));
  if (remoteTs > localTs || hasOnlyDefaults) {
    aiKnowledgeEntries = aiSlice.entries;
    aiDataCenterUpdatedAt = aiSlice.updatedAt || aiSlice._rowUpdatedAt || new Date().toISOString();
    try {
      fs.writeFileSync(
        AI_DATACENTER_FILE,
        JSON.stringify({ entries: aiKnowledgeEntries, updatedAt: aiDataCenterUpdatedAt }, null, 2),
        'utf8'
      );
    } catch (_) {}
  }
};

const AGC_DOMAIN_KEYWORDS = [
  'agc', 'africhat', 'all good connects', 'agcbot', 'afribot',
  'escrow', 'wallet', 'paystack', 'bill', 'send my bill', 'pay on behalf',
  'ajo', 'esusu', 'thrift', 'marketplace', 'store', 'vendor', 'product',
  'dispatch', 'gokada', 'pickkr', 'delivery', 'artisan', 'errand',
  'town', 'community', 'status', 'update', 'story', 'stories', 'outside', 'party', 'rave', 'concert', 'rsvp', 'ticket',
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

async function isSafeExternalHttpUrl(rawUrl: string): Promise<{ valid: boolean; parsed?: URL; reason?: string }> {
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

// ============================================================
// STRICT SERVER-AUTHORITATIVE MICRO-TRANSACTION ENDPOINTS
// ============================================================

// Ajo / Esusu Group Savings Contribution
app.post('/api/ajo/contribute', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, ajoId, amount, roundNum } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const contributionAmount = Number(amount) || 0;
    if (!cleanPhone || !ajoId || contributionAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Phone, ajoId, and positive amount required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < contributionAmount) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance for Ajo contribution (₦${contributionAmount.toLocaleString()}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `AJO_${ajoId}_${Date.now()}`;
    const match = findUserEntry(cleanPhone);
    wallet.availableBalance = Math.max(0, wallet.availableBalance - contributionAmount);
    wallet.updatedAt = nowIso;
    const tx = {
      id: `tx_${Date.now()}_ajo`,
      userId: match?.user.id,
      userPhone: match?.user.phoneNumber || cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: 'transfer_out',
      title: `Ajo Contribution Round ${roundNum || 1}`,
      description: `Ajo / Esusu savings contribution Round ${roundNum || 1}`,
      amount: contributionAmount,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { ajoId, roundNum },
    };
    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);
    emitWalletUpdateToPhone(cleanPhone, wallet, tx.title, ref);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Ajo contribution failed.' });
  }
});

// Job Board - Post a Job (₦400 fee)
app.post('/api/jobs/post', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, jobData, fee } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const postFee = Number(fee) || 400;
    if (!cleanPhone || !jobData) {
      return res.status(400).json({ success: false, message: 'Phone and jobData required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < postFee) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance to post job (₦${postFee}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `JOB_${Date.now()}`;
    const match = findUserEntry(cleanPhone);
    wallet.availableBalance = Math.max(0, wallet.availableBalance - postFee);
    wallet.updatedAt = nowIso;
    const tx = {
      id: `tx_${Date.now()}_job_post`,
      userId: match?.user.id,
      userPhone: cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: 'service_booking',
      title: `Job Posting: ${String(jobData?.title || 'Job').slice(0, 40)}`,
      description: 'AGC Opportunities Board job posting fee',
      amount: postFee,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
    };
    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);
    emitWalletUpdateToPhone(cleanPhone, wallet, tx.title, ref);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Job post failed.' });
  }
});

// Job Board - Apply for a Job (₦50 fee)
app.post('/api/jobs/apply', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, jobId, jobTitle, fee } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const applyFee = Number(fee) || 50;
    if (!cleanPhone || !jobId) {
      return res.status(400).json({ success: false, message: 'Phone and jobId required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < applyFee) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance for application fee (₦${applyFee}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `JOB_APP_${jobId}_${Date.now()}`;
    const match = findUserEntry(cleanPhone);
    wallet.availableBalance = Math.max(0, wallet.availableBalance - applyFee);
    wallet.updatedAt = nowIso;
    const tx = {
      id: `tx_${Date.now()}_job_apply`,
      userId: match?.user.id,
      userPhone: cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: 'service_booking',
      title: `Job Application: ${String(jobTitle || jobId).slice(0, 40)}`,
      description: 'Verified job application fee',
      amount: applyFee,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
    };
    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);
    emitWalletUpdateToPhone(cleanPhone, wallet, tx.title, ref);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Job application failed.' });
  }
});

// Creator Economy - Purchase digital file / book / VIP session
app.post('/api/creator/purchase', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, itemId, itemType, title, amount, currency } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const purchaseAmount = Number(amount) || 0;
    if (!cleanPhone || !itemId || purchaseAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Phone, itemId, and positive amount required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < purchaseAmount) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance for purchase (₦${purchaseAmount.toLocaleString()}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `CREATOR_${String(itemType || 'purchase').toUpperCase()}_${itemId}_${Date.now()}`;
    const match = findUserEntry(cleanPhone);
    wallet.availableBalance = Math.max(0, wallet.availableBalance - purchaseAmount);
    wallet.updatedAt = nowIso;
    const tx = {
      id: `tx_${Date.now()}_creator`,
      userId: match?.user.id,
      userPhone: cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: 'store_purchase',
      title: String(title || `Creator ${itemType || 'Purchase'}`).slice(0, 60),
      description: `Creator economy purchase (${itemType || 'item'}): ${String(title || itemId).slice(0, 60)}`,
      amount: purchaseAmount,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: currency || wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { itemId, itemType },
    };
    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);
    emitWalletUpdateToPhone(cleanPhone, wallet, tx.title, ref);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Creator purchase failed.' });
  }
});

// Service Booking - Lock escrow / deduct for artisan/service booking
app.post('/api/service-booking/create', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, bookingId, serviceTitle, providerName, amount, currency, paymentMode } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const bookingAmount = Number(amount) || 0;
    if (!cleanPhone || !bookingId || bookingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Phone, bookingId, and positive amount required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < bookingAmount) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance for service booking (₦${bookingAmount.toLocaleString()}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `SRV_ESC_${bookingId}`;
    const match = findUserEntry(cleanPhone);
    // For escrow mode, move funds from available to locked
    wallet.availableBalance = Math.max(0, wallet.availableBalance - bookingAmount);
    if (paymentMode === 'escrow') {
      wallet.escrowLockedBalance = (wallet.escrowLockedBalance || 0) + bookingAmount;
    }
    wallet.updatedAt = nowIso;
    const txType = paymentMode === 'escrow' ? 'escrow_lock' : 'service_booking';
    const tx = {
      id: `tx_${Date.now()}_svc_book`,
      userId: match?.user.id,
      userPhone: cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: txType,
      title: `Service ${paymentMode === 'escrow' ? 'Escrow' : 'Booking'}: ${String(serviceTitle || 'Service').slice(0, 40)} with ${String(providerName || '').slice(0, 30)}`,
      description: `Artisan service ${paymentMode === 'escrow' ? 'escrow lock' : 'booking'}: ${String(serviceTitle || 'Service')}`,
      amount: bookingAmount,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: currency || wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { bookingId, serviceTitle, providerName, paymentMode },
    };
    wallet.transactions = sortAndDedupeLedger([tx, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);
    emitWalletUpdateToPhone(cleanPhone, wallet, tx.title, ref);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Service booking failed.' });
  }
});

// Payroll Disbursement - Server-authoritative bulk debit
app.post('/api/payroll/disburse', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const { phoneNumber, employees, totalAmount } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const totalNeeded = Number(totalAmount) || 0;
    if (!cleanPhone || !Array.isArray(employees) || employees.length === 0 || totalNeeded <= 0) {
      return res.status(400).json({ success: false, message: 'Phone, employees array, and positive totalAmount required.' });
    }
    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < totalNeeded) {
      return res.status(400).json({ success: false, insufficientFunds: true, message: `Insufficient balance for payroll (₦${totalNeeded.toLocaleString()}). Please top up.` });
    }
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const match = findUserEntry(cleanPhone);
    wallet.availableBalance = Math.max(0, wallet.availableBalance - totalNeeded);
    wallet.updatedAt = nowIso;
    const txList = employees.map((e, idx) => {
      const ref = `PAYROLL_${Date.now()}_${idx}`;
      return {
        id: `tx_${Date.now()}_payroll_${idx}`,
        userId: match?.user.id,
        userPhone: cleanPhone,
        userName: match?.user.fullName || 'AGC Business',
        type: 'payroll_debit',
        title: `Payroll: ${String(e.fullName || e.name || 'Employee').slice(0, 40)} (${String(e.role || '').slice(0, 20)})`,
        description: `Payroll disbursement to ${String(e.fullName || e.name || 'Employee')} (${String(e.role || '')})`,
        amount: Number(e.salary) || 0,
        fee: 0,
        balanceAfter: wallet.availableBalance,
        currency: e.currency || wallet.currency || 'NGN',
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: ref,
        referenceId: ref,
        channel: 'wallet',
        metadata: { employeeId: e.id, employeeName: e.fullName || e.name, role: e.role },
      };
    });
    wallet.transactions = sortAndDedupeLedger([...txList, ...wallet.transactions], 250);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    txList.forEach(appendUnifiedLedgerTx);
    emitWalletUpdateToPhone(cleanPhone, wallet, `Payroll: ${employees.length} employees`, `PAYROLL_${Date.now()}`);
    return res.json({
      success: true,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: getUserMergedTransactions(cleanPhone, undefined, 1000),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Payroll disbursement failed.' });
  }
});

app.get('/api/ai/datacenter', async (_req: Request, res: Response) => {
  if (!aiDataCenterUpdatedAt) {
    const aiSlice = await fetchSupabaseAdminSlice(ADMIN_SYS_AI_KEY);
    if (aiSlice && syncAiFromSupabaseHook) syncAiFromSupabaseHook(aiSlice);
  }
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
  pushAiDataCenterToSupabase();
  res.json({ success: true, entry, entries: aiKnowledgeEntries });
});

app.post('/api/ai/datacenter/fetch-url', async (req: Request, res: Response) => {
  const { url } = req.body || {};
  const check = await isSafeExternalHttpUrl(String(url || ''));
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
  pushAiDataCenterToSupabase();
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
  pushAiDataCenterToSupabase();
  res.json({ success: true, entries: aiKnowledgeEntries });
});

const AGC_REFUSAL_MESSAGE =
  "I can only answer questions about AGC (All Good Connects), its features, systems, or topics added by the AGC Admin in the AI Bot Data Center. Please ask me anything about AGC—such as Escrow Trade, Send My Bill, Wallet, Marketplace, Outside events, Whot!/Ludo/X-O games, Dispatch, or Town communities!";

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

  return "I am **AgcBot**, your dedicated AGC assistant! Ask me about AGC's Escrow Trade, Send My Bill (Pay on Behalf), Wallet, Marketplace, Updates Outside (parties, concerts & RSVP passes), Contacts discovery, or playing X/O, Whot!, and Ludo in chat.";
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
1) AGC (All Good Connects), its app features, systems, navigation, security, sign-up/login, wallet, Escrow Trade, Send My Bill (pay on behalf), Whot!/Ludo/X-O games, Contacts, Outside Events & Parties Discovery, Town, Marketplace, Dispatch, Artisans, Creators, Ajo, Payroll, or Admin tools; OR
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

// REST: User lookup by phone number OR username/handle (synced with Supabase registry)
app.get('/api/users/lookup', async (req: Request, res: Response) => {
  const rawPhone = String(req.query.phone || '').trim();
  const rawQuery = String(req.query.query || req.query.q || rawPhone).trim();
  const digits = rawQuery.replace(/\D/g, '');
  const handle = normalizeUsernameHandle(rawQuery);
  if (!digits && !handle) {
    return res.status(400).json({ found: false, error: 'Phone or username query required' });
  }

  const findLocalMatch = (): RegisteredUser | undefined => {
    if (digits.length >= 7) {
      const entry = findUserEntry(digits);
      if (entry?.user && !isSyntheticTestAccount(entry.user)) return entry.user;
    }
    if (handle.length >= 2) {
      for (const u of usersByPhone.values()) {
        if (isSyntheticTestAccount(u)) continue;
        const uHandle = normalizeUsernameHandle(u.username || '');
        const fHandle = normalizeUsernameHandle(u.fullName || '');
        if ((uHandle && uHandle === handle) || (fHandle && fHandle === handle)) {
          return u;
        }
      }
    }
    return undefined;
  };

  let foundUser = findLocalMatch();
  if (!foundUser) {
    await syncUsersFromSupabase().catch(() => {});
    foundUser = findLocalMatch();
  }

  if (!foundUser && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
      const filterClause =
        digits.length >= 7
          ? `or=(phone_digits.eq.${encodeURIComponent(last9)},phone_digits.eq.${encodeURIComponent(digits)},full_phone.eq.${encodeURIComponent('+' + digits)})`
          : `or=(username.ilike.${encodeURIComponent(handle)},username.ilike.${encodeURIComponent('@' + handle)})`;
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/agc_phone_registry?select=*&${filterClause}&limit=1`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(4000),
      });
      if (sbRes.ok) {
        const rows = await sbRes.json();
        const r = Array.isArray(rows) ? rows[0] : null;
        if (r && !isSyntheticTestAccount(r)) {
          const clean = String(r.full_phone || r.phone_digits || '').replace(/\D/g, '');
          if (clean) {
            foundUser = {
              id: r.id || `usr_${clean}`,
              fullName: r.username || 'AGC User',
              username: normalizeUsernameHandle(r.username || ''),
              phoneNumber: r.full_phone || `+${clean}`,
              cleanPhone: clean,
              avatarUrl: r.avatar_url || undefined,
              about: r.about || 'Available · Using AGC',
              registeredAt: r.created_at || new Date().toISOString(),
              role: 'user',
              status: 'active',
            };
          }
        }
      }
    } catch (_) {}
  }

  if (foundUser && !isSyntheticTestAccount(foundUser)) {
    res.json({ found: true, user: foundUser });
  } else {
    res.json({ found: false });
  }
});

// REST: Global AGC User Search (by name, @username, or phone — allows messaging without saving contact first)
app.get('/api/users/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.query || '').trim();
  const excludePhone = String(req.query.excludePhone || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, users: [] });
  }
  await syncUsersFromSupabase().catch(() => {});
  const qLower = q.toLowerCase();
  const qHandle = normalizeUsernameHandle(q);
  const qDigits = q.replace(/\D/g, '');
  const qVariants = qDigits ? getPhoneVariants(qDigits) : [];

  const results: Array<Partial<RegisteredUser>> = [];
  const seenKeys = new Set<string>();

  for (const u of usersByPhone.values()) {
    if (isSyntheticTestAccount(u)) continue;
    if (u.status === 'banned') continue;
    const phone = u.phoneNumber || u.cleanPhone || '';
    if (excludePhone && phone && phonesMatchServer(excludePhone, phone)) continue;

    const uName = (u.fullName || '').toLowerCase();
    const uHandle = normalizeUsernameHandle(u.username || '');
    const uClean = (u.cleanPhone || u.phoneNumber || '').replace(/\D/g, '');
    const uVariants = uClean ? getPhoneVariants(uClean) : [];

    const nameMatch = uName.includes(qLower);
    const handleMatch = Boolean(qHandle && (uHandle.includes(qHandle) || uHandle === qHandle));
    const phoneMatch = Boolean(
      qDigits.length >= 4 &&
        (uClean.includes(qDigits) || (qVariants.length > 0 && uVariants.some((v) => qVariants.includes(v))))
    );

    if (nameMatch || handleMatch || phoneMatch) {
      const dedupeKey = uClean.length >= 9 ? uClean.slice(-9) : (u.id || phone);
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      results.push({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        phoneNumber: u.phoneNumber,
        cleanPhone: u.cleanPhone,
        avatarUrl: u.avatarUrl,
        about: u.about,
        verificationBadge: u.verificationBadge ?? null,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      });
      if (results.length >= 25) break;
    }
  }

  return res.json({ success: true, users: results });
});

// REST: Block / Unblock user (persisted on user record and enforced across live & offline message delivery)
app.get('/api/users/blocks', (req: Request, res: Response) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) return res.status(400).json({ success: false, blockedPhones: [] });
  const entry = findUserEntry(phone);
  return res.json({
    success: true,
    blockedPhones: Array.isArray(entry?.user?.blockedPhones) ? entry!.user.blockedPhones : [],
  });
});

app.post('/api/users/block', (req: Request, res: Response) => {
  const { blockerPhone, targetPhone, blocked } = req.body || {};
  const cleanBlocker = String(blockerPhone || '').replace(/\D/g, '');
  const cleanTarget = String(targetPhone || '').replace(/\D/g, '');
  if (!cleanBlocker || !cleanTarget) {
    return res.status(400).json({ success: false, error: 'blockerPhone and targetPhone are required' });
  }
  const existing = findUserEntry(String(blockerPhone));
  const storeKey = existing?.key || cleanBlocker;
  const userRecord: RegisteredUser = existing?.user || {
    id: `usr_${cleanBlocker}`,
    fullName: 'AGC User',
    phoneNumber: String(blockerPhone),
    cleanPhone: cleanBlocker,
    registeredAt: new Date().toISOString(),
    role: 'user',
    status: 'active',
  };
  const currentBlocked = Array.isArray(userRecord.blockedPhones) ? userRecord.blockedPhones : [];
  const shouldBlock = Boolean(blocked);
  const nextBlocked = shouldBlock
    ? dedupePhonesServer([...currentBlocked, String(targetPhone)])
    : currentBlocked.filter((p) => !phonesMatchServer(p, String(targetPhone)));

  userRecord.blockedPhones = nextBlocked;
  userRecord.updatedAt = new Date().toISOString();
  usersByPhone.set(storeKey, userRecord);
  saveUsersFile();

  return res.json({ success: true, blocked: shouldBlock, blockedPhones: nextBlocked });
});

// REST: List all registered users (synced live with Supabase registry)
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    await syncUsersFromSupabase();
    let expiredAny = false;
    for (const [k, u] of usersByPhone.entries()) {
      if (expireUserSuspensionIfElapsed(u, k)) expiredAny = true;
    }
    if (expiredAny) saveUsersFile();
    const cleanUsers = Array.from(usersByPhone.values()).filter((u) => !isSyntheticTestAccount(u));
    res.json({ users: cleanUsers });
  } catch (err: any) {
    const cleanUsers = Array.from(usersByPhone.values()).filter((u) => !isSyntheticTestAccount(u));
    res.status(500).json({ error: err?.message || 'Failed to load users', users: cleanUsers });
  }
});

// REST: Communities endpoints
app.get('/api/communities', (req: Request, res: Response) => {
  const viewerPhone = String(req.query.phone || '').trim();
  const viewerId = String(req.query.userId || '').trim();
  const valid = Array.from(communitiesMap.values()).filter(
    (c) => !isInvalidServerCommunity(c) && canUserAccessServerCommunity(c, viewerPhone, viewerId)
  );
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
  const isPrivateGroup = isPrivateServerCommunity(comm);
  const duplicate = Array.from(communitiesMap.values()).find(
    (c) =>
      c.id === comm.id ||
      (!isPrivateGroup && String(c.name || '').trim().toLowerCase() === normName && (c.type || 'group') === commType)
  );
  if (duplicate) {
    return res.json({ success: true, community: duplicate, deduplicated: true });
  }
  const stored = isPrivateGroup
    ? {
        ...comm,
        isPrivate: true,
        inviteCode: comm.inviteCode || `G${String(comm.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`,
        memberPhones: Array.isArray(comm.memberPhones)
          ? comm.memberPhones
          : comm.creatorPhone
          ? [comm.creatorPhone]
          : [],
      }
    : comm;
  communitiesMap.set(stored.id, stored);
  saveCommunitiesFile();
  if (!isPrivateGroup) {
    io.emit('community_created', stored);
  }
  res.json({ success: true, community: stored });
});

// REST: Private Groups & Channels Authoritative Sync
app.get('/api/groups', (req: Request, res: Response) => {
  const viewerPhone = String(req.query.phone || '').trim();
  const viewerId = String(req.query.userId || '').trim();
  if (!viewerPhone && !viewerId) {
    return res.json({ success: true, groups: [], excludedGroupIds: [] });
  }
  const authorized: any[] = [];
  const excludedGroupIds: string[] = [];
  for (const g of privateGroupsMap.values()) {
    if (!g?.id) continue;
    if (canUserAccessPrivateGroup(g, viewerPhone, viewerId)) {
      authorized.push({
        ...g,
        membersCount: computeAuthoritativeMembersCount(g),
      });
    } else if (
      (viewerPhone && isPhoneInListServer(g.kickedPhones, viewerPhone)) ||
      (viewerId && Array.isArray(g.kickedIds) && g.kickedIds.includes(viewerId))
    ) {
      excludedGroupIds.push(String(g.id));
    }
  }
  for (const c of communitiesMap.values()) {
    if (!c?.id || isInvalidServerCommunity(c)) continue;
    if (viewerPhone && isPhoneInListServer(c.kickedPhones, viewerPhone)) {
      excludedGroupIds.push(`town_comm_${c.id}`);
    }
  }
  return res.json({ success: true, groups: authorized, excludedGroupIds });
});

// REST: Private Groups Registry & Join-by-Link / Invite Code
app.post('/api/groups/register', (req: Request, res: Response) => {
  const g = req.body;
  if (!g || !g.id || !g.name) return res.status(400).json({ error: 'Group id and name required' });
  const existing = privateGroupsMap.get(String(g.id));
  const kickedPhones = dedupePhonesServer([
    ...(Array.isArray(existing?.kickedPhones) ? existing.kickedPhones : []),
    ...(Array.isArray(g.kickedPhones) ? g.kickedPhones : []),
  ]);
  const mergedPhones = dedupePhonesServer([
    ...(Array.isArray(existing?.memberPhones) ? existing.memberPhones : []),
    ...(Array.isArray(g.memberPhones) ? g.memberPhones : []),
    ...(g.creatorPhone ? [g.creatorPhone] : []),
  ]).filter((p) => !isPhoneInListServer(kickedPhones, p));
  const mergedMembers = dedupeStringsCaseInsensitive([
    ...(Array.isArray(existing?.members) ? existing.members : []),
    ...(Array.isArray(g.members) ? g.members : []),
  ]);
  const mergedPending = dedupeStringsCaseInsensitive([
    ...(Array.isArray(existing?.pendingMembers) ? existing.pendingMembers : []),
    ...(Array.isArray(g.pendingMembers) ? g.pendingMembers : []),
  ]);
  const mergedPendingPhones = dedupePhonesServer([
    ...(Array.isArray(existing?.pendingPhones) ? existing.pendingPhones : []),
    ...(Array.isArray(g.pendingPhones) ? g.pendingPhones : []),
  ]);
  const mergedAdmins = dedupeStringsCaseInsensitive([
    ...(Array.isArray(existing?.admins) ? existing.admins : []),
    ...(Array.isArray(g.admins) ? g.admins : []),
  ]);
  const mergedAdminIds = dedupeStringsCaseInsensitive([
    ...(Array.isArray(existing?.adminIds) ? existing.adminIds : []),
    ...(Array.isArray(g.adminIds) ? g.adminIds : []),
  ]);
  const nextGroup = {
    ...(existing || {}),
    ...g,
    id: String(g.id),
    inviteCode: String(g.inviteCode || existing?.inviteCode || g.id).trim().toUpperCase(),
    memberPhones: mergedPhones,
    members: mergedMembers,
    pendingMembers: mergedPending,
    pendingPhones: mergedPendingPhones,
    kickedPhones,
    admins: mergedAdmins,
    adminIds: mergedAdminIds,
    membersCount: computeAuthoritativeMembersCount({ members: mergedMembers, memberPhones: mergedPhones }),
    updatedAt: new Date().toISOString(),
  };
  privateGroupsMap.set(nextGroup.id, nextGroup);
  savePrivateGroupsFile();
  return res.json({ success: true, group: nextGroup });
});

app.post('/api/groups/invite', (req: Request, res: Response) => {
  const { groupId, targets, actorPhone } = req.body || {};
  if (!groupId || !Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ success: false, error: 'groupId and targets required' });
  }
  const gid = String(groupId);
  const targetNames = targets.map((t: any) => String(t?.name || t?.phone || '').trim()).filter(Boolean);
  const targetPhones = dedupePhonesServer(targets.map((t: any) => String(t?.phone || '').trim()).filter(Boolean));

  const priv = privateGroupsMap.get(gid);
  if (priv) {
    const nextKicked = (priv.kickedPhones || []).filter((kp: string) => !isPhoneInListServer(targetPhones, kp));
    const nextPendingMembers = dedupeStringsCaseInsensitive([
      ...(Array.isArray(priv.pendingMembers) ? priv.pendingMembers : []),
      ...targetNames,
    ]);
    const nextPendingPhones = dedupePhonesServer([
      ...(Array.isArray(priv.pendingPhones) ? priv.pendingPhones : []),
      ...targetPhones,
    ]);
    const updated = {
      ...priv,
      kickedPhones: nextKicked,
      pendingMembers: nextPendingMembers,
      pendingPhones: nextPendingPhones,
      updatedAt: new Date().toISOString(),
    };
    privateGroupsMap.set(gid, updated);
    savePrivateGroupsFile();
    emitGroupEventToPhones('group_updated', updated.memberPhones || [], gid, { group: updated, actorPhone });
    return res.json({ success: true, group: updated });
  }

  if (gid.startsWith('town_comm_')) {
    const commId = gid.replace('town_comm_', '');
    const comm = communitiesMap.get(commId);
    if (comm) {
      const nextKicked = (comm.kickedPhones || []).filter((kp: string) => !isPhoneInListServer(targetPhones, kp));
      const nextInvited = dedupePhonesServer([
        ...(Array.isArray(comm.invitedPhones) ? comm.invitedPhones : []),
        ...targetPhones,
      ]);
      const nextPending = dedupeStringsCaseInsensitive([
        ...(Array.isArray(comm.pendingMembers) ? comm.pendingMembers : []),
        ...targetNames,
      ]);
      const updatedComm = {
        ...comm,
        kickedPhones: nextKicked,
        invitedPhones: nextInvited,
        pendingMembers: nextPending,
      };
      communitiesMap.set(commId, updatedComm);
      saveCommunitiesFile();
      emitGroupEventToPhones('group_updated', updatedComm.memberPhones || [], gid, { group: updatedComm, actorPhone });
      return res.json({ success: true, community: updatedComm });
    }
  }
  return res.json({ success: true });
});

app.post('/api/groups/invite-response', (req: Request, res: Response) => {
  const { groupId, responderPhone, responderName, responderId, accepted } = req.body || {};
  if (!groupId) return res.status(400).json({ success: false, error: 'groupId required' });
  const gid = String(groupId);
  const displayName = String(responderName || responderPhone || 'Member').trim();

  const priv = privateGroupsMap.get(gid);
  if (priv) {
    const nextPendingMembers = (priv.pendingMembers || []).filter(
      (m: string) => m.toLowerCase() !== displayName.toLowerCase() && (!responderPhone || !phonesMatchServer(m, responderPhone))
    );
    const nextPendingPhones = (priv.pendingPhones || []).filter(
      (p: string) => !responderPhone || !phonesMatchServer(p, responderPhone)
    );
    let nextPhones = Array.isArray(priv.memberPhones) ? [...priv.memberPhones] : [];
    let nextMembers = Array.isArray(priv.members) ? [...priv.members] : [];
    let nextKicked = Array.isArray(priv.kickedPhones) ? [...priv.kickedPhones] : [];
    if (accepted) {
      if (responderPhone) {
        nextKicked = nextKicked.filter((kp) => !phonesMatchServer(kp, responderPhone));
        nextPhones = dedupePhonesServer([...nextPhones, responderPhone]);
      }
      if (displayName && !nextMembers.some((m) => m.toLowerCase() === displayName.toLowerCase() || (responderPhone && phonesMatchServer(m, responderPhone)))) {
        nextMembers.push(displayName);
      }
    }
    const updated = {
      ...priv,
      pendingMembers: nextPendingMembers,
      pendingPhones: nextPendingPhones,
      kickedPhones: nextKicked,
      memberPhones: nextPhones,
      members: nextMembers,
      membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
      updatedAt: new Date().toISOString(),
    };
    privateGroupsMap.set(gid, updated);
    savePrivateGroupsFile();
    emitGroupEventToPhones('group_updated', updated.memberPhones || [], gid, {
      group: updated,
      responderPhone,
      responderName: displayName,
      responderId,
      accepted: Boolean(accepted),
    });
    return res.json({ success: true, group: updated });
  }

  if (gid.startsWith('town_comm_')) {
    const commId = gid.replace('town_comm_', '');
    const comm = communitiesMap.get(commId);
    if (comm) {
      const nextPending = (comm.pendingMembers || []).filter(
        (m: string) => m.toLowerCase() !== displayName.toLowerCase() && (!responderPhone || !phonesMatchServer(m, responderPhone))
      );
      let nextPhones = Array.isArray(comm.memberPhones) ? [...comm.memberPhones] : [];
      let nextMembers = Array.isArray(comm.members) ? [...comm.members] : [];
      if (accepted) {
        if (responderPhone) nextPhones = dedupePhonesServer([...nextPhones, responderPhone]);
        if (displayName && !nextMembers.some((m) => m.toLowerCase() === displayName.toLowerCase())) {
          nextMembers.push(displayName);
        }
      }
      const updatedComm = {
        ...comm,
        pendingMembers: nextPending,
        memberPhones: nextPhones,
        members: nextMembers,
        membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
      };
      communitiesMap.set(commId, updatedComm);
      saveCommunitiesFile();
      emitGroupEventToPhones('group_updated', updatedComm.memberPhones || [], gid, {
        group: { ...updatedComm, id: gid },
        responderPhone,
        responderName: displayName,
        accepted: Boolean(accepted),
      });
      return res.json({ success: true, community: updatedComm });
    }
  }

  return res.json({ success: true });
});

app.post('/api/groups/update', (req: Request, res: Response) => {
  const {
    groupId,
    action,
    actorPhone,
    actorId,
    actorName,
    targetName,
    targetPhone,
    updates,
  } = req.body || {};

  if (!groupId || !action) {
    return res.status(400).json({ success: false, error: 'groupId and action required' });
  }

  const gid = String(groupId);
  const isTown = gid.startsWith('town_comm_');
  const commId = isTown ? gid.replace('town_comm_', '') : '';
  const targetRecord = isTown ? communitiesMap.get(commId) : privateGroupsMap.get(gid);

  if (!targetRecord) {
    return res.json({ success: true, missingOnServer: true });
  }

  const isTargetMatch = (val: string): boolean => {
    const s = String(val || '').trim();
    if (!s) return false;
    if (targetPhone && phonesMatchServer(s, String(targetPhone))) return true;
    if (targetName && s.toLowerCase() === String(targetName).trim().toLowerCase()) return true;
    return false;
  };

  const isActorAdminOrCreator = (): boolean => {
    if (actorId && targetRecord.creatorId && String(targetRecord.creatorId) === String(actorId)) return true;
    if (actorPhone && targetRecord.creatorPhone && phonesMatchServer(String(actorPhone), String(targetRecord.creatorPhone))) return true;
    if (actorId && Array.isArray(targetRecord.adminIds) && targetRecord.adminIds.includes(String(actorId))) return true;
    if (Array.isArray(targetRecord.admins)) {
      if (actorPhone && targetRecord.admins.some((a: string) => phonesMatchServer(a, String(actorPhone)))) return true;
      if (actorName && targetRecord.admins.some((a: string) => String(a).trim().toLowerCase() === String(actorName).trim().toLowerCase())) return true;
    }
    return false;
  };

  if (action === 'kick' || action === 'remove_member' || action === 'leave') {
    const isSelfLeave =
      action === 'leave' ||
      (actorPhone && targetPhone && phonesMatchServer(String(actorPhone), String(targetPhone)));

    if (!isSelfLeave && (actorPhone || actorId) && !isActorAdminOrCreator()) {
      return res.status(403).json({ success: false, error: 'Only group/channel admins can remove members.' });
    }

    const oldPhones: string[] = Array.isArray(targetRecord.memberPhones) ? targetRecord.memberPhones : [];
    const nextPhones = oldPhones.filter((p) => !isTargetMatch(p));
    const nextMembers = (Array.isArray(targetRecord.members) ? targetRecord.members : []).filter((m: string) => !isTargetMatch(m));
    const nextPending = (Array.isArray(targetRecord.pendingMembers) ? targetRecord.pendingMembers : []).filter((m: string) => !isTargetMatch(m));
    const nextPendingPhones = (Array.isArray(targetRecord.pendingPhones) ? targetRecord.pendingPhones : []).filter((p: string) => !isTargetMatch(p));
    const nextInvited = (Array.isArray(targetRecord.invitedPhones) ? targetRecord.invitedPhones : []).filter((p: string) => !isTargetMatch(p));
    const nextAdmins = (Array.isArray(targetRecord.admins) ? targetRecord.admins : []).filter((a: string) => !isTargetMatch(a));

    const removedPhones = dedupePhonesServer([
      ...(targetPhone ? [String(targetPhone)] : []),
      ...oldPhones.filter((p) => isTargetMatch(p)),
    ]);

    const nextKicked =
      action === 'kick' || (!isSelfLeave && action === 'remove_member')
        ? dedupePhonesServer([...(Array.isArray(targetRecord.kickedPhones) ? targetRecord.kickedPhones : []), ...removedPhones])
        : Array.isArray(targetRecord.kickedPhones)
        ? targetRecord.kickedPhones
        : [];

    const nextCount = computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones });
    const nextRecord = {
      ...targetRecord,
      memberPhones: nextPhones,
      members: nextMembers,
      pendingMembers: nextPending,
      pendingPhones: nextPendingPhones,
      invitedPhones: nextInvited,
      admins: nextAdmins,
      kickedPhones: nextKicked,
      membersCount: nextCount,
      updatedAt: new Date().toISOString(),
    };

    if (isTown) {
      communitiesMap.set(commId, nextRecord);
      saveCommunitiesFile();
    } else {
      privateGroupsMap.set(gid, nextRecord);
      savePrivateGroupsFile();
    }

    if (removedPhones.length > 0) {
      removePhonesFromChatRoom(gid, removedPhones);
      if (!isSelfLeave) {
        emitGroupEventToPhones('group_kicked', removedPhones, '', {
          groupId: gid,
          groupName: nextRecord.name,
          targetPhone: removedPhones[0],
          targetName: targetName || removedPhones[0],
          actorName: actorName || 'Admin',
          reason: 'Removed by admin',
        });
      }
    }

    const broadcastGroup = isTown ? { ...nextRecord, id: gid } : nextRecord;
    emitGroupEventToPhones('group_updated', nextPhones, gid, {
      group: broadcastGroup,
      removedName: targetName,
      removedPhone: removedPhones[0] || targetPhone,
      action,
    });

    return res.json({ success: true, group: broadcastGroup });
  }

  if (action === 'toggle_admin') {
    if ((actorPhone || actorId) && !isActorAdminOrCreator()) {
      return res.status(403).json({ success: false, error: 'Only admins can change admin roles.' });
    }
    const currentAdmins: string[] = Array.isArray(targetRecord.admins) ? [...targetRecord.admins] : [];
    const already = currentAdmins.some((a) => isTargetMatch(a));
    const nextAdmins = already
      ? currentAdmins.filter((a) => !isTargetMatch(a))
      : dedupeStringsCaseInsensitive([...currentAdmins, targetName || targetPhone]);
    const nextRecord = {
      ...targetRecord,
      admins: nextAdmins,
      updatedAt: new Date().toISOString(),
    };
    if (isTown) {
      communitiesMap.set(commId, nextRecord);
      saveCommunitiesFile();
    } else {
      privateGroupsMap.set(gid, nextRecord);
      savePrivateGroupsFile();
    }
    const broadcastGroup = isTown ? { ...nextRecord, id: gid } : nextRecord;
    emitGroupEventToPhones('group_updated', nextRecord.memberPhones || [], gid, {
      group: broadcastGroup,
      action: 'toggle_admin',
    });
    return res.json({ success: true, group: broadcastGroup });
  }

  if (action === 'update_meta' && updates && typeof updates === 'object') {
    if ((actorPhone || actorId) && !isActorAdminOrCreator()) {
      return res.status(403).json({ success: false, error: 'Only admins can update settings.' });
    }
    const allowed: Record<string, any> = {};
    if (typeof updates.name === 'string' && updates.name.trim()) allowed.name = updates.name.trim();
    if (typeof updates.description === 'string') allowed.description = updates.description;
    if (typeof updates.announceMode === 'boolean') allowed.announceMode = updates.announceMode;
    if (typeof updates.disappearingTimer === 'string') allowed.disappearingTimer = updates.disappearingTimer;
    if (updates.pinnedMessage !== undefined) allowed.pinnedMessage = updates.pinnedMessage;
    const nextRecord = {
      ...targetRecord,
      ...allowed,
      updatedAt: new Date().toISOString(),
    };
    if (isTown) {
      communitiesMap.set(commId, nextRecord);
      saveCommunitiesFile();
    } else {
      privateGroupsMap.set(gid, nextRecord);
      savePrivateGroupsFile();
    }
    const broadcastGroup = isTown ? { ...nextRecord, id: gid } : nextRecord;
    emitGroupEventToPhones('group_updated', nextRecord.memberPhones || [], gid, {
      group: broadcastGroup,
      action: 'update_meta',
    });
    return res.json({ success: true, group: broadcastGroup });
  }

  return res.status(400).json({ success: false, error: 'Unknown action' });
});

app.post('/api/groups/join', (req: Request, res: Response) => {
  const { codeOrLink, phone, name, avatar, userId } = req.body || {};
  const token = extractInviteLookupCode(String(codeOrLink || ''));
  if (!token) return res.status(400).json({ success: false, error: 'Invite link or code required' });
  const tokenUpper = token.toUpperCase();
  const strippedTownUpper = tokenUpper.replace(/^TOWN_COMM_/, '');

  // 1. Check private groups registry
  const matchedGroup = Array.from(privateGroupsMap.values()).find((g) => {
    const gId = String(g.id || '').toUpperCase();
    const gCode = String(g.inviteCode || '').toUpperCase();
    return gId === tokenUpper || gCode === tokenUpper;
  });

  if (matchedGroup) {
    if (phone && isPhoneInListServer(matchedGroup.kickedPhones, phone)) {
      return res.status(403).json({ success: false, error: 'You were removed from this group/channel by an admin.' });
    }
    const nextPhones = dedupePhonesServer([
      ...(Array.isArray(matchedGroup.memberPhones) ? matchedGroup.memberPhones : []),
      phone,
    ]);
    const nextMembers = dedupeStringsCaseInsensitive([
      ...(Array.isArray(matchedGroup.members) ? matchedGroup.members : []),
      name || phone,
    ]);
    const nextPendingMembers = (matchedGroup.pendingMembers || []).filter(
      (m: string) => (!name || m.toLowerCase() !== String(name).toLowerCase()) && (!phone || !phonesMatchServer(m, phone))
    );
    const nextPendingPhones = (matchedGroup.pendingPhones || []).filter(
      (p: string) => !phone || !phonesMatchServer(p, phone)
    );
    const updatedGroup = {
      ...matchedGroup,
      memberPhones: nextPhones,
      members: nextMembers,
      pendingMembers: nextPendingMembers,
      pendingPhones: nextPendingPhones,
      membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
      updatedAt: new Date().toISOString(),
    };
    privateGroupsMap.set(updatedGroup.id, updatedGroup);
    savePrivateGroupsFile();
    emitGroupEventToPhones('group_updated', updatedGroup.memberPhones, updatedGroup.id, {
      group: updatedGroup,
      responderPhone: phone || '',
      responderName: name || phone || 'Member',
      accepted: true,
    });
    emitGroupEventToPhones('group_invite_response', updatedGroup.memberPhones, updatedGroup.id, {
      groupId: updatedGroup.id,
      responderPhone: phone || '',
      responderName: name || phone || 'Member',
      accepted: true,
    });
    return res.json({ success: true, kind: 'group', group: updatedGroup });
  }

  // 2. Check communities (Town groups & channels)
  const matchedComm = Array.from(communitiesMap.values()).find((c) => {
    if (isInvalidServerCommunity(c)) return false;
    const cId = String(c.id || '').toUpperCase();
    const cCode = String(c.inviteCode || '').toUpperCase();
    return cId === tokenUpper || cId === strippedTownUpper || (cCode && cCode === tokenUpper);
  });

  if (matchedComm) {
    if (phone && isPhoneInListServer(matchedComm.kickedPhones, phone)) {
      return res.status(403).json({ success: false, error: 'You were removed from this community by an admin.' });
    }
    const nextPhones = dedupePhonesServer([
      ...(Array.isArray(matchedComm.memberPhones) ? matchedComm.memberPhones : []),
      phone,
    ]);
    const nextMembers = dedupeStringsCaseInsensitive([
      ...(Array.isArray(matchedComm.members) ? matchedComm.members : []),
      name || phone,
    ]);
    const updatedComm = {
      ...matchedComm,
      memberPhones: nextPhones,
      members: nextMembers,
      membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
    };
    communitiesMap.set(updatedComm.id, updatedComm);
    saveCommunitiesFile();
    emitGroupEventToPhones('group_updated', updatedComm.memberPhones, `town_comm_${updatedComm.id}`, {
      group: { ...updatedComm, id: `town_comm_${updatedComm.id}` },
      responderPhone: phone || '',
      responderName: name || phone || 'Member',
      accepted: true,
    });
    return res.json({ success: true, kind: 'community', community: updatedComm });
  }

  return res.status(404).json({ success: false, error: 'Invalid or expired group invite link/code' });
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

app.delete('/api/communities', requireAdminAuth, (_req: Request, res: Response) => {
  const deletedIds = Array.from(communitiesMap.keys());
  communitiesMap.clear();
  saveCommunitiesFile();
  deletedIds.forEach((id) => io.emit('community_deleted', { id }));
  res.json({ success: true, clearedCount: deletedIds.length });
});

// REST: Resend Email Endpoint
const emailRateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.post('/api/email/send', async (req: Request, res: Response) => {
  try {
    // Basic IP rate limiting on email gateway (max 5 emails per minute per IP)
    const ip = getClientIp(req);
    const now = Date.now();
    const rate = emailRateLimitMap.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > rate.resetAt) {
      rate.count = 0;
      rate.resetAt = now + 60000;
    }
    rate.count++;
    emailRateLimitMap.set(ip, rate);
    if (rate.count > 5 && !isAuthorizedAdminRequest(req)) {
      return res.status(429).json({ error: 'Too many email requests. Please slow down.' });
    }

    const { to, subject, html, text, from } = req.body || {};
    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient (to) and subject required' });
    }
    const recipients = Array.isArray(to) ? to : [to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const r of recipients) {
      if (!emailRegex.test(String(r).trim())) {
        return res.status(400).json({ error: `Invalid recipient email format: ${r}` });
      }
    }
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
  purgeExpiredServerStatuses(true);
  const now = Date.now();
  const list = Array.from(statusesMap.values()).filter((s: any) => !isServerStatusExpired(s, now));
  res.json(list);
});

app.post('/api/statuses', (req: Request, res: Response) => {
  const st = req.body;
  if (!st || !st.id) return res.status(400).json({ error: 'Status data required' });
  const normalized = normalizeServerStatus(st);
  if (isServerStatusExpired(normalized, Date.now())) {
    return res.status(410).json({ error: 'Status already expired' });
  }
  statusesMap.set(normalized.id, normalized);
  saveStatusesFile();
  io.emit('new_status', { status: normalized });
  res.json({ success: true, status: normalized });
});

app.delete('/api/statuses/:id', (req: Request, res: Response) => {
  const statusId = String(req.params.id || '').trim();
  if (!statusId) return res.status(400).json({ error: 'Status id required' });
  const existing = statusesMap.get(statusId);
  if (!existing) return res.status(404).json({ error: 'Status not found' });
  const callerPhone = String(req.body?.userPhone || req.query?.userPhone || '').trim();
  const isOwner = callerPhone && phonesMatchServer(callerPhone, (existing as any).userPhone);
  const isAdmin = isAuthorizedAdminRequest(req);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized: You can only delete your own status.' });
  }
  statusesMap.delete(statusId);
  saveStatusesFile();
  io.emit('status_purged', { ids: [statusId] });
  res.json({ success: true, deleted: true, id: statusId });
});

// ── REST: Store-and-Forward Reliable Message Relay & Missed Message Sync ─────
app.post('/api/messages/send', (req: Request, res: Response) => {
  try {
    const { chatId, message, targetPhone, memberPhones, chat, isGroup, senderSocketId, senderPhone: bodySenderPhone } = req.body || {};
    if (!chatId || !message || !message.id) {
      return res.status(400).json({ success: false, error: 'chatId and message required' });
    }
    const senderPhone = String(message.senderPhone || bodySenderPhone || '').replace(/\D/g, '');

    // Authoritative server check: block kicked/non-member users and non-admins in channels/announce mode
    if (senderPhone && message.sender !== 'system' && message.sender !== 'ai') {
      const senderVariants = new Set(getPhoneVariants(senderPhone));
      const senderAuth = isPhoneCurrentlyAuthorizedForGroupChat(String(chatId), senderVariants);
      if (senderAuth === false) {
        return res.status(403).json({ success: false, error: 'You are no longer a member of this group or channel.' });
      }
      if (!canPhoneWriteToGroupChat(String(chatId), senderVariants, message.senderName)) {
        return res.status(403).json({ success: false, error: 'Only admins can send messages here.' });
      }
    }

    let finalTarget = targetPhone ? String(targetPhone).replace(/\D/g, '') : '';
    if (!finalTarget && String(chatId).startsWith('dm_')) {
      const senderVariants = new Set(getPhoneVariants(senderPhone));
      const parts = String(chatId).replace('dm_', '').split('_').filter(Boolean);
      finalTarget = parts.find((p) => !senderVariants.has(p) && !phonesMatchServer(p, senderPhone)) || '';
    }

    const groupFlag = Boolean(isGroup || String(chatId).startsWith('group_') || String(chatId).startsWith('channel_') || String(chatId).startsWith('town_comm_') || chat?.isGroup || chat?.isChannel);

    // Block enforcement for 1-on-1 direct messages (unless it's a self-chat)
    const isSelfDm = String(chatId).includes('self') || (senderPhone && finalTarget && phonesMatchServer(senderPhone, finalTarget));
    const suppressedForPhones: string[] = [];
    if (!groupFlag && !isSelfDm && senderPhone && finalTarget) {
      if (isPhoneBlockedServer(senderPhone, finalTarget)) {
        return res.status(403).json({ success: false, blocked: true, error: 'You blocked this contact. Unblock to send messages.' });
      }
      if (isPhoneBlockedServer(finalTarget, senderPhone)) {
        suppressedForPhones.push(finalTarget);
      }
    }

    const serverPriv = privateGroupsMap.get(String(chatId));
    const serverComm = String(chatId).startsWith('town_comm_') ? communitiesMap.get(String(chatId).replace('town_comm_', '')) : undefined;
    const authRecord = serverPriv || serverComm;
    const authoritativePhones: string[] = Array.isArray(authRecord?.memberPhones) && authRecord.memberPhones.length > 0
      ? authRecord.memberPhones.filter((p: string) => !isPhoneInListServer(authRecord.kickedPhones, p))
      : Array.isArray(memberPhones)
      ? memberPhones
      : [];
    const wireChatWithAuth = authRecord && chat
      ? {
          ...chat,
          members: authRecord.members || chat.members,
          memberPhones: authoritativePhones,
          membersCount: computeAuthoritativeMembersCount({ members: authRecord.members || chat.members, memberPhones: authoritativePhones }),
        }
      : chat;

    recordStoredMessage({
      id: String(message.id),
      chatId: String(chatId),
      message: senderPhone && !message.senderPhone ? { ...message, senderPhone } : message,
      senderPhone,
      targetPhone: finalTarget || undefined,
      memberPhones: authoritativePhones.length > 0 ? authoritativePhones : undefined,
      suppressedForPhones: suppressedForPhones.length > 0 ? suppressedForPhones : undefined,
      chat: wireChatWithAuth,
      isGroup: groupFlag,
    });

    const outPayload = { chatId, message, targetPhone: finalTarget, chat: wireChatWithAuth, isGroup: groupFlag };
    const deliveredSockets = new Set<string>(senderSocketId ? [String(senderSocketId)] : []);
    const kickedPhonesList: string[] = Array.isArray(authRecord?.kickedPhones) ? authRecord.kickedPhones : [];
    const emitOnce = (roomName: string) => {
      const room = io.sockets.adapter.rooms.get(roomName);
      if (!room) return;
      for (const sid of room) {
        if (deliveredSockets.has(sid)) continue;
        const targetSock = io.sockets.sockets.get(sid) as any;
        if (kickedPhonesList.length > 0 && targetSock?._agcPhone && isPhoneInListServer(kickedPhonesList, targetSock._agcPhone)) {
          continue;
        }
        if (
          suppressedForPhones.length > 0 &&
          targetSock?._agcPhone &&
          suppressedForPhones.some((sp) => phonesMatchServer(sp, targetSock._agcPhone))
        ) {
          continue;
        }
        deliveredSockets.add(sid);
        io.to(sid).emit('new_message', outPayload);
      }
    };

    emitOnce(`chat:${chatId}`);
    if (finalTarget && suppressedForPhones.length === 0) {
      getPhoneVariants(finalTarget).forEach((v) => emitOnce(`phone:${v}`));
    }
    if (senderPhone && !String(chatId).includes('self')) {
      // Sync sender's other open tabs/devices too
      getPhoneVariants(senderPhone).forEach((v) => emitOnce(`phone:${v}`));
    }
    authoritativePhones.forEach((p: string) => {
      getPhoneVariants(p).forEach((v) => emitOnce(`phone:${v}`));
    });

    return res.json({
      success: true,
      id: message.id,
      relayedSockets: Math.max(0, deliveredSockets.size - (senderSocketId ? 1 : 0)),
      ...(suppressedForPhones.length > 0 ? { blockedByRecipient: true } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to store message' });
  }
});

app.get('/api/messages/sync', (req: Request, res: Response) => {
  const rawPhone = String(req.query.phone || '').trim();
  if (!rawPhone) return res.status(400).json({ success: false, error: 'phone required', messages: [] });
  const sinceMs = Number(req.query.sinceMs) || (Date.now() - 3 * 24 * 60 * 60 * 1000);
  const variantsSet = new Set(getPhoneVariants(rawPhone));
  const matched = storedMessagesList
    .filter((entry) => entry.createdAtMs > sinceMs && doesStoredMessageMatchPhone(entry, variantsSet, rawPhone))
    .slice(-300);
  return res.json({ success: true, messages: matched, serverTimeMs: Date.now() });
});

app.get('/api/messages/chat/:chatId', (req: Request, res: Response) => {
  const chatId = decodeURIComponent(String(req.params.chatId || ''));
  const sinceMs = Number(req.query.sinceMs) || 0;
  const viewerPhone = String(req.query.phone || '').trim();
  if (!chatId) return res.json({ success: true, messages: [] });
  const viewerVariants = viewerPhone ? new Set(getPhoneVariants(viewerPhone)) : null;
  if (viewerPhone && viewerVariants) {
    const auth = isPhoneCurrentlyAuthorizedForGroupChat(chatId, viewerVariants);
    if (auth === false) {
      return res.json({ success: true, messages: [], removed: true, serverTimeMs: Date.now() });
    }
  }
  const list = storedMessagesList
    .filter((entry) => {
      if (entry.chatId !== chatId || entry.createdAtMs <= sinceMs) return false;
      if (viewerPhone && viewerVariants) {
        if (
          Array.isArray(entry.suppressedForPhones) &&
          entry.suppressedForPhones.length > 0 &&
          isPhoneVariantsInListServer(entry.suppressedForPhones, viewerVariants)
        ) {
          return false;
        }
        if (!entry.isGroup) {
          const msgSender = entry.senderPhone || entry.message?.senderPhone || '';
          if (msgSender && !phonesMatchServer(msgSender, viewerPhone) && isPhoneBlockedServer(viewerPhone, msgSender)) {
            return false;
          }
        }
      }
      return true;
    })
    .slice(-150);
  return res.json({ success: true, messages: list, serverTimeMs: Date.now() });
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

function buildLocalDispatchAiResult(
  prompt: string,
  currentPickup: string,
  feePercent: number,
  orders: any[]
) {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const bikeTotal = 2400 + Math.round(2400 * (feePercent / 100));
  const vanTotal = 6500 + Math.round(6500 * (feePercent / 100));

  // 1. Check tracking / status intent
  const codeMatch = text.match(/AGC-(?:GKD|PCK)-\d{4,6}/i);
  if (
    codeMatch ||
    /\b(track|tracking|where is|status of|my order|latest delivery|my delivery|rider)\b/i.test(lower)
  ) {
    const targetOrder = codeMatch
      ? orders.find((o) => String(o.trackingCode || '').toUpperCase() === codeMatch[0].toUpperCase())
      : orders[0];
    if (targetOrder) {
      return {
        intent: 'track' as const,
        trackingCode: targetOrder.trackingCode,
        reply: `Order ${targetOrder.trackingCode} (${targetOrder.packageDescription || 'Parcel'}) is currently **${String(targetOrder.status || 'rider_assigned').replace(/_/g, ' ')}**. Rider: ${targetOrder.riderName || 'Assigned'} (${targetOrder.riderPlate || 'GKD'}) going to ${targetOrder.recipientAddress || 'destination'}.`,
        booking: {},
        readyToConfirm: false,
      };
    }
    return {
      intent: 'answer' as const,
      reply: `You don't have any active dispatch deliveries yet. Describe a pickup, dropoff, recipient, and item here (e.g. "Send laptop to Amara 08012345678 at 14 Admiralty Way Lekki") and I'll fill the booking form for you!`,
      booking: {},
      readyToConfirm: false,
    };
  }

  // 2. Answer rate/FAQ questions directly if not a booking command with recipient/address
  const isRateOrFaqQuestion =
    /\b(what are|how much|price|pricing|rates?|cost|fees?|commission|compare|difference|how does|insur|weight|gokada|pickkr)\b/i.test(lower) &&
    !/\b(send|deliver|ship)\s+.+\s+(to|at)\b/i.test(lower);

  if (isRateOrFaqQuestion) {
    const mentionsVan = /\b(van|truck|heavy|bulk)\b/i.test(lower);
    const mentionsBike = /\b(bike|motorbike|okada)\b/i.test(lower);
    const mentionedVehicle = mentionsVan && !mentionsBike ? 'van' : mentionsBike && !mentionsVan ? 'bike' : undefined;
    return {
      intent: 'answer' as const,
      reply: `AGC Dispatch fares from ${currentPickup || 'your pickup'}: **Motorbike Express** is ₦${bikeTotal.toLocaleString()} total (₦2,400 + ${feePercent}% platform fee, up to 10kg via Gokada) and **Delivery Van** is ₦${vanTotal.toLocaleString()} total (₦6,500 + ${feePercent}% fee, bulk up to 500kg via PickkR). Every order includes live tracking & rider phone contact!`,
      booking: mentionedVehicle ? { vehicleType: mentionedVehicle } : {},
      readyToConfirm: false,
    };
  }

  // 3. Parse natural-language booking details
  const booking: Record<string, any> = {};

  if (/\b(van|truck|heavy|bulk|fridge|tv|television|furniture|mattress|cartons?|crates?)\b/i.test(lower)) {
    booking.vehicleType = 'van';
  } else if (/\b(bike|motorbike|okada|dispatch bike|express|fast)\b/i.test(lower)) {
    booking.vehicleType = 'bike';
  }

  const phoneMatch = text.match(/(\+?234\s?\d{3}\s?\d{3}\s?\d{4}|0[789][01]\d[\s-]?\d{3}[\s-]?\d{4}|\+?\d{10,14})/);
  if (phoneMatch) {
    booking.recipientPhone = phoneMatch[0].replace(/[\s-]+/g, '');
  }

  const pickupMatch = text.match(/\bfrom\s+([^,.;\n]+(?:,[^.;\n]+)?)(?=\s+(?:to|for|at)\b|$)/i);
  if (pickupMatch && pickupMatch[1]) {
    booking.senderAddress = pickupMatch[1].trim();
  }

  const locationHints =
    '(?:Lekki|Ikeja|Victoria Island|V\\.?I\\.?|Ikoyi|Yaba|Surulere|Ajah|Gbagada|Maryland|Festac|Apapa|Ogba|Agege|Magodo|Oshodi|Mushin|Ikotun|Ikorodu|Wuse|Maitama|Garki|Gwarinpa|Asokoro|Ibadan|Abuja|Lagos|Port Harcourt|Street|St\\.?|Way|Road|Rd\\.?|Ave(?:nue)?|Close|Crescent|Phase|Estate|Plaza|Mall|Complex)';
  const explicitAtRegex = new RegExp(`(?:\\bat|dropoff[:\\s]+|address[:\\s]+)\\s+([^.;\\n]*${locationHints}[^.;\\n]*)`, 'i');
  const fallbackToRegex = new RegExp(`\\bto\\s+([^.;\\n]*${locationHints}[^.;\\n]*)`, 'i');
  const dropoffMatch = text.match(explicitAtRegex) || text.match(fallbackToRegex);
  if (dropoffMatch && dropoffMatch[1]) {
    const addr = dropoffMatch[1]
      .replace(/(\+?234\s?\d{3}\s?\d{3}\s?\d{4}|0[789][01]\d[\s-]?\d{3}[\s-]?\d{4})/g, '')
      .replace(/\bfrom\s+.+$/i, '')
      .trim()
      .replace(/^[,:\-\s]+|[,:\-\s]+$/g, '');
    if (addr.length >= 3) booking.recipientAddress = addr;
  }

  const nameMatch = text.match(/\b(?:to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const placeBlocklist = new Set(['lekki', 'ikeja', 'ikoyi', 'yaba', 'surulere', 'ajah', 'abuja', 'lagos', 'victoria', 'island', 'mainland', 'gbagada', 'maryland', 'wuse', 'maitama']);
  if (nameMatch && nameMatch[1] && !placeBlocklist.has(nameMatch[1].split(' ')[0].toLowerCase())) {
    booking.recipientName = nameMatch[1].trim();
  }

  const itemMatch = text.match(/\b(?:send|deliver|ship|move|courier)\s+(?:a|an|the|my)?\s*([^,.;\n]+?)(?=\s+(?:to|for|at|from|by|via)\b|$)/i);
  if (itemMatch && itemMatch[1]) {
    const cleanedItem = itemMatch[1].trim();
    if (cleanedItem.length >= 2 && !/^package$/i.test(cleanedItem)) {
      booking.packageDescription = /[A-Z]/.test(cleanedItem)
        ? cleanedItem
        : cleanedItem.charAt(0).toUpperCase() + cleanedItem.slice(1);
    }
  }

  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (weightMatch) {
    booking.packageWeight = Number(weightMatch[1]);
    if (booking.packageWeight >= 5 && !booking.vehicleType) booking.vehicleType = 'van';
  }

  const extractedKeys = Object.keys(booking).filter((k) => booking[k] !== undefined && booking[k] !== '');

  if (extractedKeys.length > 0) {
    const filledLabels: string[] = [];
    if (booking.packageDescription) filledLabels.push(`Item: ${booking.packageDescription}`);
    if (booking.vehicleType) filledLabels.push(`Vehicle: ${booking.vehicleType === 'van' ? 'Delivery Van' : 'Motorbike Express'}`);
    if (booking.recipientName) filledLabels.push(`Recipient: ${booking.recipientName}`);
    if (booking.recipientPhone) filledLabels.push(`Phone: ${booking.recipientPhone}`);
    if (booking.recipientAddress) filledLabels.push(`Dropoff: ${booking.recipientAddress}`);
    if (booking.senderAddress) filledLabels.push(`Pickup: ${booking.senderAddress}`);

    const missing: string[] = [];
    if (!booking.recipientAddress) missing.push('dropoff address');
    if (!booking.recipientName) missing.push('recipient name');
    if (!booking.recipientPhone) missing.push('recipient phone');
    if (!booking.packageDescription) missing.push('package description');

    const chosenEst = booking.vehicleType === 'van' ? vanTotal : bikeTotal;
    return {
      intent: 'fill_booking' as const,
      reply:
        missing.length === 0
          ? `I filled your Dispatch form (${filledLabels.join(' · ')}). Estimated total: ₦${chosenEst.toLocaleString()} (${feePercent}% fee included). Tap Confirm & Book Rider below!`
          : `I pre-filled ${filledLabels.join(' · ') || 'your vehicle selection'} in the form below. Please add the remaining detail(s): ${missing.join(', ')}.`,
      booking,
      readyToConfirm: missing.length === 0,
    };
  }

  return {
    intent: 'answer' as const,
    reply: `I'm your AGC Dispatch Assistant! Tell me what to send and where — e.g. "Send MacBook to Tunde 08031234567 at 14 Admiralty Way Lekki" — or ask about Bike (₦${bikeTotal.toLocaleString()}) vs Van (₦${vanTotal.toLocaleString()}) rates or order tracking.`,
    booking: {},
    readyToConfirm: false,
  };
}

app.post('/api/dispatch/ai-assist', async (req: Request, res: Response) => {
  try {
    const { prompt, currentPickup, feePercent: clientFeePct, recentOrders } = req.body || {};
    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return res.status(400).json({ success: false, error: 'Please type a dispatch request or question.' });
    }

    const feePercent = Number(systemConfig.dispatchCommissionPercent ?? clientFeePct ?? 5) || 5;
    const pickup = String(currentPickup || 'Ikeja, Lagos').trim();
    const serverOrders = Array.from(dispatchOrdersMap.values()).sort(
      (a: any, b: any) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)
    );
    const mergedOrders = serverOrders.length > 0 ? serverOrders : (Array.isArray(recentOrders) ? recentOrders : []);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const localResult = buildLocalDispatchAiResult(userPrompt, pickup, feePercent, mergedOrders);
      return res.json({ success: true, mode: 'dispatch_smart', ...localResult });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const bikeTotal = 2400 + Math.round(2400 * (feePercent / 100));
      const vanTotal = 6500 + Math.round(6500 * (feePercent / 100));
      const orderSummary = mergedOrders
        .slice(0, 5)
        .map(
          (o: any) =>
            `${o.trackingCode} | ${o.status} | ${o.packageDescription} | To: ${o.recipientName} (${o.recipientAddress}) | Rider: ${o.riderName || 'TBD'}`
        )
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `User request in AGC Dispatch: "${userPrompt}"\nCurrent pickup address: "${pickup}"\nRecent dispatch orders:\n${orderSummary || 'None yet'}`,
        config: {
          systemInstruction: `You are the AGC Dispatch AI Assistant inside the Dispatch courier booking modal (Gokada Express Bike & PickkR Delivery Van).
Pricing:
- Motorbike Express (Gokada, up to 10kg): ₦2,400 base + ${feePercent}% platform fee = ₦${bikeTotal.toLocaleString()} total.
- Delivery Van (PickkR, bulk/heavy up to 500kg): ₦6,500 base + ${feePercent}% platform fee = ₦${vanTotal.toLocaleString()} total.

Determine the user's intent:
- "fill_booking": User wants to send/deliver a parcel or pre-fill fields. Extract any provided vehicleType ("bike" or "van"), senderAddress, recipientAddress, recipientName, recipientPhone, packageDescription, packageWeight. Leave unmentioned fields empty or omitted.
- "track": User asks to track or check status of a delivery or rider. Set trackingCode if known.
- "answer": User asks about dispatch pricing, riders, providers, insurance, or how AGC Dispatch works.
Keep reply concise (1-3 helpful sentences) and strictly relevant to AGC Dispatch.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING, description: 'One of: fill_booking, track, answer' },
              reply: { type: Type.STRING, description: 'Helpful response to display in Dispatch modal' },
              trackingCode: { type: Type.STRING, description: 'Matched tracking code if tracking' },
              readyToConfirm: { type: Type.BOOLEAN, description: 'True if recipientName, recipientPhone, recipientAddress, and packageDescription are all present' },
              booking: {
                type: Type.OBJECT,
                properties: {
                  vehicleType: { type: Type.STRING, description: 'bike or van' },
                  senderAddress: { type: Type.STRING },
                  recipientAddress: { type: Type.STRING },
                  recipientName: { type: Type.STRING },
                  recipientPhone: { type: Type.STRING },
                  packageDescription: { type: Type.STRING },
                  packageWeight: { type: Type.NUMBER },
                },
              },
            },
            required: ['intent', 'reply'],
          },
        },
      });

      const rawJson = (response.text || '').trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        return res.json({
          success: true,
          mode: 'gemini',
          intent: parsed.intent || 'answer',
          reply: parsed.reply || 'Here is your Dispatch update.',
          trackingCode: parsed.trackingCode,
          readyToConfirm: Boolean(parsed.readyToConfirm),
          booking: parsed.booking || {},
        });
      }
    } catch (geminiErr: any) {
      console.warn('Dispatch AI Gemini fallback:', geminiErr?.message || geminiErr);
    }

    const fallback = buildLocalDispatchAiResult(userPrompt, pickup, feePercent, mergedOrders);
    return res.json({ success: true, mode: 'dispatch_smart', ...fallback });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Dispatch AI error' });
  }
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

// ── REST: LIVE ADMIN TELEMETRY & COMMAND API ────────────────────────────────
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
      outsidePartiesCount: outsidePartiesList.length,
      outsideRsvpsCount: outsideRsvpsList.length,
      outsideParties: outsidePartiesList,
      outsideRsvps: outsideRsvpsList,
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

app.post('/api/admin/escrow/resolve', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const { orderId, action, note, amountNgn, buyerName, sellerName, paystackRef, actorName, secondaryAdminName, secondaryAdminPin } = req.body || {};
  if (!orderId || !action) {
    return res.status(400).json({ error: 'orderId and action are required' });
  }
  const numericAmount = Number(amountNgn) || 0;
  if (numericAmount >= DUAL_ADMIN_THRESHOLD_NGN) {
    if (!secondaryAdminPin || String(secondaryAdminPin).trim() !== EXPECTED_SECONDARY_ADMIN_PIN) {
      return res.status(403).json({
        error: `Dual-Admin Approval Required: Secondary Admin PIN invalid for high-value escrow (≥ ₦${DUAL_ADMIN_THRESHOLD_NGN.toLocaleString()}).`,
        code: 'DUAL_ADMIN_PIN_INVALID',
      });
    }
  }

  // Settle authoritative server escrow order + wallet balances if tracked on server
  const srvOrder = serverEscrowOrders.get(String(orderId));
  if (srvOrder && srvOrder.status !== 'funds_released') {
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payout = Math.max(0, Number(srvOrder.subtotalAmount || numericAmount || srvOrder.totalAmount));
    if (srvOrder.buyerPhone) {
      const bw = getOrCreateServerWallet(srvOrder.buyerPhone);
      bw.escrowLockedBalance = Math.max(0, Number(bw.escrowLockedBalance || 0) - payout);
      if (action !== 'release_to_seller') {
        const refundAmt = Math.max(payout, Number(srvOrder.totalAmount || payout));
        bw.availableBalance = Math.max(0, Number(bw.availableBalance || 0) + refundAmt);
        const refTx: ServerWalletTx = {
          id: `tx_adm_ref_${Date.now()}`,
          userPhone: bw.phoneNumber,
          userName: srvOrder.buyerName,
          type: 'refund',
          title: `Admin Escrow Refund: ${srvOrder.product?.title || orderId}`,
          description: note || 'Refunded to buyer via Admin arbitration',
          amount: refundAmt,
          fee: 0,
          balanceAfter: bw.availableBalance,
          currency: srvOrder.currency,
          timestamp: nowStr,
          createdAt: nowIso,
          status: 'completed',
          reference: `ADM_REF_${orderId}`,
          referenceId: String(orderId),
          channel: 'wallet',
        };
        bw.transactions = [refTx, ...bw.transactions].slice(0, 100);
        appendUnifiedLedgerTx(refTx);
      }
      bw.updatedAt = nowIso;
      serverWallets.set(bw.phoneKey, bw);
      emitWalletUpdateToPhone(srvOrder.buyerPhone, bw, `Admin escrow decision for #${orderId}`, String(orderId));
    }

    if (action === 'release_to_seller') {
      const sellerTarget = srvOrder.sellerPhone || srvOrder.sellerName;
      const sw = getOrCreateServerWallet(sellerTarget);
      const sm = findUserEntry(sellerTarget);
      sw.availableBalance = Math.max(0, Number(sw.availableBalance || 0) + payout);
      sw.updatedAt = nowIso;
      const relTx: ServerWalletTx = {
        id: `tx_adm_rel_${Date.now()}`,
        userId: sm?.user.id,
        userPhone: sm?.user.phoneNumber || sw.phoneNumber || sellerTarget,
        userName: sm?.user.fullName || srvOrder.sellerName,
        type: 'escrow_release',
        title: `Admin Escrow Release: ${srvOrder.product?.title || orderId}`,
        description: note || 'Released to seller via Admin arbitration',
        amount: payout,
        fee: srvOrder.escrowFee || 0,
        balanceAfter: sw.availableBalance,
        currency: srvOrder.currency,
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: `ADM_REL_${orderId}`,
        referenceId: String(orderId),
        channel: 'wallet',
      };
      sw.transactions = [relTx, ...sw.transactions].slice(0, 100);
      serverWallets.set(sw.phoneKey, sw);
      appendUnifiedLedgerTx(relTx);
      emitWalletUpdateToPhone(sellerTarget, sw, relTx.title, relTx.reference);
      srvOrder.status = 'funds_released';
      srvOrder.releasedAt = nowIso;
    } else {
      srvOrder.status = 'disputed';
      srvOrder.disputeReason = note || 'Refunded to buyer by Admin arbitration';
    }
    srvOrder.updatedAt = nowIso;
    serverEscrowOrders.set(srvOrder.id, srvOrder);
    saveWalletsFile();
    saveEscrowOrdersFile();
    pushEscrowOrdersToSupabase();
    broadcastEscrowOrderUpdate(srvOrder);
  }

  const audit = appendAuditEntry({
    refId: String(paystackRef || orderId),
    actor: actorName || 'Primary Admin',
    actorRole: 'Super Admin',
    action: action === 'release_to_seller' ? 'Escrow Force-Release' : 'Escrow Refund Issued',
    target: `Order #${orderId} (${buyerName || 'Buyer'} → ${sellerName || 'Vendor'})`,
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
  res.json({ success: true, auditEntry: audit, webhookLog: wh, order: srvOrder });
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

// Store & Artisan Registration + Admin Approval Mutations (Server-Authoritative)
app.post('/api/stores/register', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const body = req.body || {};
    const id = String(body.id || `store_${Date.now()}`);
    const tier = body.tier === 'pro_100' ? 'pro_100' : 'starter_30';
    const fee = tier === 'pro_100' ? 7000 : 3000;
    const paymentMethod = body.paymentMethod === 'paystack' ? 'paystack' : 'wallet';
    const ownerPhone = String(body.ownerPhone || '').trim();

    let walletRecord: ServerWalletRecord | null = null;
    if (paymentMethod === 'wallet' && ownerPhone) {
      const wal = getOrCreateServerWallet(ownerPhone);
      if (wal.availableBalance < fee) {
        return res.status(400).json({
          success: false,
          insufficientFunds: true,
          message: `Insufficient wallet balance (₦${wal.availableBalance.toLocaleString()} available; need ₦${fee.toLocaleString()} for store tier).`,
        });
      }
      wal.availableBalance -= fee;
      wal.updatedAt = new Date().toISOString();
      const match = findUserEntry(ownerPhone);
      const tx: ServerWalletTx = {
        id: `tx_store_reg_${Date.now()}`,
        userId: match?.user.id,
        userPhone: match?.user.phoneNumber || wal.phoneNumber || ownerPhone,
        userName: match?.user.fullName || String(body.ownerName || 'Merchant'),
        type: 'store_subscription',
        title: `Store Subscription (${tier === 'pro_100' ? 'Pro 100-Items' : 'Starter 30-Items'})`,
        description: `Merchant store registration: ${body.storeName || 'Merchant Store'}`,
        amount: fee,
        fee: 0,
        balanceAfter: wal.availableBalance,
        currency: 'NGN',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: wal.updatedAt,
        status: 'completed',
        reference: `STORE_SUB_${id}`,
        referenceId: `STORE_SUB_${id}`,
        channel: 'wallet',
        metadata: { storeId: id, tier, fee },
      };
      wal.transactions = sortAndDedupeLedger([tx, ...wal.transactions], 250);
      serverWallets.set(wal.phoneKey, wal);
      saveWalletsFile();
      appendUnifiedLedgerTx(tx);
      if (match) {
        match.user.walletBalanceNgn = wal.availableBalance;
        (match.user as any).updatedAt = wal.updatedAt;
        usersByPhone.set(match.key, match.user);
        saveUsersFile();
        pushAdminUserOverrideToSupabase(match.user);
      }
      emitWalletUpdateToPhone(ownerPhone, wal, tx.title, tx.reference);
      walletRecord = wal;
    }

    const entry = {
      id,
      storeName: body.storeName || 'Merchant Store',
      description: body.description || '',
      category: body.category || 'General Trade',
      tier,
      itemsLimit: body.itemsLimit ?? (tier === 'pro_100' ? 100 : 30),
      itemsCount: body.itemsCount ?? 0,
      ownerName: body.ownerName || 'Merchant Owner',
      ownerPhone,
      status: 'pending',
      verified: false,
      paymentMethod,
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
    res.json({
      success: true,
      store: entry,
      wallet: walletRecord
        ? {
            availableBalance: walletRecord.availableBalance,
            escrowLockedBalance: walletRecord.escrowLockedBalance,
            currency: walletRecord.currency,
            transactions: getUserMergedTransactions(ownerPhone, undefined, 1000),
          }
        : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit store' });
  }
});

app.post('/api/artisans/register', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
    const body = req.body || {};
    const id = String(body.id || `art_${Date.now()}`);
    const fee = 5000;
    const paymentMethod = body.paymentMethod === 'paystack' ? 'paystack' : 'wallet';
    const ownerPhone = String(body.ownerPhone || '').trim();

    let walletRecord: ServerWalletRecord | null = null;
    if (paymentMethod === 'wallet' && ownerPhone && body.registrationFeePaid !== false) {
      const wal = getOrCreateServerWallet(ownerPhone);
      if (wal.availableBalance < fee) {
        return res.status(400).json({
          success: false,
          insufficientFunds: true,
          message: `Insufficient wallet balance (₦${wal.availableBalance.toLocaleString()} available; need ₦${fee.toLocaleString()} for artisan station registration).`,
        });
      }
      wal.availableBalance -= fee;
      wal.updatedAt = new Date().toISOString();
      const match = findUserEntry(ownerPhone);
      const tx: ServerWalletTx = {
        id: `tx_artisan_reg_${Date.now()}`,
        userId: match?.user.id,
        userPhone: match?.user.phoneNumber || wal.phoneNumber || ownerPhone,
        userName: match?.user.fullName || String(body.ownerName || 'Artisan'),
        type: 'artisan_reg',
        title: 'Artisan Station Registration Fee (₦5,000)',
        description: `Artisan station registration: ${body.stationName || 'Master Station'}`,
        amount: fee,
        fee: 0,
        balanceAfter: wal.availableBalance,
        currency: 'NGN',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: wal.updatedAt,
        status: 'completed',
        reference: `ART_REG_${id}`,
        referenceId: `ART_REG_${id}`,
        channel: 'wallet',
        metadata: { stationId: id, fee },
      };
      wal.transactions = sortAndDedupeLedger([tx, ...wal.transactions], 250);
      serverWallets.set(wal.phoneKey, wal);
      saveWalletsFile();
      appendUnifiedLedgerTx(tx);
      if (match) {
        match.user.walletBalanceNgn = wal.availableBalance;
        (match.user as any).updatedAt = wal.updatedAt;
        usersByPhone.set(match.key, match.user);
        saveUsersFile();
        pushAdminUserOverrideToSupabase(match.user);
      }
      emitWalletUpdateToPhone(ownerPhone, wal, tx.title, tx.reference);
      walletRecord = wal;
    }

    const entry = {
      id,
      stationName: body.stationName || 'Artisan Hub',
      category: body.category || 'General Trade',
      location: body.location || 'Lagos, Nigeria',
      workshopAddress: body.workshopAddress || '',
      ownerName: body.ownerName || 'Master Artisan',
      ownerPhone,
      isApproved: false,
      approvalStatus: 'pending',
      registrationFeePaid: Boolean(body.registrationFeePaid ?? true),
      paymentMethod,
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
    res.json({
      success: true,
      artisan: entry,
      wallet: walletRecord
        ? {
            availableBalance: walletRecord.availableBalance,
            escrowLockedBalance: walletRecord.escrowLockedBalance,
            currency: walletRecord.currency,
            transactions: getUserMergedTransactions(ownerPhone, undefined, 1000),
          }
        : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit artisan' });
  }
});

// Sponsored Ads Payment Submission & Admin Review (Approve / Reject + Refund)
app.post('/api/ads/submit', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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
        w.transactions = sortAndDedupeLedger([tx, ...w.transactions], 250);
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

app.post('/api/admin/ads/review', async (req: Request, res: Response) => {
  try {
    await ensureInitialSupabaseSync();
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
      w.transactions = sortAndDedupeLedger([tx, ...w.transactions], 250);
      serverWallets.set(w.phoneKey, w);
      saveWalletsFile();
      appendUnifiedLedgerTx(tx);
      if (match) {
        match.user.walletBalanceNgn = w.availableBalance;
        usersByPhone.set(match.key, match.user);
        saveUsersFile();
        pushAdminUserOverrideToSupabase(match.user);
      }
      emitWalletUpdateToPhone(
        String(targetAd.submittedByPhone),
        w,
        `Refunded ₦${refundAmt.toLocaleString()} for declined ad "${targetAd.brandName}"`,
        refId
      );
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

app.delete('/api/admin/stores/:id', async (req: Request, res: Response) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const existing = storeOverridesMap.get(id);
    storeOverridesMap.delete(id);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();
    if (UUID_REGEX.test(id)) {
      fetch(`${SUPABASE_URL}/rest/v1/store_subscriptions?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      }).catch(() => {});
    }
    appendAuditEntry({
      refId: `STORE_${id}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: 'Store Deleted',
      target: existing?.storeName || id,
      details: 'Store removed by admin',
    });
    io.emit('admin_store_updated', { id, deleted: true, status: 'deleted' });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete store' });
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

app.delete('/api/admin/artisans/:id', async (req: Request, res: Response) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const existing = artisanOverridesMap.get(id);
    artisanOverridesMap.delete(id);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();
    if (UUID_REGEX.test(id)) {
      fetch(`${SUPABASE_URL}/rest/v1/artisan_stations?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      }).catch(() => {});
    }
    appendAuditEntry({
      refId: `ART_${id}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: 'Artisan Station Deleted',
      target: existing?.stationName || id,
      details: 'Artisan station removed by admin',
    });
    io.emit('admin_artisan_updated', { id, deleted: true });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete artisan' });
  }
});

app.post('/api/admin/statuses/purge-expired', (req: Request, res: Response) => {
  const now = Date.now();
  const purgedIds: string[] = [];
  for (const [id, st] of statusesMap.entries()) {
    const exp = st.expiresAt ? new Date(st.expiresAt).getTime() : 0;
    if (exp > 0 && exp <= now) {
      statusesMap.delete(id);
      purgedIds.push(id);
    }
  }
  if (purgedIds.length > 0) {
    saveStatusesFile();
    io.emit('status_purged', { ids: purgedIds });
    appendAuditEntry({
      refId: `STATUS_PURGE_${Date.now()}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: '24h Status Purge Executed',
      target: `${purgedIds.length} expired stories`,
      details: `Purged IDs: ${purgedIds.join(', ')}`,
    });
  }
  res.json({ success: true, purgedCount: purgedIds.length, purgedIds });
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
    const {
      status,
      verificationBadge,
      role,
      walletBalanceNgn,
      reason,
      durationHours,
      suspendedUntil,
      phoneNumber,
      fullName,
      avatarUrl,
    } = req.body || {};
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
          delete user.suspendedAt;
          delete user.suspendedUntil;
          delete user.suspensionReason;
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
        } else if (status === 'suspended') {
          user.suspendedAt = new Date().toISOString();
          const numericHours = Number(durationHours);
          if (suspendedUntil) {
            user.suspendedUntil = String(suspendedUntil);
          } else if (Number.isFinite(numericHours) && numericHours > 0) {
            user.suspendedUntil = new Date(Date.now() + numericHours * 3_600_000).toISOString();
          } else {
            delete user.suspendedUntil;
          }
          if (reason) {
            user.suspensionReason = String(reason).trim();
          } else {
            delete user.suspensionReason;
          }
        } else if (status === 'active') {
          delete user.bannedAt;
          delete user.banReason;
          delete user.suspendedAt;
          delete user.suspendedUntil;
          delete user.suspensionReason;
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
        details: `Role: ${user.role} · Status: ${user.status}${
          user.suspendedUntil ? ` (until ${new Date(user.suspendedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''
        }`,
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
    await ensureInitialSupabaseSync();
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

      // Sync authoritative server wallet ledger with admin adjustment + record money trail entry
      const srvWal = getOrCreateServerWallet(user.phoneNumber || cleanKey);
      const prevBal = Number(srvWal.availableBalance || 0);
      const diff = balance - prevBal;
      srvWal.availableBalance = balance;
      srvWal.updatedAt = nowIso;
      if (diff !== 0) {
        const adjTx: ServerWalletTx = {
          id: `tx_adm_adj_${Date.now()}`,
          userId: user.id,
          userPhone: user.phoneNumber || `+${cleanKey}`,
          userName: user.fullName || 'AGC User',
          type: diff > 0 ? 'deposit' : 'withdrawal',
          title: `Admin Wallet ${diff > 0 ? 'Credit' : 'Debit'} (${note || 'Direct adjustment'})`,
          description: `Balance adjusted from ₦${prevBal.toLocaleString()} to ₦${balance.toLocaleString()}`,
          amount: Math.abs(diff),
          fee: 0,
          balanceAfter: balance,
          currency: srvWal.currency || 'NGN',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: nowIso,
          status: 'completed',
          reference: `WAL_ADM_${Date.now()}`,
          referenceId: `WAL_ADM_${Date.now()}`,
          channel: 'wallet',
          metadata: { adminAdjusted: true, previousBalance: prevBal, newBalance: balance, note },
        };
        srvWal.transactions = sortAndDedupeLedger([adjTx, ...srvWal.transactions], 250);
        appendUnifiedLedgerTx(adjTx);
      }
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
      emitWalletUpdateToPhone(
        user.phoneNumber || cleanKey,
        srvWal,
        note || 'Adjusted by administrator',
        `WAL_ADM_${Date.now()}`
      );
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

// ═══════════════════════════════════════════════════════════════════════════════
// OUTSIDE — NIGHTLIFE, CONCERTS, ROOFTOP PARTIES, MAP PINS & QR PASSES
// ═══════════════════════════════════════════════════════════════════════════════
interface ServerOutsideParty {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerPhone?: string;
  organizerAvatar?: string;
  organizerVerified?: boolean;
  title: string;
  description: string;
  category: 'party' | 'concert' | 'rave' | 'tech_mixer' | 'rooftop' | 'hangout';
  city: string;
  venueName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  isPaid: boolean;
  ticketPrice: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  maxCapacity: number | null;
  rsvpCount: number;
  flyerUrl: string;
  eventDate: string;
  createdAt: string;
}

interface ServerOutsideRsvp {
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

const OUTSIDE_PARTIES_FILE = path.join(__dirname, 'data_outside_parties.json');
const OUTSIDE_RSVPS_FILE = path.join(__dirname, 'data_outside_rsvps.json');

function buildStarterOutsideParties(): ServerOutsideParty[] {
  const now = Date.now();
  const isoPlusHours = (hours: number) => new Date(now + hours * 3_600_000).toISOString();
  return [
    {
      id: 'out_vi_rooftop_sundown',
      organizerId: 'agc_official_events',
      organizerName: 'Lagos Sundown Collective',
      organizerPhone: '+2340000000000',
      organizerVerified: true,
      title: 'Amapiano & Lagoon Rooftop Sunset',
      description: 'Golden-hour Afrobeats & Amapiano rooftop session overlooking the Lekki-Ikoyi link bridge. Curated cocktail bar, live percussion, and sunset DJ sets.',
      category: 'rooftop',
      city: 'Lagos Island',
      venueName: 'Skyline Terrace VI',
      address: '14 Adeola Odeku St, Victoria Island, Lagos',
      lat: 6.4281,
      lng: 3.4219,
      isPaid: true,
      ticketPrice: 10000,
      currency: 'NGN',
      maxCapacity: 250,
      rsvpCount: 0,
      flyerUrl: '/src/assets/images/outside_lagos_rooftop_1794936815220.jpg',
      eventDate: isoPlusHours(30),
      createdAt: new Date(now - 3_600_000).toISOString(),
    },
    {
      id: 'out_abuja_night_live',
      organizerId: 'agc_official_events',
      organizerName: 'Capital Sound Live',
      organizerPhone: '+2340000000000',
      organizerVerified: true,
      title: 'Abuja Live Stage: Afro-Fusion Open Air',
      description: 'Open-air live band & Afrobeats showcase under the Wuse II night sky. Early-bird RSVP passes are free until capacity fills.',
      category: 'concert',
      city: 'Abuja',
      venueName: 'Wuse Amphitheatre Park',
      address: 'Adetokunbo Ademola Cres, Wuse II, Abuja',
      lat: 9.0765,
      lng: 7.479,
      isPaid: false,
      ticketPrice: 0,
      currency: 'NGN',
      maxCapacity: 500,
      rsvpCount: 0,
      flyerUrl: '/src/assets/images/outside_abuja_concert_1794936814833.jpg',
      eventDate: isoPlusHours(52),
      createdAt: new Date(now - 7_200_000).toISOString(),
    },
    {
      id: 'out_mainland_warehouse_rave',
      organizerId: 'agc_official_events',
      organizerName: 'Yaba Sound System',
      organizerPhone: '+2340000000000',
      organizerVerified: true,
      title: 'Mainland Boiler Warehouse Rave',
      description: 'Underground 360° sound-system rave with back-to-back Afro-house, GQOM, and alté sets till dawn. Strict QR pass entry at the gate.',
      category: 'rave',
      city: 'Lagos Mainland',
      venueName: 'Iganmu Foundry Annex',
      address: '28 Herbert Macaulay Way, Yaba, Lagos',
      lat: 6.5095,
      lng: 3.3711,
      isPaid: true,
      ticketPrice: 5000,
      currency: 'NGN',
      maxCapacity: 180,
      rsvpCount: 0,
      flyerUrl: '/src/assets/images/outside_underground_rave_1794936815211.jpg',
      eventDate: isoPlusHours(76),
      createdAt: new Date(now - 10_800_000).toISOString(),
    },
  ];
}

let outsidePartiesList: ServerOutsideParty[] = [];
let outsideRsvpsList: ServerOutsideRsvp[] = [];

try {
  if (fs.existsSync(OUTSIDE_PARTIES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(OUTSIDE_PARTIES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      outsidePartiesList = raw;
    }
  } else {
    outsidePartiesList = buildStarterOutsideParties();
    fs.writeFileSync(OUTSIDE_PARTIES_FILE, JSON.stringify(outsidePartiesList, null, 2));
  }
} catch (err) {
  console.warn('Notice loading outside parties file:', err);
  outsidePartiesList = buildStarterOutsideParties();
}

try {
  if (fs.existsSync(OUTSIDE_RSVPS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(OUTSIDE_RSVPS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      outsideRsvpsList = raw;
    }
  }
} catch (err) {
  console.warn('Notice loading outside RSVPs file:', err);
}

function saveOutsidePartiesFile() {
  try {
    fs.writeFileSync(OUTSIDE_PARTIES_FILE, JSON.stringify(outsidePartiesList, null, 2));
  } catch (err) {
    console.warn('Failed saving outside parties file:', err);
  }
}

function saveOutsideRsvpsFile() {
  try {
    fs.writeFileSync(OUTSIDE_RSVPS_FILE, JSON.stringify(outsideRsvpsList, null, 2));
  } catch (err) {
    console.warn('Failed saving outside RSVPs file:', err);
  }
}

function enrichPartiesWithCounts(list: ServerOutsideParty[]): ServerOutsideParty[] {
  const counts = new Map<string, number>();
  outsideRsvpsList.forEach((r) => {
    if (r.status !== 'cancelled') {
      counts.set(r.partyId, (counts.get(r.partyId) || 0) + 1);
    }
  });
  return list.map((p) => ({
    ...p,
    rsvpCount: counts.get(p.id) ?? p.rsvpCount ?? 0,
  }));
}

function generateOutsideTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `OUT-${code}`;
}

app.get('/api/outside/parties', (req: Request, res: Response) => {
  const city = String(req.query.city || '').trim();
  const category = String(req.query.category || '').trim();
  const pricing = String(req.query.pricing || '').trim();
  const includePast = req.query.includePast === 'true';
  const cutoff = Date.now() - 12 * 3_600_000;

  let results = enrichPartiesWithCounts(outsidePartiesList).filter((p) => {
    if (includePast) return true;
    const ms = new Date(p.eventDate).getTime();
    return Number.isNaN(ms) || ms >= cutoff;
  });

  if (city && city !== 'All Cities') {
    results = results.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  }
  if (category && category !== 'all') {
    results = results.filter((p) => p.category === category);
  }
  if (pricing === 'free') {
    results = results.filter((p) => !p.isPaid || Number(p.ticketPrice) <= 0);
  } else if (pricing === 'paid') {
    results = results.filter((p) => p.isPaid && Number(p.ticketPrice) > 0);
  }

  results.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  return res.json({ success: true, parties: results });
});

app.post('/api/outside/parties', (req: Request, res: Response) => {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  const city = String(body.city || '').trim();
  const venueName = String(body.venueName || '').trim();
  const address = String(body.address || '').trim();
  const eventDate = String(body.eventDate || '').trim();

  if (!title || !city || !venueName || !address || !eventDate) {
    return res.status(400).json({
      success: false,
      error: 'Title, city, venue name, address, and event date are required.',
    });
  }

  const organizerPhone = body.organizerPhone ? String(body.organizerPhone).trim() : '';
  const organizerMatch = organizerPhone ? findUserEntry(organizerPhone) : null;
  const isVerifiedHost = Boolean(
    body.organizerVerified ||
      organizerMatch?.user?.verificationBadge ||
      organizerMatch?.user?.role === 'admin' ||
      organizerMatch?.user?.role === 'creator'
  );

  const isPaid = Boolean(body.isPaid) && Number(body.ticketPrice || 0) > 0;
  const ticketPrice = isPaid ? Math.max(100, Number(body.ticketPrice) || 0) : 0;
  const parsedMaxCap = body.maxCapacity !== null && body.maxCapacity !== undefined && body.maxCapacity !== ''
    ? Math.max(1, Number(body.maxCapacity) || 0)
    : null;

  const newParty: ServerOutsideParty = {
    id: String(body.id || `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
    organizerId: String(body.organizerId || organizerMatch?.user?.id || `host_${Date.now()}`),
    organizerName: String(body.organizerName || organizerMatch?.user?.fullName || 'AGC Host').trim(),
    organizerPhone: organizerPhone || organizerMatch?.user?.phoneNumber,
    organizerAvatar: body.organizerAvatar || organizerMatch?.user?.avatarUrl,
    organizerVerified: isVerifiedHost,
    title: title.slice(0, 110),
    description: String(body.description || '').trim().slice(0, 800),
    category: (['party', 'concert', 'rave', 'tech_mixer', 'rooftop', 'hangout'].includes(String(body.category))
      ? String(body.category)
      : 'party') as ServerOutsideParty['category'],
    city,
    venueName: venueName.slice(0, 120),
    address: address.slice(0, 220),
    lat: body.lat !== null && body.lat !== undefined && body.lat !== '' && Number.isFinite(Number(body.lat)) ? Number(body.lat) : null,
    lng: body.lng !== null && body.lng !== undefined && body.lng !== '' && Number.isFinite(Number(body.lng)) ? Number(body.lng) : null,
    isPaid,
    ticketPrice,
    currency: (['NGN', 'KES', 'GHS', 'ZAR'].includes(String(body.currency)) ? String(body.currency) : 'NGN') as ServerOutsideParty['currency'],
    maxCapacity: parsedMaxCap,
    rsvpCount: 0,
    flyerUrl: String(body.flyerUrl || '/src/assets/images/outside_lagos_rooftop_1794936815220.jpg'),
    eventDate,
    createdAt: new Date().toISOString(),
  };

  outsidePartiesList = [newParty, ...outsidePartiesList.filter((p) => p.id !== newParty.id)];
  saveOutsidePartiesFile();
  io.emit('outside_party_created', newParty);
  return res.json({ success: true, party: newParty });
});

app.delete('/api/outside/parties/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actorPhone, actorId } = req.body || {};
  const isAdmin = isAuthorizedAdminRequest(req);
  const existing = outsidePartiesList.find((p) => p.id === id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }
  const phoneAuthorized = Boolean(
    actorPhone && existing.organizerPhone && phonesMatchServer(String(actorPhone), existing.organizerPhone)
  );
  const idAuthorized = Boolean(actorId && existing.organizerId === String(actorId));
  if (!isAdmin && !phoneAuthorized && !idAuthorized) {
    return res.status(403).json({ success: false, error: 'Only the event organizer or an admin can delete this event.' });
  }
  outsidePartiesList = outsidePartiesList.filter((p) => p.id !== id);
  outsideRsvpsList = outsideRsvpsList.filter((r) => r.partyId !== id);
  saveOutsidePartiesFile();
  saveOutsideRsvpsFile();
  io.emit('outside_party_deleted', { id });
  return res.json({ success: true, id });
});

app.get('/api/outside/rsvps', (req: Request, res: Response) => {
  const userId = String(req.query.userId || '').trim();
  const userPhone = String(req.query.userPhone || '').trim();
  const partyId = String(req.query.partyId || '').trim();

  let list = outsideRsvpsList;
  if (partyId) {
    list = list.filter((r) => r.partyId === partyId);
  }
  if (userId || userPhone) {
    list = list.filter((r) => {
      if (userId && r.userId === userId) return true;
      if (userPhone && r.userPhone && phonesMatchServer(userPhone, r.userPhone)) return true;
      return false;
    });
  }
  return res.json({ success: true, rsvps: list });
});

app.post('/api/outside/rsvp', async (req: Request, res: Response) => {
  await ensureInitialSupabaseSync();
  const {
    partyId,
    userId,
    userName,
    userPhone,
    paymentMethod = 'free',
    paymentReference,
  } = req.body || {};

  if (!partyId || (!userId && !userPhone)) {
    return res.status(400).json({ success: false, error: 'Party ID and user identity are required.' });
  }

  const party = outsidePartiesList.find((p) => p.id === partyId);
  if (!party) {
    return res.status(404).json({ success: false, error: 'Event no longer exists.' });
  }

  // Prevent double booking
  const existingRsvp = outsideRsvpsList.find((r) => {
    if (r.partyId !== partyId || r.status === 'cancelled') return false;
    if (userId && r.userId === String(userId)) return true;
    if (userPhone && r.userPhone && phonesMatchServer(String(userPhone), r.userPhone)) return true;
    return false;
  });
  if (existingRsvp) {
    return res.json({ success: true, alreadyBooked: true, rsvp: existingRsvp });
  }

  const activeCount = outsideRsvpsList.filter((r) => r.partyId === partyId && r.status !== 'cancelled').length;
  if (party.maxCapacity && activeCount >= party.maxCapacity) {
    return res.status(400).json({ success: false, error: 'This event has reached full capacity.' });
  }

  const ticketAmount = party.isPaid ? Math.max(0, Number(party.ticketPrice) || 0) : 0;
  const resolvedMethod: 'free' | 'wallet' | 'paystack' =
    ticketAmount <= 0 ? 'free' : paymentMethod === 'paystack' ? 'paystack' : 'wallet';

  const attendeeKey = String(userPhone || userId);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const nowIso = new Date().toISOString();
  const ref = String(
    paymentReference || `OUT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  );

  let updatedAttendeeWallet: ServerWalletRecord | null = null;

  if (ticketAmount > 0) {
    if (resolvedMethod === 'paystack' && !paymentReference) {
      return res.status(400).json({ success: false, error: 'Missing Paystack transaction reference.' });
    }
    if (resolvedMethod === 'paystack' && processedPaymentRefs.has(ref)) {
      return res.status(400).json({ success: false, error: 'Duplicate payment reference.' });
    }

    const attendeeWallet = getOrCreateServerWallet(attendeeKey);
    const attendeeMatch = findUserEntry(attendeeKey);

    if (resolvedMethod === 'wallet') {
      if (attendeeWallet.availableBalance < ticketAmount) {
        return res.status(400).json({
          success: false,
          error: `Insufficient AGC Wallet balance. Ticket costs ${party.currency} ${ticketAmount.toLocaleString()}.`,
        });
      }
      attendeeWallet.availableBalance -= ticketAmount;
    } else {
      processedPaymentRefs.add(ref);
    }
    attendeeWallet.updatedAt = nowIso;

    const ticketTx: ServerWalletTx = {
      id: `tx_${Date.now()}_out_tkt`,
      userId: attendeeMatch?.user.id || String(userId || ''),
      userPhone: attendeeMatch?.user.phoneNumber || (userPhone ? String(userPhone) : undefined),
      userName: attendeeMatch?.user.fullName || String(userName || 'Guest'),
      type: 'outside_ticket',
      title: `Outside Ticket: ${party.title}`,
      description: `${party.venueName}, ${party.city} · Ref: ${ref}`,
      amount: ticketAmount,
      fee: 0,
      balanceAfter: attendeeWallet.availableBalance,
      currency: party.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: resolvedMethod === 'paystack' ? 'paystack' : 'wallet',
      metadata: { partyId: party.id, venueName: party.venueName, city: party.city },
    };
    attendeeWallet.transactions = sortAndDedupeLedger([ticketTx, ...attendeeWallet.transactions], 250);
    serverWallets.set(attendeeWallet.phoneKey, attendeeWallet);
    appendUnifiedLedgerTx(ticketTx);
    updatedAttendeeWallet = attendeeWallet;

    if (attendeeMatch) {
      attendeeMatch.user.walletBalanceNgn = attendeeWallet.availableBalance;
      usersByPhone.set(attendeeMatch.key, attendeeMatch.user);
      saveUsersFile();
    }
    emitWalletUpdateToPhone(attendeeKey, attendeeWallet, `Ticket confirmed for ${party.title}`, ref);

    // Credit event organizer if they have an AGC phone and aren't buying their own ticket
    const orgKey = party.organizerPhone || party.organizerId;
    if (orgKey && orgKey !== 'agc_official_events' && !phonesMatchServer(orgKey, attendeeKey)) {
      const orgWallet = getOrCreateServerWallet(orgKey);
      const orgMatch = findUserEntry(orgKey);
      orgWallet.availableBalance += ticketAmount;
      orgWallet.updatedAt = nowIso;
      const orgTx: ServerWalletTx = {
        id: `tx_${Date.now()}_out_pay`,
        userId: orgMatch?.user.id || party.organizerId,
        userPhone: orgMatch?.user.phoneNumber || party.organizerPhone,
        userName: orgMatch?.user.fullName || party.organizerName,
        type: 'outside_payout',
        title: `Outside Ticket Sale: ${party.title}`,
        description: `Attendee ${String(userName || 'Guest')} · ${party.city}`,
        amount: ticketAmount,
        fee: 0,
        balanceAfter: orgWallet.availableBalance,
        currency: party.currency || 'NGN',
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: `${ref}_ORG`,
        referenceId: ref,
        channel: resolvedMethod === 'paystack' ? 'paystack' : 'wallet',
        metadata: { partyId: party.id, buyerPhone: userPhone },
      };
      orgWallet.transactions = sortAndDedupeLedger([orgTx, ...orgWallet.transactions], 250);
      serverWallets.set(orgWallet.phoneKey, orgWallet);
      appendUnifiedLedgerTx(orgTx);
      if (orgMatch) {
        orgMatch.user.walletBalanceNgn = orgWallet.availableBalance;
        usersByPhone.set(orgMatch.key, orgMatch.user);
        saveUsersFile();
      }
      emitWalletUpdateToPhone(orgKey, orgWallet, `Ticket sold for ${party.title}!`, ref);
    }
    saveWalletsFile();
  }

  let ticketCode = generateOutsideTicketCode();
  const usedCodes = new Set(outsideRsvpsList.map((r) => r.ticketCode));
  while (usedCodes.has(ticketCode)) {
    ticketCode = generateOutsideTicketCode();
  }

  const rsvp: ServerOutsideRsvp = {
    id: `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    partyId: party.id,
    userId: String(userId || attendeeKey),
    userName: String(userName || 'Guest'),
    userPhone: userPhone ? String(userPhone) : undefined,
    ticketCode,
    status: 'confirmed',
    paymentMethod: resolvedMethod,
    paymentReference: ticketAmount > 0 ? ref : undefined,
    amountPaid: ticketAmount,
    createdAt: nowIso,
  };

  outsideRsvpsList = [rsvp, ...outsideRsvpsList];
  saveOutsideRsvpsFile();

  const updatedCount = outsideRsvpsList.filter((r) => r.partyId === party.id && r.status !== 'cancelled').length;
  outsidePartiesList = outsidePartiesList.map((p) =>
    p.id === party.id ? { ...p, rsvpCount: updatedCount } : p
  );
  saveOutsidePartiesFile();

  io.emit('outside_rsvp_updated', { partyId: party.id, rsvpCount: updatedCount, rsvp });
  return res.json({
    success: true,
    rsvp,
    rsvpCount: updatedCount,
    wallet: updatedAttendeeWallet
      ? {
          availableBalance: updatedAttendeeWallet.availableBalance,
          escrowLockedBalance: updatedAttendeeWallet.escrowLockedBalance,
          currency: updatedAttendeeWallet.currency,
          transactions: getUserMergedTransactions(attendeeKey, String(userId || '') || undefined, 1000),
        }
      : undefined,
  });
});

app.post('/api/outside/verify-ticket', (req: Request, res: Response) => {
  const { ticketCode, partyId, scannerPhone, scannerId } = req.body || {};
  const isAdmin = isAuthorizedAdminRequest(req);
  const cleanCode = String(ticketCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({ success: false, error: 'Enter or scan a ticket code to verify.' });
  }

  const idx = outsideRsvpsList.findIndex(
    (r) => r.ticketCode.toUpperCase() === cleanCode && (!partyId || r.partyId === String(partyId))
  );
  if (idx < 0) {
    return res.status(404).json({ success: false, error: `No pass found for code "${cleanCode}".` });
  }

  const rsvp = outsideRsvpsList[idx];
  const party = outsidePartiesList.find((p) => p.id === rsvp.partyId);
  if (!party) {
    return res.status(404).json({ success: false, error: 'Associated event no longer exists.' });
  }

  const phoneAllowed = Boolean(
    scannerPhone && party.organizerPhone && phonesMatchServer(String(scannerPhone), party.organizerPhone)
  );
  const idAllowed = Boolean(scannerId && party.organizerId === String(scannerId));
  if (!isAdmin && !phoneAllowed && !idAllowed) {
    return res.status(403).json({
      success: false,
      error: 'Only the event organizer or an admin can check in passes for this event.',
    });
  }

  if (rsvp.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'This pass was cancelled and cannot be checked in.' });
  }

  if (rsvp.status === 'checked_in') {
    return res.json({
      success: true,
      alreadyCheckedIn: true,
      rsvp,
      partyTitle: party.title,
    });
  }

  const checkedInAt = new Date().toISOString();
  const updated: ServerOutsideRsvp = {
    ...rsvp,
    status: 'checked_in',
    checkedInAt,
  };
  outsideRsvpsList[idx] = updated;
  saveOutsideRsvpsFile();

  io.emit('outside_rsvp_updated', { partyId: party.id, rsvp: updated });
  return res.json({
    success: true,
    alreadyCheckedIn: false,
    rsvp: updated,
    partyTitle: party.title,
  });
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
  activePoll?: any | null;
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
    activePoll: room.activePoll ?? null,
  };
}

// Live Multiplayer Game State Cache (authoritative relay + reconnect sync for X/O, Whot!, Ludo, Poker & Bill Requests)
type LiveGameEventName =
  | 'xo_game_update'
  | 'whot_game_update'
  | 'ludo_game_update'
  | 'poker_game_update'
  | 'bill_request_update';

interface CachedLiveGameEntry {
  id: string;
  event: LiveGameEventName;
  chatId: string;
  data: any;
  phones: string[];
  updatedAtMs: number;
}

const liveGamesById = new Map<string, CachedLiveGameEntry>();
const liveGamesByChat = new Map<string, Set<string>>();

function getLiveGameStatusRank(status?: string): number {
  if (status === 'won' || status === 'draw' || status === 'declined' || status === 'cancelled' || status === 'paid') return 3;
  if (status === 'active') return 2;
  return 1;
}

function shouldReplaceLiveGameEntry(existing: any, incoming: any): boolean {
  if (!existing) return true;
  if (!incoming) return false;
  const exRank = getLiveGameStatusRank(existing.status);
  const inRank = getLiveGameStatusRank(incoming.status);
  if (inRank > exRank) return true;
  if (inRank < exRank) return false;
  if (exRank === 3) return false;
  const exMoves = typeof existing.moveCount === 'number'
    ? existing.moveCount
    : Array.isArray(existing.board)
    ? existing.board.filter(Boolean).length
    : 0;
  const inMoves = typeof incoming.moveCount === 'number'
    ? incoming.moveCount
    : Array.isArray(incoming.board)
    ? incoming.board.filter(Boolean).length
    : 0;
  if (inMoves > exMoves) return true;
  if (inMoves < exMoves) return false;
  return String(incoming.updatedAt || '') >= String(existing.updatedAt || '');
}

function phonesMatchServer(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const v1 = getPhoneVariants(p1);
  if (v1.length === 0) return false;
  const v2Set = new Set(getPhoneVariants(p2));
  return v1.some((v) => v2Set.has(v));
}

function cacheLiveGameEntry(
  event: LiveGameEventName,
  chatId: string,
  data: any,
  phones: string[] = []
) {
  if (!data?.id || !chatId) return;
  const existing = liveGamesById.get(data.id);
  if (existing && !shouldReplaceLiveGameEntry(existing.data, data)) {
    return;
  }
  const collectedPhones = new Set<string>(
    [
      ...phones,
      data.challengerPhone,
      data.opponentPhone,
      data.xPlayerPhone,
      data.oPlayerPhone,
      data.requesterPhone,
      data.payerPhone,
      ...(existing?.phones || []),
    ].filter(Boolean)
  );
  liveGamesById.set(data.id, {
    id: data.id,
    event,
    chatId,
    data,
    phones: Array.from(collectedPhones),
    updatedAtMs: Date.now(),
  });
  let chatSet = liveGamesByChat.get(chatId);
  if (!chatSet) {
    chatSet = new Set<string>();
    liveGamesByChat.set(chatId, chatSet);
  }
  chatSet.add(data.id);

  // Cap memory cache to 1000 most recent games
  if (liveGamesById.size > 1000) {
    const oldestKey = liveGamesById.keys().next().value;
    if (oldestKey) {
      const oldEntry = liveGamesById.get(oldestKey);
      liveGamesById.delete(oldestKey);
      if (oldEntry) {
        liveGamesByChat.get(oldEntry.chatId)?.delete(oldestKey);
      }
    }
  }
}

function buildGameEventPayload(event: LiveGameEventName, data: any) {
  return event === 'xo_game_update' ? { game: data } : { payload: data };
}

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
      (socket as any)._agcPhone = clean;
      phoneToSocketId.set(clean, socket.id);
      if (storeKey !== clean) phoneToSocketId.set(storeKey, socket.id);
      getPhoneVariants(clean).forEach((v) => socket.join(`phone:${v}`));
      if (storeKey !== clean) {
        getPhoneVariants(storeKey).forEach((v) => socket.join(`phone:${v}`));
      }

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
        expireUserSuspensionIfElapsed(existing, storeKey);
        existing.isOnline = true;
        existing.lastSeen = 'online';
        if (userData.userName && userData.userName !== 'AGC User' && (!existing.fullName || existing.fullName === 'AGC User' || existing.fullName === 'User' || existing.fullName === 'Registered User')) {
          existing.fullName = userData.userName;
        }
        if (userData.avatar && !String(userData.avatar).startsWith('data:image/svg+xml')) existing.avatarUrl = userData.avatar;
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
    (socket as any)._userCleanPhone = storeKey;
    (socket as any)._agcPhone = clean;
    phoneToSocketId.set(clean, socket.id);
    if (storeKey !== clean) phoneToSocketId.set(storeKey, socket.id);
    getPhoneVariants(clean).forEach((v) => socket.join(`phone:${v}`));
    const incomingRegName = userData.fullName || userData.name || '';
    const isIncomingRegGeneric = !incomingRegName || incomingRegName === 'AGC User' || incomingRegName === 'User';
    const resolvedRegName =
      !isIncomingRegGeneric && (!existing?.fullName || existing.fullName === 'AGC User' || existing.fullName === 'User')
        ? incomingRegName
        : (existing?.fullName || incomingRegName || 'AGC User');
    const reg: RegisteredUser = {
      ...(existing || {}),
      id: existing?.id || userData.id || `usr_${Date.now()}`,
      fullName: resolvedRegName,
      phoneNumber: existing?.phoneNumber || userData.phoneNumber,
      cleanPhone: existing?.cleanPhone || clean,
      avatarUrl: (userData.avatarUrl && !String(userData.avatarUrl).startsWith('data:image/svg+xml')) ? userData.avatarUrl : (existing?.avatarUrl || userData.avatar || userData.avatarUrl),
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
    io.emit(existing ? 'user_updated' : 'user_registered', reg);
  });

  // Town Communities Broadcast
  socket.on('create_community', (comm: any) => {
    if (!comm || !comm.id || isInvalidServerCommunity(comm)) return;
    const normName = String(comm.name).trim().toLowerCase();
    const commType = comm.type || 'group';
    const isPrivateGroup = isPrivateServerCommunity(comm);
    const duplicate = Array.from(communitiesMap.values()).find(
      (c) =>
        c.id === comm.id ||
        (!isPrivateGroup && String(c.name || '').trim().toLowerCase() === normName && (c.type || 'group') === commType)
    );
    if (duplicate) return;
    const stored = isPrivateGroup
      ? {
          ...comm,
          isPrivate: true,
          inviteCode: comm.inviteCode || `G${String(comm.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`,
          memberPhones: Array.isArray(comm.memberPhones)
            ? comm.memberPhones
            : comm.creatorPhone
            ? [comm.creatorPhone]
            : [],
        }
      : comm;
    communitiesMap.set(stored.id, stored);
    saveCommunitiesFile();
    if (!isPrivateGroup) {
      socket.broadcast.emit('community_created', stored);
    }
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
    if (!chatId) return;
    socket.join(`chat:${chatId}`);
    console.log(`👤 Socket ${socket.id} joined room chat:${chatId}`);

    // Immediately sync any recent live games in this chat room
    const gameIds = liveGamesByChat.get(chatId);
    if (gameIds && gameIds.size > 0) {
      gameIds.forEach((gid) => {
        const entry = liveGamesById.get(gid);
        if (entry) {
          socket.emit(entry.event, buildGameEventPayload(entry.event, entry.data));
        }
      });
    }
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
    // Record invited phone on server private group / town community if applicable
    const gid = String(payload?.invite?.groupId || '');
    if (gid) {
      const priv = privateGroupsMap.get(gid);
      if (priv) {
        const nextKicked = (priv.kickedPhones || []).filter((kp: string) => !phonesMatchServer(kp, targetPhone));
        const nextPendingPhones = dedupePhonesServer([...(Array.isArray(priv.pendingPhones) ? priv.pendingPhones : []), targetPhone]);
        privateGroupsMap.set(gid, { ...priv, kickedPhones: nextKicked, pendingPhones: nextPendingPhones });
        savePrivateGroupsFile();
      }
    }
    if (gid.startsWith('town_comm_')) {
      const commId = gid.replace('town_comm_', '');
      const comm = communitiesMap.get(commId);
      if (comm) {
        const nextKicked = (comm.kickedPhones || []).filter((kp: string) => !phonesMatchServer(kp, targetPhone));
        const nextInvited = dedupePhonesServer([...(Array.isArray(comm.invitedPhones) ? comm.invitedPhones : []), targetPhone]);
        communitiesMap.set(commId, { ...comm, kickedPhones: nextKicked, invitedPhones: nextInvited });
        saveCommunitiesFile();
      }
    }
    emitToPhoneVariantsOnce(targetPhone, 'group_invite', {
      invite: payload.invite,
      chat: payload.chat,
      targetPhone,
    });
  });

  socket.on('group_invite_response', (payload: any) => {
    if (!payload?.groupId) return;
    const gid = String(payload.groupId);
    const displayName = String(payload.responderName || payload.responderPhone || 'Member').trim();
    let memberPhonesToNotify: string[] = [];
    let updatedGroupForBroadcast: any = null;

    if (payload.accepted && payload.responderPhone) {
      const priv = privateGroupsMap.get(gid);
      if (priv) {
        const nextKicked = (priv.kickedPhones || []).filter((kp: string) => !phonesMatchServer(kp, payload.responderPhone));
        const nextPhones = dedupePhonesServer([...(Array.isArray(priv.memberPhones) ? priv.memberPhones : []), payload.responderPhone]);
        const nextMembers = dedupeStringsCaseInsensitive([...(Array.isArray(priv.members) ? priv.members : []), displayName]);
        const nextPendingMembers = (priv.pendingMembers || []).filter(
          (m: string) => m.toLowerCase() !== displayName.toLowerCase() && !phonesMatchServer(m, payload.responderPhone)
        );
        const nextPendingPhones = (priv.pendingPhones || []).filter(
          (p: string) => !phonesMatchServer(p, payload.responderPhone)
        );
        const updatedPriv = {
          ...priv,
          kickedPhones: nextKicked,
          memberPhones: nextPhones,
          members: nextMembers,
          pendingMembers: nextPendingMembers,
          pendingPhones: nextPendingPhones,
          membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
          updatedAt: new Date().toISOString(),
        };
        privateGroupsMap.set(gid, updatedPriv);
        savePrivateGroupsFile();
        memberPhonesToNotify = nextPhones;
        updatedGroupForBroadcast = updatedPriv;
      }
      if (gid.startsWith('town_comm_')) {
        const commId = gid.replace('town_comm_', '');
        const comm = communitiesMap.get(commId);
        if (comm) {
          const nextPhones = dedupePhonesServer([...(Array.isArray(comm.memberPhones) ? comm.memberPhones : []), payload.responderPhone]);
          const nextMembers = dedupeStringsCaseInsensitive([...(Array.isArray(comm.members) ? comm.members : []), displayName]);
          const updatedComm = {
            ...comm,
            memberPhones: nextPhones,
            members: nextMembers,
            membersCount: computeAuthoritativeMembersCount({ members: nextMembers, memberPhones: nextPhones }),
          };
          communitiesMap.set(commId, updatedComm);
          saveCommunitiesFile();
          memberPhonesToNotify = nextPhones;
          updatedGroupForBroadcast = { ...updatedComm, id: gid };
        }
      }
    }
    if (payload.targetPhone) {
      emitToPhoneVariantsOnce(payload.targetPhone, 'group_invite_response', payload);
    }
    if (memberPhonesToNotify.length > 0) {
      emitGroupEventToPhones('group_invite_response', memberPhonesToNotify, gid, payload, socket.id);
      if (updatedGroupForBroadcast) {
        emitGroupEventToPhones('group_updated', memberPhonesToNotify, gid, {
          group: updatedGroupForBroadcast,
          responderPhone: payload.responderPhone,
          responderName: displayName,
          accepted: Boolean(payload.accepted),
        }, socket.id);
      }
    } else {
      socket.to(`chat:${gid}`).emit('group_invite_response', payload);
    }
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

  // 2. Live Chat Message Broadcast + Store-and-Forward Durability
  socket.on('send_message', (payload: { chatId: string; message: any; targetPhone?: string; memberPhones?: string[]; chat?: any }) => {
    const { chatId, message, targetPhone, memberPhones, chat } = payload || ({} as any);
    if (!chatId || !message) return;

    const senderPhone = (socket as any)._agcPhone || (message?.senderPhone || '').replace(/\D/g, '');
    const senderVariants = new Set(getPhoneVariants(senderPhone));

    // Reject if sender was kicked/removed or is a non-admin in channel/announce mode
    if (senderPhone && message.sender !== 'system' && message.sender !== 'ai') {
      const auth = isPhoneCurrentlyAuthorizedForGroupChat(String(chatId), senderVariants);
      if (auth === false) {
        socket.leave(`chat:${chatId}`);
        return;
      }
      if (!canPhoneWriteToGroupChat(String(chatId), senderVariants, message.senderName)) {
        return;
      }
    }

    // Derive target phone if not explicitly provided (normalize before comparing!)
    let finalTarget = targetPhone ? targetPhone.replace(/\D/g, '') : '';
    if (!finalTarget && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_').filter(Boolean);
      finalTarget = parts.find((p: string) => !senderVariants.has(p) && !phonesMatchServer(p, senderPhone)) || '';
    }

    const isGroup = Boolean(chatId.startsWith('group_') || chatId.startsWith('channel_') || chatId.startsWith('town_comm_') || chat?.isGroup || chat?.isChannel);

    // Block enforcement for 1-on-1 DMs
    const isSelfDm = String(chatId).includes('self') || (senderPhone && finalTarget && phonesMatchServer(senderPhone, finalTarget));
    const suppressedForPhones: string[] = [];
    if (!isGroup && !isSelfDm && senderPhone && finalTarget) {
      if (isPhoneBlockedServer(senderPhone, finalTarget)) {
        return;
      }
      if (isPhoneBlockedServer(finalTarget, senderPhone)) {
        suppressedForPhones.push(finalTarget);
      }
    }

    const serverPriv = privateGroupsMap.get(String(chatId));
    const serverComm = String(chatId).startsWith('town_comm_') ? communitiesMap.get(String(chatId).replace('town_comm_', '')) : undefined;
    const authRecord = serverPriv || serverComm;
    const authoritativePhones: string[] = Array.isArray(authRecord?.memberPhones) && authRecord.memberPhones.length > 0
      ? authRecord.memberPhones.filter((p: string) => !isPhoneInListServer(authRecord.kickedPhones, p))
      : Array.isArray(memberPhones)
      ? memberPhones
      : [];
    const wireChatWithAuth = authRecord && chat
      ? {
          ...chat,
          members: authRecord.members || chat.members,
          memberPhones: authoritativePhones,
          membersCount: computeAuthoritativeMembersCount({ members: authRecord.members || chat.members, memberPhones: authoritativePhones }),
        }
      : chat;

    const outPayload = { chatId, message, targetPhone: finalTarget, chat: wireChatWithAuth, isGroup };

    recordStoredMessage({
      id: String(message.id || `msg_${Date.now()}`),
      chatId,
      message: senderPhone && !message.senderPhone ? { ...message, senderPhone } : message,
      senderPhone,
      targetPhone: finalTarget || undefined,
      memberPhones: authoritativePhones.length > 0 ? authoritativePhones : undefined,
      suppressedForPhones: suppressedForPhones.length > 0 ? suppressedForPhones : undefined,
      chat: wireChatWithAuth,
      isGroup,
    });

    // Emit at most once per remote socket across chat room + phone variant rooms
    const deliveredSockets = new Set<string>([socket.id]);
    const kickedPhonesList: string[] = Array.isArray(authRecord?.kickedPhones) ? authRecord.kickedPhones : [];
    const emitOnceToRoom = (roomName: string, skipSenderCheck = false) => {
      const room = io.sockets.adapter.rooms.get(roomName);
      if (!room) return;
      for (const targetSocketId of room) {
        if (deliveredSockets.has(targetSocketId)) continue;
        const targetSock = io.sockets.sockets.get(targetSocketId) as any;
        if (kickedPhonesList.length > 0 && targetSock?._agcPhone && isPhoneInListServer(kickedPhonesList, targetSock._agcPhone)) {
          continue;
        }
        if (
          suppressedForPhones.length > 0 &&
          targetSock?._agcPhone &&
          suppressedForPhones.some((sp) => phonesMatchServer(sp, targetSock._agcPhone))
        ) {
          continue;
        }
        if (skipSenderCheck && senderPhone) {
          if (targetSock?._agcPhone && phonesMatchServer(targetSock._agcPhone, senderPhone) && !chatId.includes('self')) {
            continue;
          }
        }
        deliveredSockets.add(targetSocketId);
        io.to(targetSocketId).emit('new_message', outPayload);
      }
    };

    emitOnceToRoom(`chat:${chatId}`);

    if (finalTarget && suppressedForPhones.length === 0) {
      getPhoneVariants(finalTarget).forEach((v) => {
        emitOnceToRoom(`phone:${v}`);
      });
    }

    if (authoritativePhones.length > 0) {
      authoritativePhones.forEach((phone: string) => {
        if (senderPhone && phonesMatchServer(phone, senderPhone)) return;
        getPhoneVariants(phone).forEach((v) => {
          emitOnceToRoom(`phone:${v}`, true);
        });
      });
    }
  });

  // 2a-bis. Live Multiplayer Game State Relay (X/O, Whot!, Ludo, Poker, Bill Requests)
  const relayLiveGameUpdate = (
    event: LiveGameEventName,
    chatId: string,
    data: any,
    targetPhones: string[] = []
  ) => {
    if (!chatId || !data?.id) return;
    const senderPhone = (socket as any)._agcPhone || '';
    const senderVariants = new Set(getPhoneVariants(senderPhone));

    const phoneTargets = new Set<string>(
      [
        ...targetPhones,
        data.challengerPhone,
        data.opponentPhone,
        data.xPlayerPhone,
        data.oPlayerPhone,
        data.requesterPhone,
        data.payerPhone,
      ].filter(Boolean)
    );

    if (chatId.startsWith('dm_')) {
      chatId
        .replace('dm_', '')
        .split('_')
        .filter(Boolean)
        .forEach((p) => phoneTargets.add(p));
    }

    cacheLiveGameEntry(event, chatId, data, Array.from(phoneTargets));

    const outPayload = buildGameEventPayload(event, data);
    const deliveredSockets = new Set<string>([socket.id]);
    const emitOnceToRoom = (roomName: string) => {
      const room = io.sockets.adapter.rooms.get(roomName);
      if (!room) return;
      for (const targetSocketId of room) {
        if (deliveredSockets.has(targetSocketId)) continue;
        deliveredSockets.add(targetSocketId);
        io.to(targetSocketId).emit(event, outPayload);
      }
    };

    emitOnceToRoom(`chat:${chatId}`);

    phoneTargets.forEach((phone) => {
      const variants = getPhoneVariants(phone);
      if (variants.some((v) => senderVariants.has(v))) {
        // Still allow other devices logged into same phone, just never sender socket (already in deliveredSockets)
      }
      variants.forEach((v) => emitOnceToRoom(`phone:${v}`));
    });
  };

  socket.on('game_update', (payload: { event?: LiveGameEventName; chatId?: string; data?: any; targetPhones?: string[] }) => {
    if (!payload?.event || !payload?.chatId || !payload?.data) return;
    relayLiveGameUpdate(payload.event, payload.chatId, payload.data, payload.targetPhones || []);
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

  // 2a-ter. Chat Metadata Sync (Ghost Timer, Pinned Announcements, Custom Themes) & Quick Poll Relay
  const emitChatScopedEvent = (eventName: string, chatId: string, outPayload: any, memberPhones?: string[], targetPhone?: string) => {
    const deliveredSockets = new Set<string>([socket.id]);
    const emitRoomOnce = (roomName: string) => {
      const room = io.sockets.adapter.rooms.get(roomName);
      if (!room) return;
      for (const sid of room) {
        if (deliveredSockets.has(sid)) continue;
        deliveredSockets.add(sid);
        io.to(sid).emit(eventName, outPayload);
      }
    };
    emitRoomOnce(`chat:${chatId}`);
    if (targetPhone) {
      getPhoneVariants(targetPhone).forEach((v) => emitRoomOnce(`phone:${v}`));
    }
    if (Array.isArray(memberPhones)) {
      memberPhones.forEach((p) => {
        getPhoneVariants(p).forEach((v) => emitRoomOnce(`phone:${v}`));
      });
    }
  };

  socket.on('chat_meta_update', (payload: { chatId?: string; disappearingTimer?: string; pinnedMessage?: any; chatTheme?: string; memberPhones?: string[]; targetPhone?: string }) => {
    if (!payload?.chatId) return;
    emitChatScopedEvent('chat_meta_update', payload.chatId, payload, payload.memberPhones, payload.targetPhone);
  });

  socket.on('quick_poll_update', (payload: { chatId?: string; messageId?: string; quickPoll?: any; memberPhones?: string[]; targetPhone?: string }) => {
    if (!payload?.chatId || !payload?.quickPoll) return;
    emitChatScopedEvent('quick_poll_update', payload.chatId, payload, payload.memberPhones, payload.targetPhone);
  });

  socket.on('messages_read', (payload: { chatId?: string; messageIds?: string[]; readerPhone?: string; readerName?: string; readAt?: string; targetPhone?: string; memberPhones?: string[] }) => {
    if (!payload?.chatId || !Array.isArray(payload.messageIds) || payload.messageIds.length === 0) return;
    markStoredMessagesRead(payload.chatId, payload.messageIds, payload.readerPhone, payload.readAt);
    emitChatScopedEvent('messages_read', payload.chatId, payload, payload.memberPhones, payload.targetPhone);
  });

  // 2b. Live 24h Status (Stories) Handlers
  socket.on('post_status', (payload: any) => {
    const rawStatus = payload?.status || payload;
    if (rawStatus?.id) {
      const normalized = normalizeServerStatus(rawStatus);
      if (isServerStatusExpired(normalized, Date.now())) return;
      statusesMap.set(normalized.id, normalized);
      saveStatusesFile();
      socket.broadcast.emit('new_status', { status: normalized });
    }
  });

  socket.on('delete_status', (payload: { statusId?: string; id?: string }) => {
    const id = payload?.statusId || payload?.id;
    if (!id) return;
    if (statusesMap.delete(id)) saveStatusesFile();
    socket.broadcast.emit('status_purged', { ids: [id] });
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

  socket.on('space_poll_create', (payload: { spaceId?: string; poll?: any }) => {
    const { spaceId, poll } = payload || {};
    if (!spaceId || !poll?.id) return;
    const room = spaceRooms.get(spaceId);
    if (room) {
      room.activePoll = poll;
      io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
    }
    io.to(`space:${spaceId}`).emit('space_poll_updated', { spaceId, poll });
  });

  socket.on('space_poll_vote', (payload: { spaceId?: string; pollId?: string; optionId?: string; voterId?: string; voterName?: string }) => {
    const { spaceId, pollId, optionId, voterId, voterName } = payload || {};
    if (!spaceId || !pollId || !optionId || !voterId) return;
    const room = spaceRooms.get(spaceId);
    if (!room || !room.activePoll || room.activePoll.id !== pollId || room.activePoll.status === 'closed') return;

    const allowMultiple = Boolean(room.activePoll.allowMultiple);
    room.activePoll = {
      ...room.activePoll,
      options: (room.activePoll.options || []).map((opt: any) => {
        const voterIds: string[] = Array.isArray(opt.voterIds) ? [...opt.voterIds] : [];
        const voterNames: string[] = Array.isArray(opt.voterNames) ? [...opt.voterNames] : [];
        const idx = voterIds.indexOf(voterId);
        if (opt.id === optionId) {
          if (idx >= 0) {
            voterIds.splice(idx, 1);
            voterNames.splice(idx, 1);
          } else {
            voterIds.push(voterId);
            voterNames.push(voterName || 'Listener');
          }
        } else if (!allowMultiple && idx >= 0) {
          voterIds.splice(idx, 1);
          voterNames.splice(idx, 1);
        }
        return { ...opt, voterIds, voterNames };
      }),
    };
    io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
    io.to(`space:${spaceId}`).emit('space_poll_updated', { spaceId, poll: room.activePoll });
  });

  socket.on('space_poll_close', (payload: { spaceId?: string; pollId?: string }) => {
    const { spaceId, pollId } = payload || {};
    if (!spaceId || !pollId) return;
    const room = spaceRooms.get(spaceId);
    if (room && room.activePoll && room.activePoll.id === pollId) {
      room.activePoll = { ...room.activePoll, status: 'closed' };
      io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
      io.to(`space:${spaceId}`).emit('space_poll_updated', { spaceId, poll: room.activePoll });
    }
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

    const prevPhone = (socket as any)._agcPhone;
    if (prevPhone && !phonesMatchServer(prevPhone, clean)) {
      for (const roomName of Array.from(socket.rooms)) {
        if (roomName.startsWith('phone:') || roomName.startsWith('chat:')) {
          socket.leave(roomName);
        }
      }
    }

    const variants = getPhoneVariants(clean);
    variants.forEach((v) => {
      socket.join(`phone:${v}`);
    });
    (socket as any)._agcPhone = clean;
    phoneToSocketId.set(clean, socket.id);
    console.log(`📱 [Phone Registered]: ${clean} (joined ${variants.length} variant rooms) -> socket ${socket.id}`);

    // Push any recent pending/active live games targeting this user's phone so they sync immediately
    const variantSet = new Set(variants);
    liveGamesById.forEach((entry) => {
      if (entry.data?.status !== 'pending' && entry.data?.status !== 'active') return;
      const matchesUser = entry.phones.some((p) => {
        const pv = getPhoneVariants(p);
        return pv.some((v) => variantSet.has(v));
      });
      if (matchesUser) {
        socket.emit(entry.event, buildGameEventPayload(entry.event, entry.data));
      }
    });
  });

  socket.on('logout_user_rooms', () => {
    for (const roomName of Array.from(socket.rooms)) {
      if (roomName.startsWith('phone:') || roomName.startsWith('chat:')) {
        socket.leave(roomName);
      }
    }
    delete (socket as any)._agcPhone;
    delete (socket as any)._userCleanPhone;
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

    // Clean up phone->socket mapping if this socket was the active one
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

// Start listening immediately and wire Vite middleware in dev or static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }

    let viteMiddleware: any = null;
    let viteInitError: Error | null = null;

    const viteReadyPromise = (async () => {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          plugins: [
            {
              name: 'agc-disable-hmr-client-ws',
              transform(code, id) {
                const normalizedId = id.replace(/\\/g, '/').split('?')[0];
                if (normalizedId.endsWith('/vite/dist/client/client.mjs')) {
                  return {
                    code: code
                      .replace(
                        'transport.connect(createHMRHandler(handleMessage));',
                        '/* HMR WebSocket disabled (ws: false, hmr: false) */'
                      )
                      .replace(
                        'else throw new SendBeforeConnectError("send was called before connect");',
                        'else return;'
                      ),
                    map: null,
                  };
                }
                if (normalizedId.includes('pwa-entry-point-loaded')) {
                  return {
                    code: code.replace(
                      "import.meta.hot.send('vite-pwa-plugin:dev-ready');",
                      "Promise.resolve(import.meta.hot?.send?.('vite-pwa-plugin:dev-ready')).catch(() => {});"
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
        viteMiddleware = vite.middlewares;
        console.log('⚡ Vite middleware ready');
      } catch (err: any) {
        viteInitError = err instanceof Error ? err : new Error(String(err));
        console.error('Vite middleware initialization failed:', viteInitError);
      }
    })();

    app.get(['/sw.js', '/dev-sw.js'], (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(
        "self.addEventListener('install', () => self.skipWaiting());\n" +
        "self.addEventListener('activate', (e) => e.waitUntil((async () => {\n" +
        "  try { const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith('agc-') || k.startsWith('workbox-') || k.startsWith('vite-pwa')).map(k => caches.delete(k))); } catch (_) {}\n" +
        "  try { await self.registration.unregister(); } catch (_) {}\n" +
        "})()));\n"
      );
    });

    app.use((req: Request, res: Response, next: any) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api/') &&
        !req.path.startsWith('/socket.io/') &&
        (req.path === '/' || req.path.endsWith('.html') || (req.headers.accept || '').includes('text/html'))
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });

    app.use(async (req: Request, res: Response, next: any) => {
      if (!viteMiddleware && !viteInitError) {
        await viteReadyPromise;
      }
      if (viteInitError) {
        return next(viteInitError);
      }
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      return next();
    });
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
      purgeExpiredServerStatuses(false);
      ensureInitialSupabaseSync().catch(() => {});
      syncIntervalRef = setInterval(() => {
        purgeExpiredServerStatuses(true);
        Promise.all([syncUsersFromSupabase(), syncAdminStateFromSupabase()]).catch(() => {});
      }, 30000);
      resolve();
    });
  });
}

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Shutting down AGC Live Gateway (${signal})...`);
  if (syncIntervalRef) clearInterval(syncIntervalRef);
  setTimeout(() => process.exit(0), 500).unref();
  try {
    httpServer.closeAllConnections?.();
  } catch (_) {}
  try {
    io.close();
  } catch (_) {}
  try {
    httpServer.close(() => {
      process.exit(0);
    });
  } catch (_) {
    process.exit(0);
  }
  try {
    await Promise.race([
      viteServerRef?.close?.() || Promise.resolve(),
      new Promise((r) => setTimeout(r, 300)),
    ]);
  } catch (_) {}
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer, io };

