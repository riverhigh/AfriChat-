import React, { useState } from 'react';
import {
  ChevronLeft,
  Phone,
  Video,
  Search,
  Image as ImageIcon,
  Star,
  Bell,
  Palette,
  Download,
  Clock,
  Lock,
  Shield,
  KeyRound,
  User,
  Plus,
  Share2,
  Trash2,
  Ban,
  Flag,
  Check,
  ChevronRight,
  ShieldCheck,
  Copy,
  QrCode,
  Users,
  Radio,
  FileText,
  CheckCircle2,
  X,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { ChatThread } from '../types';
import { useApp } from '../context/AppContext';

interface ContactProfileModalProps {
  chat: ChatThread | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenThemeModal?: () => void;
}

export const ContactProfileModal: React.FC<ContactProfileModalProps> = ({
  chat,
  isOpen,
  onClose,
  onOpenThemeModal,
}) => {
  const {
    startCall,
    setActiveChatId,
    currentUser,
    deviceContacts,
    messages,
    clearChat,
    updateChat,
    addMembersToGroup,
    blockedUserIds,
    toggleBlockUser,
    flagEntityAsScam,
    CURRENCY_SYMBOLS,
    currency,
  } = useApp();

  // Local UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Modals / Drawers
  const [showInviteLinkDrawer, setShowInviteLinkDrawer] = useState(false);
  const [showAddMembersDrawer, setShowAddMembersDrawer] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDisappearingSelector, setShowDisappearingSelector] = useState(false);

  // Invite & Member selection state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedContactNames, setSelectedContactNames] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Report Form state
  const [reportReason, setReportReason] = useState('Fake Bank Transfer / Advance Fee Fraud');
  const [reportDetails, setReportDetails] = useState('');

  if (!isOpen || !chat) return null;

  const isGroup = Boolean(chat.isGroup);
  const isChannel = Boolean(chat.isChannel);
  const isGroupOrChannel = isGroup || isChannel;
  const entityType = isChannel ? 'Channel' : isGroup ? 'Group' : 'Contact';
  const contactPhone = chat.phone || (isGroupOrChannel ? undefined : '+234 901 087 2172');
  const isBlocked = blockedUserIds.includes(chat.id) || (Boolean(chat.phone) && blockedUserIds.includes(chat.phone!));
  const isMuted = Boolean(chat.isMuted);
  const isLocked = Boolean(chat.isLocked);
  const isFavourite = Boolean(chat.isFavourite);
  const disappearingTimer = chat.disappearingTimer || 'off';

  const chatMessages = messages[chat.id] || [];
  const mediaMessages = chatMessages.filter(
    (m) => m.imageUrl || m.type === 'image' || m.type === 'voice' || m.product || m.order || m.invoice
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Share Invite Link logic
  const inviteUrl = `${window.location.origin}/join/${isChannel ? 'c' : 'g'}/${chat.id}`;

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('Invite link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast(`Invite Link: ${inviteUrl}`);
    }
  };

  const handleShareInviteLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${chat.name} on Africhat`,
          text: `Hey! Join the ${entityType.toLowerCase()} "${chat.name}" on Africhat:`,
          url: inviteUrl,
        });
        showToast('Invite link shared!');
      } catch (_) {}
    } else {
      handleCopyInviteLink();
    }
  };

  // 2. Add Members logic
  const handleAddMembersSubmit = () => {
    if (!selectedContactNames.length) return;
    addMembersToGroup(chat.id, selectedContactNames);
    showToast(`Added ${selectedContactNames.length} member${selectedContactNames.length > 1 ? 's' : ''} to ${chat.name}!`);
    setSelectedContactNames([]);
    setShowAddMembersDrawer(false);
  };

  const toggleSelectMember = (name: string) => {
    setSelectedContactNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // 3. Edit Name / Subject
  const handleStartEdit = () => {
    setEditedName(chat.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== chat.name) {
      updateChat(chat.id, { name: editedName.trim() });
      showToast(`${entityType} name updated to "${editedName.trim()}"`);
    }
    setIsEditingName(false);
  };

  // 4. Mute notifications toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    updateChat(chat.id, { isMuted: next });
    showToast(next ? 'Notifications muted for this chat' : 'Notifications unmuted');
  };

  // 5. Lock chat toggle
  const handleToggleLock = () => {
    const next = !isLocked;
    updateChat(chat.id, { isLocked: next });
    showToast(next ? '🔒 Chat is now locked and protected with PIN' : '🔓 Chat lock disabled');
  };

  // 6. Favourite toggle
  const handleToggleFavourite = () => {
    const next = !isFavourite;
    updateChat(chat.id, { isFavourite: next });
    showToast(next ? 'Pinned to Favourites' : 'Removed from Favourites');
  };

  // 7. Disappearing timer
  const handleSetDisappearingTimer = (timer: string) => {
    updateChat(chat.id, { disappearingTimer: timer });
    setShowDisappearingSelector(false);
    showToast(timer === 'off' ? 'Disappearing messages turned off' : `Disappearing messages set to ${timer}`);
  };

  // 8. Block / Unblock user
  const handleToggleBlock = () => {
    const nextBlocked = toggleBlockUser(chat.id);
    showToast(nextBlocked ? `🚫 Blocked ${chat.name}` : `Unblocked ${chat.name}`);
  };

  // 9. Report entity
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    flagEntityAsScam(contactPhone || chat.name, 'phone', `${reportReason}: ${reportDetails}`);
    setShowReportModal(false);
    setReportDetails('');
    showToast(`Report filed against ${chat.name}. Safety team notified.`);
  };

  // 10. Clear chat history
  const handleConfirmClear = () => {
    clearChat(chat.id);
    setShowClearConfirm(false);
    showToast('Conversation cleared successfully.');
  };

  // 11. Export chat transcript
  const handleExportChat = () => {
    const header = `====================================================\nAFRICHAT CONVERSATION TRANSCRIPT\nEntity: ${chat.name} (${entityType})\nDate: ${new Date().toLocaleString()}\nParticipants: ${chat.membersCount || 2}\n====================================================\n\n`;
    const body = chatMessages
      .map((m) => {
        const time = m.timestamp || 'Recent';
        const sender = m.sender === 'user' ? 'You' : m.senderName || chat.name;
        let content = m.text || '';
        if (m.type === 'image') content = `[Photo: ${m.imageUrl || 'Image file'}]`;
        if (m.type === 'voice') content = '[Voice Note]';
        if (m.type === 'product_card' && m.product) content = `[Product Card: ${m.product.title} - ${CURRENCY_SYMBOLS[currency]}${m.product.price}]`;
        if (m.type === 'escrow_receipt' && m.order) content = `[Escrow Receipt #${m.order.id}]`;
        return `[${time}] ${sender}: ${content}`;
      })
      .join('\n');

    const fullText = header + (body || '(No text messages in this conversation)');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Africhat_${chat.name.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Chat transcript exported and downloaded!');
  };

  // 12. Copy phone number
  const handleCopyPhone = () => {
    if (!contactPhone) return;
    navigator.clipboard.writeText(contactPhone);
    setCopiedPhone(true);
    showToast(`Copied phone: ${contactPhone}`);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-start animate-in fade-in duration-200 overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 inset-x-4 z-50 p-3 bg-purple-600 text-white rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 border border-purple-400 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0e0e10] border-b border-neutral-800/80 shrink-0 z-20">
        <button
          type="button"
          onClick={onClose}
          className="p-1 -ml-1 text-white hover:text-purple-400 flex items-center transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        <span className="font-bold text-sm text-white truncate max-w-[200px] text-center">
          {isEditingName ? 'Edit Subject' : chat.name}
        </span>

        {isEditingName ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveName}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded-xl"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            className="text-purple-400 hover:text-purple-300 text-sm font-semibold px-2 py-1 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto bg-black text-white pb-16">
        {/* Hero Section */}
        <div className="relative pt-6 pb-5 px-4 flex flex-col items-center bg-gradient-to-b from-[#18181c] via-[#121214] to-black">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Big Avatar */}
          <div className="relative mb-3">
            <img
              src={chat.avatar}
              alt={chat.name}
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-full object-cover border-2 border-white/20 shadow-2xl ring-4 ring-neutral-900"
            />
            {chat.isOnline && !isGroupOrChannel && (
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-black rounded-full" />
            )}
            {isGroup && (
              <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 border-2 border-black flex items-center justify-center text-white shadow-lg">
                <Users className="w-4 h-4" />
              </span>
            )}
            {isChannel && (
              <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-pink-600 border-2 border-black flex items-center justify-center text-white shadow-lg">
                <Radio className="w-4 h-4" />
              </span>
            )}
            {chat.isCelebrityVerified && (
              <span className="absolute -bottom-1 -left-1 w-7 h-7 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-lg border-2 border-black">
                <Star className="w-4 h-4 fill-white text-amber-900" />
              </span>
            )}
          </div>

          {/* Name & Title */}
          {isEditingName ? (
            <div className="w-full max-w-sm my-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="w-full p-2.5 bg-neutral-900 border border-purple-500 rounded-xl text-center text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={`Enter new ${entityType.toLowerCase()} name...`}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center">
              <h1 className="text-xl font-bold text-white text-center tracking-tight leading-snug">
                {chat.name}
              </h1>
              {chat.isCelebrityVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-xs">
                  <Star className="w-3 h-3 fill-white text-amber-900" />
                  <span>Celebrity</span>
                </span>
              )}
            </div>
          )}

          {/* Subtitle / Metadata */}
          {isGroupOrChannel ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full">
                {isChannel ? 'Official Channel' : 'Group Chat'}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {chat.membersCount || (isChannel ? 342 : 6)} {isChannel ? 'Subscribers' : 'Members'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 font-mono mt-0.5 tracking-wide flex items-center gap-1.5">
              <span>{contactPhone}</span>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="text-neutral-400 hover:text-white"
                title="Copy phone"
              >
                {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </p>
          )}

          {/* Action Row */}
          {isGroupOrChannel ? (
            /* GROUP & CHANNEL ACTION CARDS */
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-5">
              {/* Add Members */}
              <button
                type="button"
                onClick={() => setShowAddMembersDrawer(true)}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80 group"
              >
                <UserPlus className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white">Add Members</span>
              </button>

              {/* Share Invite Link */}
              <button
                type="button"
                onClick={() => setShowInviteLinkDrawer(true)}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80 group"
              >
                <Share2 className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white">Invite Link</span>
              </button>

              {/* Search in Chat */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveChatId(chat.id);
                }}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80 group"
              >
                <Search className="w-5 h-5 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white">Search</span>
              </button>
            </div>
          ) : (
            /* 1-ON-1 DIRECT CONTACT ACTION CARDS */
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  startCall(chat.name, contactPhone!, chat.avatar, 'voice');
                }}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80"
              >
                <Phone className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-semibold text-white">Voice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  startCall(chat.name, contactPhone!, chat.avatar, 'video');
                }}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80"
              >
                <Video className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-semibold text-white">Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveChatId(chat.id);
                }}
                className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80"
              >
                <Search className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-semibold text-white">Search</span>
              </button>
            </div>
          )}
        </div>

        {/* Inset Menu Cards Container */}
        <div className="px-4 space-y-4 max-w-md mx-auto mt-2">
          {/* GROUP & CHANNEL INVITE HERO CARD */}
          {isGroupOrChannel && (
            <div className="p-4 bg-gradient-to-br from-purple-950/40 via-[#1c1c1e] to-neutral-900 rounded-3xl border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Invite to {entityType}</h3>
                    <p className="text-[11px] text-neutral-400">Add friends directly or share an invite link</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMembersDrawer(true)}
                  className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Friends</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInviteLinkDrawer(true)}
                  className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>
          )}

          {/* CARD GROUP 1: Media, Starred & Audio */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            {/* Real Media Gallery */}
            <button
              type="button"
              onClick={() => setShowMediaGallery(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Media, links and docs</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>{mediaMessages.length} item{mediaMessages.length === 1 ? '' : 's'}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            {/* Real Favourite / Pin */}
            <button
              type="button"
              onClick={handleToggleFavourite}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isFavourite ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'}`} />
                <span className="font-medium text-white">Favourite & Pin</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>{isFavourite ? 'Pinned' : 'Off'}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>
          </div>

          {/* CARD GROUP 2: Notifications & Chat Theme */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            {/* Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className={`w-5 h-5 ${isMuted ? 'text-rose-400' : 'text-neutral-400'}`} />
                <span className="font-medium text-white">Mute notifications</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span className={isMuted ? 'text-rose-400 font-semibold' : ''}>{isMuted ? 'Muted' : 'Off'}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            {/* Chat theme */}
            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) {
                  onClose();
                  onOpenThemeModal();
                } else {
                  showToast('Wallpaper & theme settings opened');
                }
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Chat wallpaper & theme</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          {/* CARD GROUP 3: Security & Privacy */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            {/* Disappearing messages */}
            <button
              type="button"
              onClick={() => setShowDisappearingSelector(!showDisappearingSelector)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Disappearing messages</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span className="font-semibold text-purple-400">
                  {disappearingTimer === 'off' ? 'Off' : disappearingTimer}
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            {/* Disappearing selector drawer */}
            {showDisappearingSelector && (
              <div className="p-3 bg-neutral-900 border-t border-neutral-800 space-y-1.5 animate-in fade-in">
                <div className="text-xs font-bold text-neutral-400 mb-2">Timer duration:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Off', val: 'off' },
                    { label: '24 Hours', val: '24h' },
                    { label: '7 Days', val: '7d' },
                    { label: '90 Days', val: '90d' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleSetDisappearingTimer(opt.val)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                        disappearingTimer === opt.val
                          ? 'border-purple-500 bg-purple-950/60 text-purple-300 font-bold'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lock chat Toggle */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-start gap-3 pr-2">
                <Lock className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Lock chat</div>
                  <div className="text-xs text-neutral-400 leading-tight">
                    Requires PIN code to open this chat.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isLocked}
                  onChange={handleToggleLock}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>

            {/* End-to-End Encryption */}
            <button
              type="button"
              onClick={() => setShowEncryptionModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 pr-2">
                <KeyRound className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Encryption</div>
                  <div className="text-xs text-neutral-400 leading-tight">
                    256-bit AES end-to-end encrypted. Tap to verify.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </button>
          </div>

          {/* CARD GROUP 4: Participants List for Group / Channel */}
          {isGroupOrChannel && (
            <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-neutral-800/80 divide-y divide-neutral-800/80">
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {chat.membersCount || (isChannel ? 342 : 6)} Participants
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddMembersDrawer(true)}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Current user as Admin */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={currentUser.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-purple-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>You</span>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded-full border border-purple-800">
                        Admin
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {currentUser.phoneNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample members from contacts */}
              {deviceContacts.slice(0, 4).map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={c.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}
                      alt={c.name}
                      className="w-9 h-9 rounded-full object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{c.normalizedPhoneNumber}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Member</span>
                </div>
              ))}
            </div>
          )}

          {/* CARD GROUP 5: Export, Clear & Management Actions */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm font-medium">
            {/* Real Export Chat */}
            <button
              type="button"
              onClick={handleExportChat}
              className="w-full flex items-center justify-between p-3.5 text-neutral-200 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-neutral-400" />
                <span>Export chat transcript (.txt)</span>
              </div>
              <Download className="w-4 h-4 text-neutral-500" />
            </button>

            {/* Real Clear Chat */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-between p-3.5 text-amber-500 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-500" />
                <span>Clear conversation history</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          {/* CARD GROUP 6: Block & Report */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm font-semibold">
            {!isGroupOrChannel && (
              <button
                type="button"
                onClick={handleToggleBlock}
                className="w-full flex items-center justify-between p-3.5 text-rose-500 hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Ban className="w-5 h-5 text-rose-500" />
                  <span>{isBlocked ? `Unblock ${chat.name}` : `Block ${chat.name}`}</span>
                </div>
                <span className="text-xs font-mono">{isBlocked ? 'Blocked' : ''}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="w-full flex items-center justify-between p-3.5 text-rose-500 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Flag className="w-5 h-5 text-rose-500" />
                <span>Report {chat.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* DRAWER 1: INVITE VIA SHAREABLE LINK (QR CODE & COPY) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showInviteLinkDrawer && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#18181c] rounded-t-3xl sm:rounded-3xl border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Invite Link</h3>
                  <p className="text-xs text-neutral-400">Anyone with this link can join {chat.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteLinkDrawer(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* URL Display Box */}
            <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-2">
              <div className="text-[11px] font-mono text-purple-400 break-all select-all font-semibold">
                {inviteUrl}
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800">
                <span>Encrypted end-to-end join link</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Active & Valid</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareInviteLink}
                className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-95"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Share Via...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* DRAWER 2: INVITE BY ADDING THEM DIRECTLY FROM CONTACTS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showAddMembersDrawer && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#18181c] rounded-t-3xl sm:rounded-3xl border border-neutral-800 flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Add to {entityType}</h3>
                  <p className="text-xs text-neutral-400">Select friends or contacts to add directly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddMembersDrawer(false);
                  setSelectedContactNames([]);
                }}
                className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-neutral-800 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search name or phone number..."
                  className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Selected Chips */}
            {selectedContactNames.length > 0 && (
              <div className="px-3 py-2 bg-purple-950/30 border-b border-purple-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {selectedContactNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-600 text-white shrink-0"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectMember(name)}
                      className="hover:text-purple-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-800/60">
              {deviceContacts
                .filter(
                  (c) =>
                    !memberSearchQuery.trim() ||
                    c.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    c.normalizedPhoneNumber.includes(memberSearchQuery)
                )
                .map((contact) => {
                  const isSelected = selectedContactNames.includes(contact.name);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelectMember(contact.name)}
                      className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-950/40 border border-purple-600/40' : 'hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={contact.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{contact.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono truncate">
                            {contact.normalizedPhoneNumber}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Submit Footer */}
            <div className="p-3 border-t border-neutral-800 bg-[#141416] shrink-0">
              <button
                type="button"
                disabled={selectedContactNames.length === 0}
                onClick={handleAddMembersSubmit}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  Add {selectedContactNames.length > 0 ? `${selectedContactNames.length} to ` : ''}
                  {entityType}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: MEDIA, LINKS & DOCS GALLERY */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showMediaGallery && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#18181c] rounded-3xl border border-neutral-800 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Media & Documents ({mediaMessages.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaGallery(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mediaMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-xs">No media or documents exchanged in this conversation yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaMessages.map((m) => (
                    <div
                      key={m.id}
                      className="aspect-square bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 relative group"
                    >
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt="Media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : m.type === 'voice' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-purple-400">
                          <Radio className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-mono">Voice Note</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-emerald-400">
                          <FileText className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-mono">Document</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: ENCRYPTION SECURITY NUMBER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showEncryptionModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181c] rounded-3xl border border-neutral-800 p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">End-to-End Encryption</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Messages and calls with {chat.name} are secured with 256-bit AES encryption.
              </p>
            </div>

            {/* 60-Digit Security Number */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 font-mono text-xs text-purple-400 tracking-wider space-y-1">
              <div>48192 01847 99281 04918</div>
              <div>59182 40192 88201 39182</div>
              <div>90182 48192 01847 99281</div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Verify this safety number on your contact&apos;s device to confirm encryption authenticity.
            </p>

            <button
              type="button"
              onClick={() => setShowEncryptionModal(false)}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: CLEAR CHAT CONFIRMATION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181c] rounded-3xl border border-neutral-800 p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Clear Conversation?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                This will delete all messages and media in this chat history for you. This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: REPORT ENTITY */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-sm bg-[#18181c] rounded-3xl border border-neutral-800 p-5 space-y-4 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Flag className="w-4 h-4" />
                <span>Report {chat.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 block">Violation Reason</label>
              {[
                'Fake Bank Transfer / Advance Fee Fraud',
                'Fraudulent Merchant / Undelivered Goods',
                'Impersonation / Phishing / Scammer',
                'Harassment / Spam / Abuse',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reportReason === reason
                      ? 'border-rose-500 bg-rose-950/30 text-white font-semibold'
                      : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what occurred or paste transaction reference..."
                className="w-full p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rose-500 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
