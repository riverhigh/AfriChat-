import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

app.use(express.json());

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
  const existing = usersByPhone.get(clean);
  if (existing) {
    return res.json({ registered: true, name: existing.fullName, avatarUrl: existing.avatarUrl });
  }
  return res.json({ registered: false });
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

  // 1. Join Chat Conversation Room (1-on-1 or Group)
  socket.on('join_chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    console.log(`👤 Socket ${socket.id} joined room chat:${chatId}`);
  });

  // Leave Chat Room
  socket.on('leave_chat', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  // 2. Live Chat Message Broadcast
  socket.on('send_message', (payload: { chatId: string; message: any; targetPhone?: string }) => {
    const { chatId, message, targetPhone } = payload;
    // Broadcast to everyone else in this chat room
    socket.to(`chat:${chatId}`).emit('new_message', { chatId, message });
    // Also broadcast to target user's phone channel so incoming messages update their chat list
    if (targetPhone) {
      const cleanTarget = targetPhone.replace(/\D/g, '');
      socket.to(`phone:${cleanTarget}`).emit('new_message', { chatId, message });
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
    const sessionToken = typeof payload === 'object' ? payload.sessionToken : undefined;
    const clean = rawPhone.replace(/\D/g, '');
    if (!clean) return;

    // 🔒 Single-session enforcement via Socket.io
    const existingSocketId = phoneToSocketId.get(clean);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        existingSocket.emit('force_logout', {
          reason: 'new_device_login',
          message: 'Your account was opened on another device.',
        });
        existingSocket.disconnect(true);
      }
    }

    phoneToSocketId.set(clean, socket.id);
    socket.join(`phone:${clean}`);
    // Store phone on socket for cleanup on disconnect
    (socket as any)._agcPhone = clean;
    console.log(`📱 [Phone Registered]: ${clean} → socket ${socket.id}`);
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
