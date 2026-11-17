import React, { useMemo, useState } from 'react';
import {
  X,
  Crown,
  UserMinus,
  Link2,
  BellOff,
  Bell,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Users,
  Settings,
  MessageSquareOff,
  Ghost,
  Pin,
  Bot,
  Clock,
} from 'lucide-react';
import { ChatThread, GhostTimerSetting } from '../types';
import {
  useApp,
  phonesMatch,
  isUserChatAdmin,
  computeClientMembersCount,
  dedupePhoneList,
} from '../context/AppContext';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatThread;
}

interface GroupMember {
  id: string;
  rawKey: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  isBot?: boolean;
  phone?: string;
}

function entryMatchesAdmin(admins: string[], ...candidates: (string | undefined)[]): boolean {
  const cleanCandidates = candidates.map((c) => String(c || '').trim()).filter(Boolean);
  if (cleanCandidates.length === 0) return false;
  return admins.some((a) => {
    const clean = String(a || '').trim();
    if (!clean) return false;
    return cleanCandidates.some(
      (cand) => cand.toLowerCase() === clean.toLowerCase() || phonesMatch(clean, cand)
    );
  });
}

function buildMemberList(chat: ChatThread, currentUser: any, deviceContacts: any[]): GroupMember[] {
  const admins = Array.isArray(chat.admins) ? chat.admins : [];
  const rawMembers = Array.isArray(chat.members) ? chat.members : [];
  const rawPhones = dedupePhoneList(chat.memberPhones);
  const list: GroupMember[] = [];

  const myName = currentUser?.fullName || 'You';
  const myPhone = currentUser?.phoneNumber;
  const myHandle = currentUser?.username ? `@${currentUser.username}` : '';

  const isMe = (val?: string): boolean => {
    const clean = String(val || '').trim();
    if (!clean) return false;
    const lower = clean.toLowerCase();
    if (lower === 'you' || (myName && lower === myName.toLowerCase())) return true;
    if (myHandle && lower === myHandle.toLowerCase()) return true;
    if (myPhone && phonesMatch(clean, myPhone)) return true;
    return false;
  };

  list.push({
    id: 'member_me',
    rawKey: myName,
    name: `${myName} (You)`,
    avatar: currentUser?.avatarUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=me',
    isAdmin: isUserChatAdmin(chat, currentUser),
    phone: myPhone,
  });

  const seenNames = new Set<string>([myName.toLowerCase(), 'you']);
  const seenPhones: string[] = myPhone ? [myPhone] : [];

  const findContact = (keyOrPhone: string) =>
    (deviceContacts || []).find(
      (c) =>
        (c.name && c.name.toLowerCase() === keyOrPhone.toLowerCase()) ||
        (c.normalizedPhoneNumber && phonesMatch(c.normalizedPhoneNumber, keyOrPhone)) ||
        (c.rawPhoneNumber && phonesMatch(c.rawPhoneNumber, keyOrPhone)) ||
        (c.phoneNumber && phonesMatch(c.phoneNumber, keyOrPhone)) ||
        (c.phone && phonesMatch(c.phone, keyOrPhone))
    );

  // Add from chat.members
  rawMembers.forEach((mem, idx) => {
    const clean = String(mem || '').trim();
    if (!clean || isMe(clean)) return;

    const isBot = clean.toLowerCase() === 'agcbot' || clean.toLowerCase() === 'afribot ai';
    const contactMatch = isBot ? undefined : findContact(clean);
    const resolvedPhone = isBot
      ? undefined
      : contactMatch?.normalizedPhoneNumber ||
        contactMatch?.phoneNumber ||
        contactMatch?.phone ||
        (/^\+?\d{7,}$/.test(clean.replace(/[\s\-()]/g, '')) ? clean : undefined);
    const resolvedName = isBot ? 'AgcBot' : contactMatch?.name || clean;

    if (seenNames.has(resolvedName.toLowerCase())) return;
    if (resolvedPhone && seenPhones.some((p) => phonesMatch(p, resolvedPhone))) return;

    seenNames.add(resolvedName.toLowerCase());
    if (resolvedPhone) seenPhones.push(resolvedPhone);

    const isCreator =
      Boolean(resolvedPhone && chat.creatorPhone && phonesMatch(chat.creatorPhone, resolvedPhone));

    list.push({
      id: `mem_${idx}_${resolvedName.replace(/\W/g, '')}`,
      rawKey: resolvedName,
      name: resolvedName,
      avatar: isBot
        ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AgcBot'
        : contactMatch?.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(resolvedName)}`,
      isAdmin: isBot || isCreator || entryMatchesAdmin(admins, clean, resolvedName, resolvedPhone),
      isBot,
      phone: resolvedPhone,
    });
  });

  // Ensure any phone-only joiners from chat.memberPhones are also visible
  rawPhones.forEach((ph, idx) => {
    if (!ph || isMe(ph)) return;
    if (seenPhones.some((p) => phonesMatch(p, ph))) return;

    const contactMatch = findContact(ph);
    if (contactMatch?.name && seenNames.has(contactMatch.name.toLowerCase())) {
      const existing = list.find((m) => m.name.toLowerCase() === contactMatch.name.toLowerCase());
      if (existing && !existing.phone) existing.phone = ph;
      seenPhones.push(ph);
      return;
    }

    const displayName = contactMatch?.name || ph;
    seenPhones.push(ph);
    seenNames.add(displayName.toLowerCase());
    const isCreator = Boolean(chat.creatorPhone && phonesMatch(chat.creatorPhone, ph));

    list.push({
      id: `phone_${idx}_${ph.replace(/\W/g, '')}`,
      rawKey: contactMatch?.name || ph,
      name: displayName,
      avatar:
        contactMatch?.avatar ||
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(displayName)}`,
      isAdmin: isCreator || entryMatchesAdmin(admins, ph, contactMatch?.name),
      phone: ph,
    });
  });

  return list;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose, chat }) => {
  const {
    currentUser,
    deviceContacts,
    updateChat,
    setDisappearingTimer,
    pinChatMessage,
    toggleMemberAdmin,
    removeMemberFromGroup,
    leaveGroup,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const members = useMemo(
    () => buildMemberList(chat, currentUser, deviceContacts),
    [chat, currentUser, deviceContacts]
  );

  const pendingList = useMemo(() => {
    const pending = Array.isArray(chat.pendingMembers) ? chat.pendingMembers : [];
    return pending.filter(
      (pm) =>
        !members.some(
          (m) =>
            m.rawKey.toLowerCase() === pm.toLowerCase() ||
            m.name.toLowerCase() === pm.toLowerCase() ||
            (m.phone && phonesMatch(m.phone, pm))
        )
    );
  }, [chat.pendingMembers, members]);

  if (!isOpen) return null;

  const isChannel = Boolean(chat.isChannel);
  const joinToken = chat.inviteCode || chat.id;
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://agc.chat'}/?join=${joinToken}`;
  const isAdmin = isUserChatAdmin(chat, currentUser);
  const announceMode = Boolean(chat.announceMode);
  const isMuted = Boolean(chat.isMuted);
  const displayCount = Math.max(
    chat.membersCount || 1,
    computeClientMembersCount(chat.members, chat.memberPhones),
    members.length
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinToken).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePromoteToggle = (m: GroupMember) => {
    toggleMemberAdmin(chat.id, m.rawKey, m.isBot ? undefined : m.phone);
  };

  const handleRemove = (m: GroupMember) => {
    removeMemberFromGroup(chat.id, m.rawKey, m.isBot ? undefined : m.phone);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{chat.name}</p>
              <p className="text-xs text-slate-400">
                {displayCount}{' '}
                {isChannel
                  ? displayCount === 1
                    ? 'subscriber'
                    : 'subscribers'
                  : displayCount === 1
                  ? 'member'
                  : 'members'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Admin controls */}
          {isAdmin && !isChannel && (
            <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Admin Controls
              </p>
              {/* Announce Mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquareOff className="w-4 h-4 text-amber-500" />
                    Announce Mode
                  </p>
                  <p className="text-xs text-slate-400">Only admins can send messages</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateChat(chat.id, { announceMode: !announceMode })}
                  className={`w-11 h-6 rounded-full transition-colors ${
                    announceMode ? 'bg-purple-600' : 'bg-slate-300 dark:bg-neutral-700'
                  } relative`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      announceMode ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Ghost Disappearing Timer & Pinned Announcement */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Ghost className="w-3.5 h-3.5 text-fuchsia-500" /> Ghost Messages Timer
              </p>
              <div className="grid grid-cols-7 gap-1">
                {(['off', '10s', '30s', '1m', '5m', '1h', '24h'] as GhostTimerSetting[]).map((preset) => {
                  const active = (chat.disappearingTimer || 'off') === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDisappearingTimer(chat.id, preset)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        active
                          ? 'bg-fuchsia-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {preset === 'off' ? 'Off' : preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {chat.pinnedMessage && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Pinned Announcement
                  </p>
                  <p className="text-xs text-slate-800 dark:text-neutral-200 truncate mt-0.5">
                    {chat.pinnedMessage.text}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => pinChatMessage(chat.id, null)}
                    className="text-[10px] font-bold text-rose-500 hover:underline shrink-0"
                  >
                    Unpin
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Invite Link & Code */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> {isChannel ? 'Channel Invite Link & Code' : 'Private Invite Link & Code'}
            </p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-neutral-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-neutral-800">
              <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                {inviteLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                title="Copy invite link"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between bg-purple-50/70 dark:bg-purple-950/30 rounded-xl px-3 py-2 border border-purple-200/70 dark:border-purple-900/40">
              <span className="text-[11px] text-slate-600 dark:text-purple-300">
                Invite Code: <strong className="font-mono text-purple-700 dark:text-purple-200">{joinToken}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-300 hover:underline"
              >
                {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> {isChannel ? 'Subscribers' : 'Members'} ({displayCount})
            </p>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-9 h-9 rounded-full object-cover bg-slate-200 border border-slate-200 dark:border-purple-900/40"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.isBot && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-950/40 px-1.5 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                          <Bot className="w-2.5 h-2.5" /> Bot
                        </span>
                      )}
                      {m.isAdmin && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                          <Crown className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </p>
                    {m.phone && <p className="text-[11px] text-slate-400 font-mono">{m.phone}</p>}
                  </div>
                  {/* Admin actions on other members */}
                  {isAdmin && m.id !== 'member_me' && (
                    <div className="flex items-center gap-1">
                      {!m.isBot && (
                        <button
                          type="button"
                          onClick={() => handlePromoteToggle(m)}
                          className={`p-1.5 rounded-full transition-colors ${
                            m.isAdmin
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          }`}
                          title={m.isAdmin ? 'Dismiss as admin' : 'Promote to admin'}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(m)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors"
                        title={`Remove from ${isChannel ? 'channel' : 'group'}`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {pendingList.map((pm) => (
                <li key={`pending_${pm}`} className="flex items-center gap-3 opacity-75">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-1.5">
                      <span>{pm}</span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        Pending Invite
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Leave / Mute */}
          <div className="px-5 pb-6 pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => updateChat(chat.id, { isMuted: !isMuted })}
              className="w-full py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-900 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-neutral-800"
            >
              {isMuted ? (
                <>
                  <Bell className="w-4 h-4 text-emerald-500" /> Unmute Notifications
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-rose-500" /> Mute Notifications
                </>
              )}
            </button>

            {confirmLeave ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium text-center">
                  Leave {chat.name}? You will no longer receive messages or see this{' '}
                  {isChannel ? 'channel' : 'group'}.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      leaveGroup(chat.id);
                      setConfirmLeave(false);
                      onClose();
                    }}
                    className="py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Confirm Leave
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                className="w-full py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" /> {isChannel ? 'Unsubscribe & Leave Channel' : 'Leave Group'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

