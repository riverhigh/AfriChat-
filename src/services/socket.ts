import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

let socket: Socket | null = null;
let latestSocketUser: { id: string; name: string; avatar?: string; phone?: string; sessionToken?: string } | undefined;

// Determine backend URL (same-origin on port 3000, or explicit VITE_SOCKET_URL override)
export const getSocketUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const envUrl = import.meta.env.VITE_SOCKET_URL as string;
    if (envUrl) return envUrl;
  }
  return '';
};

export const initSocket = (user?: { id: string; name: string; avatar?: string; phone?: string; sessionToken?: string }): Socket => {
  if (user && (user.id || user.phone)) {
    latestSocketUser = user;
  }
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
      console.log('🟢 [AGC Live]: Connected to Socket.io Gateway (ID:', socket?.id, ')');
      if (latestSocketUser) {
        socket?.emit('user_online', {
          userId: latestSocketUser.id,
          userName: latestSocketUser.name,
          avatar: latestSocketUser.avatar,
          phoneNumber: latestSocketUser.phone,
          sessionToken: latestSocketUser.sessionToken,
        });
        if (latestSocketUser.phone) {
          const cleanPhone = latestSocketUser.phone.replace(/\D/g, '');
          socket?.emit('register_phone', {
            phone: cleanPhone,
            sessionToken: latestSocketUser.sessionToken,
          });
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

export const registerSocketUser = (user: { id: string; fullName: string; phoneNumber: string; avatarUrl?: string; about?: string; role?: string; sessionToken?: string }) => {
  latestSocketUser = {
    id: user.id,
    name: user.fullName,
    avatar: user.avatarUrl,
    phone: user.phoneNumber,
    sessionToken: user.sessionToken,
  };
  if (socket?.connected) {
    socket.emit('register_user', user);
    if (user.phoneNumber) {
      socket.emit('register_phone', {
        phone: user.phoneNumber.replace(/\D/g, ''),
        sessionToken: user.sessionToken,
      });
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
export const emitLiveMessage = (chatId: string, message: ChatMessage, targetPhone?: string, memberPhones?: string[], chat?: any) => {
  const s = getSocket();
  s?.emit('send_message', { chatId, message, targetPhone, memberPhones, chat });
};

export const emitMessageReaction = (
  chatId: string,
  messageId: string,
  emoji: string,
  reactorName: string,
  memberPhones?: string[],
  targetPhone?: string
) => {
  const s = getSocket();
  s?.emit('message_reaction', { chatId, messageId, emoji, reactorName, memberPhones, targetPhone });
};

export const emitCreateGroup = (chat: any, memberPhones: string[]) => {
  const s = getSocket();
  s?.emit('create_group', { chat, memberPhones });
};

export const emitGroupInvite = (invite: any, chat: any, targetPhone: string) => {
  const s = getSocket();
  s?.emit('group_invite', { invite, chat, targetPhone });
};

export const emitGroupInviteResponse = (payload: {
  inviteId: string;
  groupId: string;
  responderPhone: string;
  responderName: string;
  accepted: boolean;
  targetPhone?: string;
}) => {
  const s = getSocket();
  s?.emit('group_invite_response', payload);
};

// 3. Audio Spaces / Street Radio
export const joinSpaceRoom = (
  spaceId: string,
  user: { id: string; name: string; avatar?: string; isAnonymous?: boolean },
  spaceMeta?: { hostId?: string; hostPhone?: string; hostName?: string; hostAvatar?: string; speakers?: any[]; pinnedNote?: string }
) => {
  const s = getSocket();
  s?.emit('join_space', { spaceId, user, spaceMeta });
};

export const leaveSpaceRoom = (spaceId: string, userId: string) => {
  const s = getSocket();
  s?.emit('leave_space', { spaceId, userId });
};

export const joinLiveSpace = joinSpaceRoom;
export const leaveLiveSpace = leaveSpaceRoom;

export const emitSpaceSpeaking = (spaceId: string, userId: string, isSpeaking: boolean, audioLevel?: number) => {
  const s = getSocket();
  s?.emit('space_speaking', { spaceId, userId, isSpeaking, audioLevel });
};

export const emitSpaceReaction = (spaceId: string, userId: string, userName: string, emoji: string, id?: number) => {
  const s = getSocket();
  s?.emit('space_reaction', { spaceId, userId, userName, emoji, id });
};

export const emitSpaceRaiseHand = (spaceId: string, user: { id: string; name: string; avatar?: string }, raised: boolean) => {
  const s = getSocket();
  s?.emit('space_raise_hand', { spaceId, user, raised });
};

export const emitSpaceStageAction = (
  spaceId: string,
  actorId: string,
  action: string,
  targetUserId?: string,
  value?: any
) => {
  const s = getSocket();
  s?.emit('space_stage_action', { spaceId, actorId, action, targetUserId, value });
};

export const emitSpaceChatMessage = (
  spaceId: string,
  message: { id: string; userId: string; userName: string; userAvatar?: string; text: string; timestamp: string }
) => {
  const s = getSocket();
  s?.emit('space_chat_message', { spaceId, message });
};

export const emitSpaceWebRTCSignal = (spaceId: string, event: string, data: any) => {
  const s = getSocket();
  s?.emit('space_webrtc_signal', { spaceId, event, data });
};

export const emitEndSpace = (
  spaceId: string,
  actorId: string,
  durationFormatted?: string,
  peakListeners?: number,
  actorPhone?: string
) => {
  const s = getSocket();
  s?.emit('space_ended', { spaceId, actorId, actorPhone, durationFormatted, peakListeners });
};

// 4. WebRTC Video/Voice Calling
export const joinWebRTCCallRoom = (roomId: string) => {
  const s = getSocket();
  s?.emit('join_call_room', roomId);
};

export const leaveWebRTCCallRoom = (roomId: string) => {
  const s = getSocket();
  s?.emit('leave_call_room', roomId);
};

export const emitCallSignal = (roomId: string, event: string, data: any) => {
  const s = getSocket();
  s?.emit('call_signal', { roomId, event, data });
};

export const emitPhoneCallSignal = (targetPhone: string, data: any, event: string = 'incoming_call') => {
  const s = getSocket();
  s?.emit('phone_call_signal', { targetPhone, event, data });
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
