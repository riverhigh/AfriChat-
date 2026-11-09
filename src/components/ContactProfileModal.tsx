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
  Heart,
  Bookmark,
  Share,
  Trash2,
  Ban,
  Flag,
  Check,
  ChevronRight,
  ShieldCheck,
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
  const { startCall, setActiveChatId } = useApp();
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isDisappearingOn, setIsDisappearingOn] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  if (!isOpen || !chat) return null;

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  const contactPhone = chat.phone || '+234 901 087 2172';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-start animate-in fade-in duration-200 overflow-hidden font-sans select-none">
      {/* Action Toast Notification */}
      {actionToast && (
        <div className="absolute top-14 inset-x-4 z-50 p-3 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 border border-emerald-400 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionToast}</span>
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
          {chat.name}
        </span>

        <button
          type="button"
          onClick={() => showToast('Contact editing mode enabled')}
          className="text-white hover:text-purple-400 text-sm font-semibold px-2 py-1 transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto bg-black text-white pb-12">
        {/* Hero Section with Pattern Banner & Big Centered Avatar */}
        <div className="relative pt-6 pb-4 px-4 flex flex-col items-center bg-gradient-to-b from-[#18181c] via-[#121214] to-black">
          {/* Subtle patterned doodle background effect */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Big Profile Picture */}
          <div className="relative mb-3">
            <img
              src={chat.avatar}
              alt={chat.name}
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-full object-cover border-2 border-white/20 shadow-2xl ring-4 ring-neutral-900"
            />
            {chat.isOnline && (
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-black rounded-full" />
            )}
          </div>

          {/* Contact Name & Phone */}
          <h1 className="text-xl font-bold text-white text-center tracking-tight leading-snug">
            {chat.name}
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-0.5 tracking-wide">
            {contactPhone}
          </p>

          {/* 3 Quick Action Cards Row */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-5">
            {/* Voice Call */}
            <button
              type="button"
              onClick={() => {
                onClose();
                startCall(chat.name, contactPhone, chat.avatar, 'voice');
              }}
              className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80"
            >
              <Phone className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-xs font-semibold text-white">Voice</span>
            </button>

            {/* Video Call */}
            <button
              type="button"
              onClick={() => {
                onClose();
                startCall(chat.name, contactPhone, chat.avatar, 'video');
              }}
              className="flex flex-col items-center justify-center py-3 px-2 bg-[#1c1c1e] hover:bg-[#252528] active:scale-95 transition-all rounded-2xl border border-neutral-800/80"
            >
              <Video className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-xs font-semibold text-white">Video</span>
            </button>

            {/* Search */}
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
        </div>

        {/* Inset Group Cards Container */}
        <div className="px-4 space-y-4 max-w-md mx-auto mt-2">
          {/* Card Group 1: Media & Starred */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            <button
              type="button"
              onClick={() => showToast('Media, links and docs: 0 items')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Media, links and docs</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>None</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsStarred(!isStarred);
                showToast(isStarred ? 'Unstarred messages' : 'Messages starred');
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'}`} />
                <span className="font-medium text-white">Starred</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>{isStarred ? '1 Starred' : 'None'}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>
          </div>

          {/* Card Group 2: Notifications, Theme, Save to Photos */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            <button
              type="button"
              onClick={() => showToast('Notifications configured for this chat')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenThemeModal) {
                  onClose();
                  onOpenThemeModal();
                } else {
                  showToast('Chat wallpaper & text theme settings opened');
                }
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Chat theme</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              type="button"
              onClick={() => showToast('Save to Photos preference updated')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Save to Photos</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>Default</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>
          </div>

          {/* Card Group 3: Disappearing messages, Lock chat, Restricted, Encryption */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm">
            {/* Disappearing messages */}
            <button
              type="button"
              onClick={() => {
                setIsDisappearingOn(!isDisappearingOn);
                showToast(isDisappearingOn ? 'Disappearing messages turned off' : 'Disappearing messages set to 24 hours');
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Disappearing messages</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>{isDisappearingOn ? '24 hours' : 'Off'}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            {/* Lock chat Toggle */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-start gap-3 pr-2">
                <Lock className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Lock chat</div>
                  <div className="text-xs text-neutral-400 leading-tight">
                    Lock and hide this chat on this device.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isChatLocked}
                  onChange={(e) => {
                    setIsChatLocked(e.target.checked);
                    showToast(e.target.checked ? '🔒 Chat is now locked & protected' : '🔓 Chat lock disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Restricted chat */}
            <button
              type="button"
              onClick={() => showToast('Restricted chat setting is Off')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Restricted chat</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <span>Off</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </button>

            {/* Encryption End-to-End */}
            <button
              type="button"
              onClick={() => showToast('Encryption verified: 256-bit AES end-to-end security active.')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3 pr-2">
                <KeyRound className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Encryption</div>
                  <div className="text-xs text-neutral-400 leading-tight">
                    Messages and calls are end-to-end encrypted. Tap to verify.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </button>
          </div>

          {/* Card Group 4: Contact details */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-neutral-800/80 text-sm">
            <button
              type="button"
              onClick={() => showToast(`Phone: ${contactPhone}`)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-white">Contact details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          {/* Card Group 5: Common Groups */}
          <div className="space-y-1.5">
            <div className="text-xs text-neutral-400 font-semibold px-2">
              No groups in common
            </div>
            <button
              type="button"
              onClick={() => showToast(`Create group invitation created for ${chat.name}`)}
              className="w-full flex items-center gap-3 p-3.5 bg-[#1c1c1e] hover:bg-neutral-800/50 rounded-2xl border border-neutral-800/80 text-sm font-semibold text-white transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </div>
              <span>Create group with {chat.name}</span>
            </button>
          </div>

          {/* Card Group 6: Green Actions (Share, Favourites, List, Export, Clear) */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm font-medium">
            <button
              type="button"
              onClick={() => showToast(`Contact card shared: ${chat.name}`)}
              className="w-full text-left p-3.5 text-emerald-500 hover:bg-neutral-800/50 transition-colors"
            >
              Share contact
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFavourite(!isFavourite);
                showToast(isFavourite ? 'Removed from favourites' : 'Added to favourites');
              }}
              className="w-full text-left p-3.5 text-emerald-500 hover:bg-neutral-800/50 transition-colors"
            >
              {isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}
            </button>

            <button
              type="button"
              onClick={() => showToast('Added to custom contact list')}
              className="w-full text-left p-3.5 text-emerald-500 hover:bg-neutral-800/50 transition-colors"
            >
              Add to list
            </button>

            <button
              type="button"
              onClick={() => showToast('Chat exported as zip archive with media')}
              className="w-full text-left p-3.5 text-neutral-300 hover:bg-neutral-800/50 transition-colors"
            >
              Export chat
            </button>

            <button
              type="button"
              onClick={() => showToast('Chat conversation cleared')}
              className="w-full text-left p-3.5 text-rose-500 hover:bg-neutral-800/50 transition-colors font-semibold"
            >
              Clear chat
            </button>
          </div>

          {/* Card Group 7: Red Critical Actions (Block & Report) */}
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-neutral-800/80 border border-neutral-800/80 text-sm font-semibold">
            <button
              type="button"
              onClick={() => showToast(`Blocked ${chat.name}`)}
              className="w-full text-left p-3.5 text-rose-500 hover:bg-neutral-800/50 transition-colors"
            >
              Block {chat.name}
            </button>

            <button
              type="button"
              onClick={() => showToast(`Report filed against ${chat.name}`)}
              className="w-full text-left p-3.5 text-rose-500 hover:bg-neutral-800/50 transition-colors"
            >
              Report {chat.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
