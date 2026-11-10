import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

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
    service: 'AfriChat Real-Time Live Gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    port: PORT,
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

// Real-Time Socket Connection Handlers
io.on('connection', (socket: Socket) => {
  console.log(`⚡ [Socket Connected]: ${socket.id}`);

  // User presence registration
  socket.on('user_online', (userData: { userId: string; userName: string; avatar?: string }) => {
    onlineUsers.set(socket.id, userData);
    io.emit('presence_update', Array.from(onlineUsers.values()));
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
  socket.on('send_message', (payload: { chatId: string; message: any }) => {
    const { chatId, message } = payload;
    // Broadcast to everyone else in this chat room
    socket.to(`chat:${chatId}`).emit('new_message', { chatId, message });
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
  socket.on('phone_call_signal', (payload: { targetPhone: string; data: any }) => {
    // Broadcast to target phone room
    io.to(`phone:${payload.targetPhone}`).emit('incoming_call', payload.data);
  });

  socket.on('register_phone', (cleanPhone: string) => {
    socket.join(`phone:${cleanPhone}`);
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
    console.log(`🔌 [Socket Disconnected]: ${socket.id}`);
  });
});

// Start listening
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AfriChat Live Gateway running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for live chats & Street Radio spaces`);
});

export { app, httpServer, io };
