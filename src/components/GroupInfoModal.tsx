import React, { useState } from 'react';
import {
  X,
  Crown,
  UserMinus,
  Link2,
  BellOff,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Users,
  Settings,
  MessageSquareOff,
} from 'lucide-react';
import { ChatThread } from '../types';
import { useApp } from '../context/AppContext';

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
  phone?: string;
}

function buildMemberList(chat: ChatThread, currentUser: any, deviceContacts: any[]): GroupMember[] {
  const admins = chat.admins || [currentUser?.fullName || 'You'];
  const rawMembers = chat.members || [];
  const list: GroupMember[] = [];

  // Add current user first
  const myName = currentUser?.fullName || 'You';
  list.push({
    id: 'member_me',
    rawKey: myName,
    name: `${myName} (You)`,
    avatar: currentUser?.avatarUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=me',
    isAdmin: admins.includes(myName) || admins.includes('You'),
    phone: currentUser?.phoneNumber,
  });

  // Add from real chat members
  rawMembers.forEach((mem, idx) => {
    if (mem === myName || mem === 'You' || mem === currentUser?.phoneNumber) return;

    const contactMatch = deviceContacts?.find(
      (c) => c.name === mem || c.phoneNumber === mem || c.phone === mem
    );

    list.push({
      id: `mem_${idx}_${mem.replace(/\W/g, '')}`,
      rawKey: mem,
      name: contactMatch?.name || mem,
      avatar: contactMatch?.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${mem}`,
      isAdmin: admins.includes(mem) || (contactMatch && admins.includes(contactMatch.name)),
      phone: contactMatch?.phoneNumber || contactMatch?.phone,
    });
  });

  // If no members were specified in array but membersCount > 1, show registered contacts
  if (list.length === 1 && (chat.membersCount ?? 1) > 1) {
    const registered = (deviceContacts || []).filter(
      (c) => c.phoneNumber !== currentUser?.phoneNumber && c.name !== myName
    );
    const countNeeded = Math.min((chat.membersCount ?? 2) - 1, 10);
    registered.slice(0, countNeeded).forEach((c, idx) => {
      list.push({
        id: `reg_${idx}_${c.id}`,
        rawKey: c.name,
        name: c.name,
        avatar: c.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${c.name}`,
        isAdmin: admins.includes(c.name),
        phone: c.phoneNumber || c.phone,
      });
    });
  }

  return list;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose, chat }) => {
  const { currentUser, deviceContacts, updateChat, removeMemberFromGroup, deleteChat } = useApp();
  const [copied, setCopied] = useState(false);
  const [announceMode, setAnnounceMode] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>(() =>
    buildMemberList(chat, currentUser, deviceContacts)
  );

  if (!isOpen) return null;

  const inviteLink = `https://agc.chat/join/${chat.id}`;
  const isAdmin = members.find((m) => m.id === 'member_me')?.isAdmin ?? false;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePromote = (rawKey: string) => {
    const updatedAdmins = Array.from(new Set([...(chat.admins || []), rawKey]));
    updateChat(chat.id, { admins: updatedAdmins });
    setMembers((prev) =>
      prev.map((m) => (m.rawKey === rawKey ? { ...m, isAdmin: true } : m))
    );
  };

  const handleRemove = (rawKey: string) => {
    removeMemberFromGroup(chat.id, rawKey);
    setMembers((prev) => prev.filter((m) => m.rawKey !== rawKey));
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
              <p className="text-xs text-slate-400">{members.length} members</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Admin controls */}
          {isAdmin && (
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
                  onClick={() => setAnnounceMode((v) => !v)}
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

          {/* Invite Link */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Invite Link
            </p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-neutral-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-neutral-800">
              <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                {inviteLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                title="Copy invite link"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Members ({members.length})
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
                      {m.name}
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
                      {!m.isAdmin && (
                        <button
                          onClick={() => handlePromote(m.rawKey)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-full transition-colors"
                          title="Promote to admin"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(m.rawKey)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors"
                        title="Remove from group"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Leave / Report */}
          <div className="px-5 pb-6 pt-2 flex flex-col gap-2">
            <button className="w-full py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/40">
              <BellOff className="w-4 h-4" /> Mute Notifications
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to leave this group?')) {
                  removeMemberFromGroup(chat.id, currentUser?.fullName || 'You');
                  onClose();
                }
              }}
              className="w-full py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" /> Leave Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
