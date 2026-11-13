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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Enable CORS for Express REST routes (allow any local or hosted origin)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// ── CUSTOM APPLICATION FIREWALL (WAF) & THREAT INSPECTION ──────────────────
const SQLI_REGEX = /(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|update\s+.*\s+set|delete\s+from|sleep\(\d+\)|benchmark\(|waitfor\s+delay|--|\/\*|\*\/|;\s*drop|'\s*or\s*['\d]=['\d])/i;
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

// WAF Middleware applied to all incoming HTTP requests
app.use((req: Request, res: Response, next) => {
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
}

const usersByPhone = new Map<string, RegisteredUser>();

// ── Single-Session Enforcement: phone → active socket id ──────────────────────
// When a phone logs in on a new device/tab, the old socket receives 'force_logout'
const phoneToSocketId = new Map<string, string>();
const USERS_FILE = path.join(__dirname, 'data_users.json');
const COMMUNITIES_FILE = path.join(__dirname, 'data_communities.json');
const STATUSES_FILE = path.join(__dirname, 'data_statuses.json');
const communitiesMap = new Map<string, any>();
const statusesMap = new Map<string, any>();

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
        if (u.cleanPhone) usersByPhone.set(u.cleanPhone, u);
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
  const user: RegisteredUser = {
    id: id || `usr_${Date.now()}`,
    fullName: fullName || 'AGC User',
    phoneNumber,
    cleanPhone,
    avatarUrl,
    about: about || 'Available · Using AGC',
    registeredAt: new Date().toISOString(),
    role: role || 'user',
  };
  usersByPhone.set(cleanPhone, user);
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
    usersByPhone.set(cleanPhone, user);
  }

  res.json({ success: true, user, alreadyRegistered: false });
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
    return res.json({
      registered: true,
      name: existing.fullName,
      avatarUrl: existing.avatarUrl,
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

// REST: List all registered users
app.get('/api/users', (_req: Request, res: Response) => {
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

  // User presence registration
  socket.on('user_online', (userData: { userId: string; userName: string; avatar?: string; phoneNumber?: string }) => {
    onlineUsers.set(socket.id, userData);
    if (userData?.phoneNumber) {
      const clean = userData.phoneNumber.replace(/\D/g, '');
      socket.join(`phone:${clean}`);
      if (!usersByPhone.has(clean)) {
        usersByPhone.set(clean, {
          id: userData.userId,
          fullName: userData.userName,
          phoneNumber: userData.phoneNumber,
          cleanPhone: clean,
          avatarUrl: userData.avatar,
          registeredAt: new Date().toISOString(),
        });
        saveUsersFile();
      }
    }
    io.emit('presence_update', Array.from(onlineUsers.values()));
  });

  // User registration event
  socket.on('register_user', (userData: any) => {
    if (!userData?.phoneNumber) return;
    const clean = userData.phoneNumber.replace(/\D/g, '');
    const reg: RegisteredUser = {
      id: userData.id || `usr_${Date.now()}`,
      fullName: userData.fullName || userData.name || 'AGC User',
      phoneNumber: userData.phoneNumber,
      cleanPhone: clean,
      avatarUrl: userData.avatarUrl || userData.avatar,
      about: userData.about || 'Available · Using AGC',
      registeredAt: new Date().toISOString(),
      role: userData.role || 'user',
    };
    usersByPhone.set(clean, reg);
    saveUsersFile();
    socket.join(`phone:${clean}`);
    socket.broadcast.emit('user_registered', reg);
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

  // Disconnect handler
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('presence_update', Array.from(onlineUsers.values()));
    // Clean up phone→socket mapping if this socket was the active one
    const agcPhone = (socket as any)._agcPhone;
    if (agcPhone && phoneToSocketId.get(agcPhone) === socket.id) {
      phoneToSocketId.delete(agcPhone);
    }
    console.log(`🔌 [Socket Disconnected]: ${socket.id}`);
  });
});

// Start listening
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AGC Live Gateway running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket & User Registry ready`);
});

export { app, httpServer, io };
