import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

let socket: Socket | null = null;

// Determine backend URL (dynamic hostname allows phone and laptop on same Wi-Fi to connect)
const getSocketUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const envUrl = import.meta.env.VITE_SOCKET_URL as string;
    if (envUrl) return envUrl;

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
    if (isLocal) {
      return `http://${hostname}:3002`;
    }
  }
  return '';
};

export const initSocket = (user?: { id: string; name: string; avatar?: string; phone?: string }): Socket => {
  if (!socket) {
    const url = getSocketUrl();
    socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('🟢 [AfriChat Live]: Connected to Socket.io Gateway on port 3002 (ID:', socket?.id, ')');
      if (user) {
        socket?.emit('user_online', { userId: user.id, userName: user.name, avatar: user.avatar });
        if (user.phone) {
          const cleanPhone = user.phone.replace(/\D/g, '');
          socket?.emit('register_phone', cleanPhone);
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [AfriChat Live]: Socket connection deferred:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [AfriChat Live]: Disconnected:', reason);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

// 1. Chat Rooms
export const joinChatRoom = (chatId: string) => {
  if (socket?.connected) {
    socket.emit('join_chat', chatId);
  }
};

export const leaveChatRoom = (chatId: string) => {
  if (socket?.connected) {
    socket.emit('leave_chat', chatId);
  }
};

export const emitLiveMessage = (chatId: string, message: ChatMessage) => {
  if (socket?.connected) {
    socket.emit('send_message', { chatId, message });
  }
};

export const emitTypingIndicator = (chatId: string, userName: string, isTyping: boolean) => {
  if (socket?.connected) {
    socket.emit('typing', { chatId, userName, isTyping });
  }
};

// 2. Audio Spaces / Street Radio
export const joinLiveSpace = (spaceId: string, user: { id: string; name: string; avatar?: string }) => {
  if (socket?.connected) {
    socket.emit('join_space', { spaceId, user });
  }
};

export const leaveLiveSpace = (spaceId: string, userId: string) => {
  if (socket?.connected) {
    socket.emit('leave_space', { spaceId, userId });
  }
};

export const emitSpaceSpeaking = (spaceId: string, userId: string, isSpeaking: boolean) => {
  if (socket?.connected) {
    socket.emit('space_speaking', { spaceId, userId, isSpeaking });
  }
};

// 3. WebRTC Call Relays
export const joinWebRTCCallRoom = (roomId: string) => {
  if (socket?.connected) {
    socket.emit('join_call_room', roomId);
  }
};

export const emitCallSignal = (roomId: string, event: string, data: any) => {
  if (socket?.connected) {
    socket.emit('call_signal', { roomId, event, data });
  }
};
