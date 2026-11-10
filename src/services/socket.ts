import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

let socket: Socket | null = null;

// Determine backend URL (dynamic hostname allows phone and laptop on same Wi-Fi to connect)
export const getSocketUrl = (): string => {
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
      console.log('🟢 [AGC Live]: Connected to Socket.io Gateway on port 3002 (ID:', socket?.id, ')');
      if (user) {
        socket?.emit('user_online', { userId: user.id, userName: user.name, avatar: user.avatar, phoneNumber: user.phone });
        if (user.phone) {
          const cleanPhone = user.phone.replace(/\D/g, '');
          socket?.emit('register_phone', cleanPhone);
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [AGC Live]: Socket connection deferred:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [AGC Live]: Disconnected:', reason);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const registerSocketUser = (user: { id: string; fullName: string; phoneNumber: string; avatarUrl?: string; about?: string; role?: string }) => {
  if (socket?.connected) {
    socket.emit('register_user', user);
    if (user.phoneNumber) {
      socket.emit('register_phone', user.phoneNumber.replace(/\D/g, ''));
    }
  }
};

// 1. Chat Rooms
export const joinChatRoom = (chatId: string) => {
  const s = getSocket();
  s?.emit('join_chat', chatId);
};

export const leaveChatRoom = (chatId: string) => {
  const s = getSocket();
  s?.emit('leave_chat', chatId);
};

// 2. Chat Message Signaling
export const emitLiveMessage = (chatId: string, message: ChatMessage, targetPhone?: string) => {
  const s = getSocket();
  s?.emit('send_message', { chatId, message, targetPhone });
};

// 3. Audio Spaces / Street Radio
export const joinSpaceRoom = (spaceId: string, user: { id: string; name: string; avatar?: string }) => {
  const s = getSocket();
  s?.emit('join_space', { spaceId, user });
};

export const leaveSpaceRoom = (spaceId: string, userId: string) => {
  const s = getSocket();
  s?.emit('leave_space', { spaceId, userId });
};

export const joinLiveSpace = joinSpaceRoom;
export const leaveLiveSpace = leaveSpaceRoom;

export const emitSpaceSpeaking = (spaceId: string, userId: string, isSpeaking: boolean) => {
  const s = getSocket();
  s?.emit('space_speaking', { spaceId, userId, isSpeaking });
};

// 4. WebRTC Video/Voice Calling
export const joinWebRTCCallRoom = (roomId: string) => {
  const s = getSocket();
  s?.emit('join_call_room', roomId);
};

export const emitCallSignal = (roomId: string, event: string, data: any) => {
  const s = getSocket();
  s?.emit('call_signal', { roomId, event, data });
};

export const emitPhoneCallSignal = (targetPhone: string, data: any) => {
  const s = getSocket();
  s?.emit('phone_call_signal', { targetPhone, data });
};

export const registerSocketPhone = (cleanPhone: string) => {
  const s = getSocket();
  s?.emit('register_phone', cleanPhone.replace(/\D/g, ''));
};

// 5. Live 24h Status (Stories) Signaling
export const emitPostStatus = (status: any) => {
  const s = getSocket();
  s?.emit('post_status', { status });
};

export const emitViewStatus = (statusId: string, viewer: any) => {
  const s = getSocket();
  s?.emit('view_status', { statusId, viewer });
};

export const emitLikeStatus = (statusId: string, liked: boolean, likerId: string, likerName?: string) => {
  const s = getSocket();
  s?.emit('like_status', { statusId, liked, likerId, likerName });
};
