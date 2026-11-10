import React, { useState } from 'react';
import {
  X,
  Users,
  Search,
  MessageSquare,
  Phone,
  UserPlus,
  Share2,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { DeviceContact } from '../types';

const ICON_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>";

export const ContactsModal: React.FC = () => {
  const {
    isContactsModalOpen,
    setIsContactsModalOpen,
    deviceContacts,
    startChatWithContact,
    addNewDeviceContact,
    startCall,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'registered' | 'invite'>('registered');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [inviteSentToast, setInviteSentToast] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    status: 'found' | 'not_found';
    name?: string;
    phone: string;
    avatar?: string;
    isSelf?: boolean;
  } | null>(null);

  if (!isContactsModalOpen) return null;

  const registeredList = deviceContacts.filter((c) => c.isRegisteredOnAGC);
  const nonRegisteredList = deviceContacts.filter((c) => !c.isRegisteredOnAGC);

  const filteredContacts = deviceContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.rawPhoneNumber.includes(searchQuery) ||
      contact.normalizedPhoneNumber.includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterTab === 'registered') return contact.isRegisteredOnAGC;
    if (filterTab === 'invite') return !contact.isRegisteredOnAGC;
    return true;
  });

  const normalizePhone = (raw: string) => {
    const cleaned = raw.replace(/[\s\-().+]/g, '');
    if (cleaned.startsWith('0')) return '+234' + cleaned.slice(1);
    if (cleaned.startsWith('234')) return '+' + cleaned;
    if (cleaned.startsWith('+')) return cleaned;
    return '+' + cleaned;
  };

  const handleCheckPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newPhone.trim();
    if (!clean) return;

    setIsChecking(true);
    setCheckResult(null);
    const normalized = normalizePhone(clean);
    let foundName = '';
    let foundAvatar = '';

    // Check if user entered their own number -> Message Yourself
    const myClean = (currentUser.phoneNumber || '').replace(/\D/g, '');
    const enteredClean = clean.replace(/\D/g, '');
    const isSelfNumber = Boolean(
      myClean &&
      enteredClean &&
      (myClean === enteredClean || (enteredClean.length >= 7 && (myClean.endsWith(enteredClean) || enteredClean.endsWith(myClean))))
    );

    if (isSelfNumber) {
      setIsChecking(false);
      setCheckResult({
        status: 'found',
        name: `${currentUser.fullName || 'You'} (Message yourself)`,
        phone: currentUser.phoneNumber || normalized,
        avatar: currentUser.avatarUrl || ICON_AVATAR,
        isSelf: true,
      });
      return;
    }

    // 1. Check live Gateway server registry
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const endpoints = [
        `/api/users/lookup?phone=${encodeURIComponent(normalized)}`,
        `http://${socketHost}:3002/api/users/lookup?phone=${encodeURIComponent(normalized)}`,
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            if (json.found && json.user) {
              foundName = json.user.fullName;
              foundAvatar = json.user.avatarUrl;
              break;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Check in Supabase if configured
    if (!foundName && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone_number, avatar_url')
          .or(`phone_number.eq.${normalized},phone_number.eq.${clean}`)
          .maybeSingle();

        if (data && data.phone_number) {
          foundName = data.full_name || 'AGC User';
          foundAvatar = data.avatar_url || ICON_AVATAR;
        }
      } catch (err) {
        console.warn('Supabase profile check error:', err);
      }
    }

    // 3. Fallback check local device contacts
    if (!foundName) {
      const localMatch = deviceContacts.find(
        (c) => c.normalizedPhoneNumber === normalized || c.rawPhoneNumber === clean
      );
      if (localMatch && localMatch.isRegisteredOnAGC) {
        foundName = localMatch.name;
        foundAvatar = localMatch.avatar || ICON_AVATAR;
      }
    }

    setIsChecking(false);

    if (foundName) {
      setCheckResult({
        status: 'found',
        name: foundName,
        phone: normalized,
        avatar: foundAvatar || ICON_AVATAR,
      });
    } else {
      setCheckResult({
        status: 'not_found',
        phone: normalized,
      });
    }
  };

  const handleAddFoundUser = () => {
    if (!checkResult || checkResult.status !== 'found') return;
    const isSelf = checkResult.isSelf;
    const name = isSelf
      ? `${currentUser.fullName || 'You'} (Message yourself)`
      : (checkResult.name || 'AGC Contact');
    const contact = addNewDeviceContact(
      name,
      checkResult.phone,
      isSelf ? 'Message yourself · Notes and reminders' : 'AGC User',
      true,
      checkResult.avatar
    );
    setInviteSentToast(`✅ Opening chat with ${name}...`);
    setTimeout(() => setInviteSentToast(null), 3000);
    setNewPhone('');
    setCheckResult(null);
    setShowAddContactForm(false);
    startChatWithContact(contact);
  };

  const handleSendInviteToJoin = () => {
    if (!checkResult) return;
    const name = `Contact ${checkResult.phone}`;
    addNewDeviceContact(name, checkResult.phone, 'Invited to AGC', false);
    
    // Attempt navigator.share or copy invite
    const inviteText = `Hey! Connect with me on AGC, the African Super-App for calls, chat and market. Join here: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    
    setInviteSentToast(`ðŸ“² Free SMS invite queued for ${checkResult.phone}. Link copied to clipboard!`);
    setTimeout(() => setInviteSentToast(null), 3500);
    setNewPhone('');
    setCheckResult(null);
    setShowAddContactForm(false);
  };

  const handleSendInvite = (contact: DeviceContact) => {
    const inviteText = `Hey ${contact.name}! Connect with me on AGC. Join here: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    setInviteSentToast(`ðŸ’¬ Free SMS invite sent to ${contact.name} (${contact.normalizedPhoneNumber})`);
    setTimeout(() => {
      setInviteSentToast(null);
    }, 3500);
  };

  return (
    <div
      onClick={() => setIsContactsModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#120a21] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-purple-900/40"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-purple-900/60 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-purple-900/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Contacts on AGC
              </h3>
              <p className="text-[10px] text-purple-400/80">
                {registeredList.length} on AGC Â· {nonRegisteredList.length} inviteable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsContactsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Sent Toast */}
        {inviteSentToast && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{inviteSentToast}</span>
          </div>
        )}

        {/* Search & Tabs */}
        <div className="p-4 space-y-2.5 border-b border-slate-100 dark:border-purple-900/30 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-purple-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or African phone number..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-purple-300/40 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab('registered')}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  filterTab === 'registered'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-purple-950/40 text-slate-600 dark:text-purple-300'
                }`}
              >
                On AGC ({registeredList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('invite')}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  filterTab === 'invite'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-purple-950/40 text-slate-600 dark:text-purple-300'
                }`}
              >
                Invite ({nonRegisteredList.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddContactForm(!showAddContactForm);
                setCheckResult(null);
                setNewPhone('');
              }}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Number</span>
            </button>
          </div>
        </div>

        {/* Add Contact Flow - ONLY ASKS FOR PHONE NUMBER */}
        {showAddContactForm && (
          <div className="p-4 bg-purple-50/70 dark:bg-[#180a33] border-b border-purple-200 dark:border-purple-800/40 space-y-3 shrink-0 animate-in slide-in-from-top-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-purple-200">
                Add Contact by Phone Number
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/60 mt-0.5">
                AGC verifies instantly if this number is an active user.
              </p>
            </div>

            <form onSubmit={handleCheckPhone} className="flex gap-2">
              <input
                type="tel"
                placeholder="e.g. 0803 123 4567 or +234..."
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setCheckResult(null);
                }}
                autoFocus
                required
                className="flex-1 px-3 py-2 bg-white dark:bg-[#0e0620] border border-purple-300 dark:border-purple-500/30 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={!newPhone.trim() || isChecking}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
              >
                {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Check</span>
              </button>
            </form>

            {/* Result: User Found on AGC */}
            {checkResult?.status === 'found' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0">
                    <img src={checkResult.avatar || ICON_AVATAR} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {checkResult.name}
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Uses AGC</span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-purple-300/70 block mt-0.5">
                      {checkResult.phone}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddFoundUser}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Add to Contacts & Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddContactForm(false); setCheckResult(null); setNewPhone(''); }}
                    className="px-3 py-2 bg-slate-200 dark:bg-purple-900/30 text-slate-700 dark:text-purple-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Result: Not on AGC */}
            {checkResult?.status === 'not_found' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Not registered on AGC yet
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-purple-300/70 mt-0.5">
                      {checkResult.phone} is not on AGC. You can send them a free invite link to connect with you.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendInviteToJoin}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Invite to Join</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddContactForm(false); setCheckResult(null); setNewPhone(''); }}
                    className="px-3 py-2 bg-slate-200 dark:bg-purple-900/30 text-slate-700 dark:text-purple-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!checkResult && (
              <button
                type="button"
                onClick={() => setShowAddContactForm(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-purple-300 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-purple-950/40">
          {/* Quick Message Yourself row */}
          {(!searchQuery || 'message yourself you notes'.includes(searchQuery.toLowerCase())) && (
            <div
              onClick={() => {
                const selfContact: DeviceContact = {
                  id: 'self',
                  name: `${currentUser.fullName || 'You'} (Message yourself)`,
                  rawPhoneNumber: currentUser.phoneNumber || '',
                  normalizedPhoneNumber: currentUser.phoneNumber || '',
                  about: 'Message yourself · Notes, media & links',
                  avatar: currentUser.avatarUrl || ICON_AVATAR,
                  isRegisteredOnAGC: true,
                };
                startChatWithContact(selfContact);
              }}
              className="p-3.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between transition-colors cursor-pointer bg-purple-50/30 dark:bg-purple-950/10 border-b border-purple-200/50 dark:border-purple-900/30 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center">
                    <img
                      src={currentUser.avatarUrl || ICON_AVATAR}
                      alt="You"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#120a21]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.fullName || 'You'} (Message yourself)
                    </h4>
                    <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full">
                      You
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-600 dark:text-purple-300/80 truncate mt-0.5">
                    Message yourself · Notes, links, reminders
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            </div>
          )}
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3.5 hover:bg-slate-50 dark:hover:bg-purple-950/30 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 dark:bg-purple-950/60 flex items-center justify-center border border-purple-500/20">
                    <img
                      src={contact.avatar || ICON_AVATAR}
                      alt={contact.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {contact.isRegisteredOnAGC && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#120a21]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {contact.name}
                    </h4>
                    {contact.isRegisteredOnAGC && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                        AGC User
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-purple-300/60">
                    {contact.normalizedPhoneNumber}
                  </div>
                  {contact.about && (
                    <p className="text-[11px] text-slate-400 dark:text-purple-300/40 truncate italic mt-0.5">
                      &ldquo;{contact.about}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                {contact.isRegisteredOnAGC ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startChatWithContact(contact)}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                      title="Start Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall(contact.name, contact.normalizedPhoneNumber, contact.avatar, 'voice')}
                      className="p-1.5 text-slate-500 dark:text-purple-300 hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-purple-900/30 rounded-xl"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendInvite(contact)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-purple-950/60 hover:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-purple-800/40 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Invite</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-purple-300/40">
              No contacts found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
