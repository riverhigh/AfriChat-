import React, { useState, useEffect, useCallback } from 'react';
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
  Radio,
  Plus,
  Check,
  Smartphone,
  BookUser,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { useApp, normalizePhoneInternational, phonesMatch } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { DeviceContact } from '../types';
import { isSyntheticTestUser } from '../utils/testAccountFilter';

const ICON_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>";

export const ContactsModal: React.FC = () => {
  const {
    isContactsModalOpen,
    setIsContactsModalOpen,
    deviceContacts,
    startChatWithContact,
    openDirectChat,
    addNewDeviceContact,
    importDeviceContacts,
    startCall,
    currentUser,
    createGroup,
    createChannel,
    isUserOnline,
    friendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    setActiveContactRequestPopup,
    startAiChat,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'registered' | 'invite'>('registered');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<{ name: string; phone: string }[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [selectedChannelMembers, setSelectedChannelMembers] = useState<{ name: string; phone: string }[]>([]);

  const [isCreatingGroupOrChannel, setIsCreatingGroupOrChannel] = useState(false);

  const permissionStorageKey = `AGC_contacts_permission_status_${
    (currentUser.phoneNumber || currentUser.id || 'default').replace(/\D/g, '') || 'default'
  }`;
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>(() => {
    try {
      const saved = localStorage.getItem(permissionStorageKey);
      if (saved === 'granted' || saved === 'denied') return saved;
    } catch (_) {}
    return 'unknown';
  });
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  const [autoDiscoverySummary, setAutoDiscoverySummary] = useState<string | null>(null);

  const autoFindAgcContacts = useCallback(async () => {
    setIsAutoDiscovering(true);
    try {
      const serverDirectory = new Map<string, { name: string; phone: string; avatar?: string }>();
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const payload = await res.json();
          const list = Array.isArray(payload) ? payload : payload?.users;
          if (Array.isArray(list)) {
            for (const u of list) {
              if (isSyntheticTestUser(u)) continue;
              const digits = String(u.phoneNumber || u.phone || '').replace(/\D/g, '');
              const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
              if (last9.length >= 7) {
                serverDirectory.set(last9, {
                  name: u.fullName || u.username || u.name || 'AGC User',
                  phone: u.phoneNumber || u.phone || `+${digits}`,
                  avatar: u.avatarUrl,
                });
              }
            }
          }
        }
      } catch (_) {}

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('agc_phone_registry')
            .select('full_phone, phone_digits, username, avatar_url')
            .limit(250);
          if (Array.isArray(data)) {
            for (const row of data) {
              if (isSyntheticTestUser(row)) continue;
              const digits = String(row.phone_digits || row.full_phone || '').replace(/\D/g, '');
              const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
              if (last9.length >= 7 && !serverDirectory.has(last9)) {
                serverDirectory.set(last9, {
                  name: row.username || 'AGC User',
                  phone: row.full_phone || `+${digits}`,
                  avatar: row.avatar_url,
                });
              }
            }
          }
        } catch (_) {}
      }

      const myLast9 = (currentUser.phoneNumber || '').replace(/\D/g, '').slice(-9);
      const toSync: { name: string; phone: string }[] = [];
      let matchedExisting = 0;

      for (const c of deviceContacts) {
        const cDigits = (c.normalizedPhoneNumber || c.rawPhoneNumber || '').replace(/\D/g, '');
        const cLast9 = cDigits.length >= 9 ? cDigits.slice(-9) : cDigits;
        if (!cLast9 || (myLast9 && cLast9 === myLast9)) continue;
        if (serverDirectory.has(cLast9)) {
          matchedExisting += 1;
          if (!c.isRegisteredOnAGC) {
            toSync.push({
              name: c.name || serverDirectory.get(cLast9)!.name,
              phone: c.normalizedPhoneNumber || c.rawPhoneNumber,
            });
          }
        }
      }

      // Also ensure registered directory users not yet in local contact list are checked/synced
      for (const [last9, dirUser] of serverDirectory.entries()) {
        if (myLast9 && last9 === myLast9) continue;
        const already = deviceContacts.some((c) => {
          const d = (c.normalizedPhoneNumber || c.rawPhoneNumber || '').replace(/\D/g, '');
          return d.endsWith(last9);
        });
        if (!already && toSync.length < 30) {
          toSync.push({ name: dirUser.name, phone: dirUser.phone });
        }
      }

      let syncedFound = matchedExisting;
      if (toSync.length > 0) {
        syncedFound = await importDeviceContacts(toSync);
      }

      const totalFound = Math.max(syncedFound, matchedExisting);
      setAutoDiscoverySummary(
        totalFound > 0
          ? `Found ${totalFound} contact${totalFound === 1 ? '' : 's'} with active AGC accounts`
          : 'Synced device contacts — no new AGC accounts discovered yet'
      );
    } finally {
      setIsAutoDiscovering(false);
    }
  }, [currentUser.phoneNumber, deviceContacts, importDeviceContacts]);

  useEffect(() => {
    if (isContactsModalOpen && permissionStatus === 'granted') {
      autoFindAgcContacts();
    }
  }, [isContactsModalOpen, permissionStatus]);

  const handleCreateGroup = () => {
    const cleanName = groupName.trim();
    if (!cleanName || cleanName.startsWith('__') || isCreatingGroupOrChannel) return;
    setIsCreatingGroupOrChannel(true);
    createGroup(
      cleanName,
      selectedGroupMembers.map((m) => m.name),
      undefined,
      groupDesc.trim(),
      selectedGroupMembers.map((m) => m.phone)
    );
    setIsContactsModalOpen(false);
    setShowCreateGroup(false);
    setGroupName('');
    setGroupDesc('');
    setSelectedGroupMembers([]);
    setTimeout(() => setIsCreatingGroupOrChannel(false), 600);
  };

  const handleCreateChannel = () => {
    const cleanName = channelName.trim();
    if (!cleanName || cleanName.startsWith('__') || isCreatingGroupOrChannel) return;
    setIsCreatingGroupOrChannel(true);
    createChannel(
      cleanName,
      channelDesc.trim(),
      undefined,
      selectedChannelMembers.map((m) => m.name),
      selectedChannelMembers.map((m) => m.phone)
    );
    setIsContactsModalOpen(false);
    setShowCreateChannel(false);
    setChannelName('');
    setChannelDesc('');
    setSelectedChannelMembers([]);
    setTimeout(() => setIsCreatingGroupOrChannel(false), 600);
  };
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

  const [directoryResults, setDirectoryResults] = useState<
    Array<{ id: string; fullName: string; username?: string; phoneNumber: string; avatarUrl?: string; about?: string; isOnline?: boolean }>
  >([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!isContactsModalOpen || q.length < 2) {
      setDirectoryResults([]);
      setIsSearchingDirectory(false);
      return;
    }

    let cancelled = false;
    setIsSearchingDirectory(true);
    const timer = setTimeout(async () => {
      const results: Array<{
        id: string;
        fullName: string;
        username?: string;
        phoneNumber: string;
        avatarUrl?: string;
        about?: string;
        isOnline?: boolean;
      }> = [];
      const seenPhones: string[] = [];

      const pushResult = (u: any) => {
        if (!u || isSyntheticTestUser(u)) return;
        const rawPhone = u.phoneNumber || u.phone || u.full_phone || '';
        const normPhone = normalizePhoneInternational(rawPhone) || rawPhone;
        if (!normPhone) return;
        if (currentUser.phoneNumber && phonesMatch(normPhone, currentUser.phoneNumber)) return;
        if (seenPhones.some((p) => phonesMatch(p, normPhone))) return;
        seenPhones.push(normPhone);
        results.push({
          id: u.id || `dir_${normPhone}`,
          fullName: u.fullName || u.name || u.username || normPhone,
          username: u.username,
          phoneNumber: normPhone,
          avatarUrl: u.avatarUrl || u.avatar_url,
          about: u.about,
          isOnline: Boolean(u.isOnline),
        });
      };

      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(q)}&excludePhone=${encodeURIComponent(currentUser.phoneNumber || '')}`
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.users)) {
            json.users.forEach(pushResult);
          }
        }
      } catch (_) {}

      if (!cancelled && isSupabaseConfigured && results.length < 10) {
        try {
          const digits = q.replace(/\D/g, '');
          const cleanUser = q.replace(/^@/, '');
          const filters = [`username.ilike.%${cleanUser}%`];
          if (digits.length >= 4) {
            filters.push(`phone_digits.ilike.%${digits}%`, `full_phone.ilike.%${digits}%`);
          }
          const { data } = await supabase
            .from('agc_phone_registry')
            .select('full_phone, phone_digits, username, avatar_url')
            .or(filters.join(','))
            .limit(12);
          if (Array.isArray(data)) {
            data.forEach((row) =>
              pushResult({
                fullName: row.username || 'AGC User',
                username: row.username,
                phoneNumber: row.full_phone,
                avatarUrl: row.avatar_url,
              })
            );
          }
        } catch (_) {}
      }

      if (!cancelled) {
        setDirectoryResults(results);
        setIsSearchingDirectory(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isContactsModalOpen, currentUser.phoneNumber]);

  if (!isContactsModalOpen) return null;

  const registeredList = deviceContacts.filter((c) => c.isRegisteredOnAGC && !isSyntheticTestUser(c));
  const nonRegisteredList = deviceContacts.filter((c) => !c.isRegisteredOnAGC && !isSyntheticTestUser(c));

  const filteredContacts = deviceContacts.filter((contact) => {
    if (isSyntheticTestUser(contact)) return false;
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.rawPhoneNumber.includes(searchQuery) ||
      contact.normalizedPhoneNumber.includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterTab === 'registered') return contact.isRegisteredOnAGC;
    if (filterTab === 'invite') return !contact.isRegisteredOnAGC;
    return true;
  });

  const nonSavedDirectoryResults = directoryResults.filter(
    (du) =>
      !deviceContacts.some(
        (dc) =>
          dc.isRegisteredOnAGC &&
          (phonesMatch(dc.normalizedPhoneNumber, du.phoneNumber) ||
            phonesMatch(dc.rawPhoneNumber, du.phoneNumber))
      )
  );

  const normalizePhone = (raw: string) => normalizePhoneInternational(raw) || raw.trim();

  const handleCheckPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newPhone.trim();
    if (!clean) return;

    setIsChecking(true);
    setCheckResult(null);
    const hasDigits = clean.replace(/\D/g, '').length >= 6;
    const normalized = hasDigits ? normalizePhone(clean) : clean;
    let foundName = '';
    let foundAvatar = '';
    let resolvedPhone = hasDigits ? normalized : '';

    // Check if user entered their own number or own @username -> Message Yourself
    const myClean = (currentUser.phoneNumber || '').replace(/\D/g, '');
    const enteredClean = clean.replace(/\D/g, '');
    const enteredLast9 = enteredClean.length >= 9 ? enteredClean.slice(-9) : enteredClean;
    const cleanHandle = clean.replace(/^@/, '').toLowerCase();
    const isSelfHandle = Boolean(
      currentUser.username && cleanHandle && currentUser.username.toLowerCase() === cleanHandle
    );
    const isSelfNumber = Boolean(
      isSelfHandle ||
      (myClean &&
      enteredClean &&
      (myClean === enteredClean || (enteredClean.length >= 7 && (myClean.endsWith(enteredClean) || enteredClean.endsWith(myClean)))))
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

    // 1. Check live Gateway server lookup FIRST (supports phone OR @username OR name)
    try {
      const endpoints = [
        `/api/users/lookup?query=${encodeURIComponent(clean)}`,
        ...(hasDigits
          ? [
              `/api/users/lookup?phone=${encodeURIComponent(normalized)}`,
              `/api/users/lookup?phone=${encodeURIComponent(enteredClean)}`,
            ]
          : []),
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            if (json.found && json.user) {
              foundName = json.user.fullName || json.user.name || json.user.username || 'AGC User';
              foundAvatar = json.user.avatarUrl || '';
              if (json.user.phoneNumber) resolvedPhone = json.user.phoneNumber;
              break;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Check Supabase agc_phone_registry (cross-device source of truth)
    if (!foundName && isSupabaseConfigured) {
      try {
        const orFilter = hasDigits
          ? `phone_digits.eq.${enteredLast9},phone_digits.eq.${enteredClean},full_phone.eq.${normalized},full_phone.eq.${clean},full_phone.eq.+${enteredClean},username.ilike.${cleanHandle}`
          : `username.ilike.${cleanHandle}`;
        const { data: reg } = await supabase
          .from('agc_phone_registry')
          .select('username, avatar_url, full_phone, phone_digits')
          .or(orFilter)
          .limit(1)
          .maybeSingle();

        if (reg) {
          foundName = reg.username || 'AGC User';
          foundAvatar = reg.avatar_url || ICON_AVATAR;
          if (reg.full_phone) resolvedPhone = reg.full_phone;
        }
      } catch (err) {
        console.warn('Supabase agc_phone_registry check notice:', err);
      }

      if (!foundName && hasDigits) {
        try {
          const { data: direct } = await supabase
            .from('agc_phone_registry')
            .select('username, avatar_url, full_phone')
            .eq('phone_digits', enteredLast9)
            .limit(1)
            .maybeSingle();
          if (direct) {
            foundName = direct.username || 'AGC User';
            foundAvatar = direct.avatar_url || ICON_AVATAR;
            if (direct.full_phone) resolvedPhone = direct.full_phone;
          }
        } catch (_) {}
      }
    }

    // 3. Check local persistent registered phones registry (all created users)
    if (!foundName && hasDigits) {
      try {
        const raw = localStorage.getItem('AGC_registered_phones');
        if (raw) {
          const reg = JSON.parse(raw);
          for (const [key, val] of Object.entries(reg) as [string, any][]) {
            const kd = key.replace(/\D/g, '');
            if (kd === enteredClean || (enteredLast9.length >= 7 && kd.endsWith(enteredLast9))) {
              foundName = val.fullName || val.username || 'AGC User';
              foundAvatar = val.avatarUrl;
              resolvedPhone = val.phoneNumber || normalized;
              break;
            }
          }
        }
      } catch (_) {}
    }

    // 4. Check all registered users array in local storage
    if (!foundName) {
      try {
        const raw = localStorage.getItem('AGC_all_registered_users');
        if (raw) {
          const users: any[] = JSON.parse(raw);
          for (const u of users) {
            const up = (u.phoneNumber || '').replace(/\D/g, '');
            const matchesHandle = Boolean(u.username && cleanHandle && u.username.toLowerCase() === cleanHandle);
            const matchesPhone = Boolean(hasDigits && (up === enteredClean || (enteredLast9.length >= 7 && up.endsWith(enteredLast9))));
            if (matchesHandle || matchesPhone) {
              foundName = u.fullName || u.username || 'AGC User';
              foundAvatar = u.avatarUrl;
              if (u.phoneNumber) resolvedPhone = u.phoneNumber;
              break;
            }
          }
        }
      } catch (_) {}
    }

    // 5. Check in Supabase profiles if configured
    if (!foundName && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone_number, avatar_url')
          .or(
            hasDigits
              ? `phone_number.eq.${normalized},phone_number.eq.${clean},phone_number.ilike.%${enteredLast9}%`
              : `full_name.ilike.%${cleanHandle}%`
          )
          .limit(1)
          .maybeSingle();

        if (data && data.phone_number) {
          foundName = data.full_name || 'AGC User';
          foundAvatar = data.avatar_url || ICON_AVATAR;
          resolvedPhone = data.phone_number;
        }
      } catch (err) {
        console.warn('Supabase profile check notice:', err);
      }
    }

    // 6. Fallback check local device contacts
    if (!foundName) {
      const localMatch = deviceContacts.find((c) => {
        const cp = (c.normalizedPhoneNumber || c.rawPhoneNumber || '').replace(/\D/g, '');
        return (
          (hasDigits && (cp === enteredClean || (enteredLast9.length >= 7 && cp.endsWith(enteredLast9)))) ||
          (cleanHandle && c.name.toLowerCase() === cleanHandle)
        );
      });
      if (localMatch && localMatch.isRegisteredOnAGC) {
        foundName = localMatch.name;
        foundAvatar = localMatch.avatar || ICON_AVATAR;
        resolvedPhone = localMatch.normalizedPhoneNumber || localMatch.rawPhoneNumber;
      }
    }

    setIsChecking(false);

    if (foundName && resolvedPhone) {
      setCheckResult({
        status: 'found',
        name: foundName,
        phone: resolvedPhone,
        avatar: foundAvatar || ICON_AVATAR,
      });
    } else {
      setCheckResult({
        status: 'not_found',
        phone: resolvedPhone || normalized,
      });
    }
  };

  const handleMessageFoundDirectly = () => {
    if (!checkResult || checkResult.status !== 'found') return;
    const isSelf = checkResult.isSelf;
    const name = isSelf
      ? `${currentUser.fullName || 'You'} (Message yourself)`
      : (checkResult.name || 'AGC User');
    openDirectChat({
      phone: checkResult.phone,
      userId: isSelf ? 'self' : undefined,
      name,
      avatar: checkResult.avatar,
      location: 'Direct Message',
    });
    setNewPhone('');
    setCheckResult(null);
    setShowAddContactForm(false);
    setIsContactsModalOpen(false);
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
      checkResult.avatar,
      { sendRequest: !isSelf }
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
    const contact = addNewDeviceContact(name, checkResult.phone, 'AGC Friend', true, undefined, { sendRequest: true });
    
    // Attempt navigator.share or copy invite
    const inviteText = `Hey! Connect with me on AGC, the African Super-App for calls, chat and market. Join here: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    
    setInviteSentToast(`Added ${checkResult.phone} to AGC contacts & copied invite link!`);
    setTimeout(() => setInviteSentToast(null), 3500);
    setNewPhone('');
    setCheckResult(null);
    setShowAddContactForm(false);
    startChatWithContact(contact);
  };

  const handleSendInvite = (contact: DeviceContact) => {
    const inviteText = `Hey ${contact.name}! Connect with me on AGC. Join here: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    setInviteSentToast(`💬 Free SMS invite sent to ${contact.name} (${contact.normalizedPhoneNumber})`);
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
                {registeredList.length} on AGC · {nonRegisteredList.length} inviteable
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

        {/* Phone Contacts Permission Prompt Card */}
        {(permissionStatus === 'unknown' || showPermissionPrompt) && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-purple-600/15 via-indigo-600/10 to-purple-900/20 border border-purple-500/35 space-y-2.5 shrink-0 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Allow AGC to access your phone contacts?
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-purple-200/75 mt-0.5 leading-relaxed">
                  AGC will scan your address book to automatically discover friends who already have an AGC account.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    localStorage.setItem(permissionStorageKey, 'granted');
                  } catch (_) {}
                  setPermissionStatus('granted');
                  setShowPermissionPrompt(false);

                  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
                    try {
                      const props = ['name', 'tel'];
                      const opts = { multiple: true };
                      const contacts = await (navigator as any).contacts.select(props, opts);
                      if (contacts && contacts.length > 0) {
                        const parsed = contacts
                          .map((c: any) => ({
                            name: Array.isArray(c.name) ? c.name[0] : c.name || 'Phone Contact',
                            phone: Array.isArray(c.tel) ? c.tel[0] : c.tel || '',
                          }))
                          .filter((c: any) => c.phone);
                        if (parsed.length > 0) {
                          setIsImporting(true);
                          const foundCount = await importDeviceContacts(parsed);
                          setIsImporting(false);
                          setInviteSentToast(`Synced ${parsed.length} contacts! (${foundCount} on AGC ✨)`);
                          setTimeout(() => setInviteSentToast(null), 3500);
                        }
                      }
                    } catch (err: any) {
                      if (err?.name !== 'AbortError') {
                        console.warn('Contact picker fallback:', err);
                      }
                    }
                  } else {
                    setShowImportModal(true);
                    setShowCreateGroup(false);
                    setShowCreateChannel(false);
                    setShowAddContactForm(false);
                  }
                  await autoFindAgcContacts();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Allow Access &amp; Find Friends
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(permissionStorageKey, 'denied');
                  } catch (_) {}
                  setPermissionStatus('denied');
                  setShowPermissionPrompt(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-purple-950/50 text-slate-700 dark:text-purple-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-purple-900/50 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {/* Top Quick Actions: Access Phone Contacts, New Group & New Channel */}
        <div className="px-4 pt-3 space-y-2 shrink-0">
          <button
            type="button"
            disabled={isImporting || isAutoDiscovering}
            onClick={async () => {
              if (permissionStatus !== 'granted') {
                setShowPermissionPrompt(true);
                return;
              }
              if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
                try {
                  const props = ['name', 'tel'];
                  const opts = { multiple: true };
                  const contacts = await (navigator as any).contacts.select(props, opts);
                  if (contacts && contacts.length > 0) {
                    const parsed = contacts
                      .map((c: any) => ({
                        name: Array.isArray(c.name) ? c.name[0] : c.name || 'Phone Contact',
                        phone: Array.isArray(c.tel) ? c.tel[0] : c.tel || '',
                      }))
                      .filter((c: any) => c.phone);
                    if (parsed.length > 0) {
                      setIsImporting(true);
                      const foundCount = await importDeviceContacts(parsed);
                      setIsImporting(false);
                      setInviteSentToast(`Synced ${parsed.length} contacts! (${foundCount} found on AGC ✨)`);
                      setTimeout(() => setInviteSentToast(null), 3500);
                      await autoFindAgcContacts();
                      return;
                    }
                  }
                } catch (err: any) {
                  if (err?.name !== 'AbortError') {
                    console.warn('Contact picker fallback:', err);
                  }
                }
              }
              await autoFindAgcContacts();
              setShowImportModal(true);
              setShowCreateGroup(false);
              setShowCreateChannel(false);
              setShowAddContactForm(false);
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md active:scale-[0.98] transition-transform text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">Access Phone Contacts</div>
                <div className="text-[10px] text-purple-200 truncate">
                  {autoDiscoverySummary || 'Auto-find contacts who have an AGC account'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
              {isImporting || isAutoDiscovering ? 'Scanning...' : permissionStatus === 'granted' ? 'Auto-Find ✨' : 'Allow Access'}
            </span>
          </button>

          {/* AgcBot AI Quick Chat */}
          <button
            type="button"
            onClick={startAiChat}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-md active:scale-[0.98] transition-transform text-left group border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>Chat with AgcBot AI</span>
                  <span className="px-1.5 py-0.2 text-[8px] font-black uppercase bg-white/25 rounded-full">AGC Guide</span>
                </div>
                <div className="text-[10px] text-pink-200">Official AGC assistant · Features, escrow, games &amp; support</div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
              Start Chat 🤖
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateGroup(true);
                setShowCreateChannel(false);
                setShowAddContactForm(false);
                setShowImportModal(false);
              }}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">New Group</div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400">Live chat group</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreateChannel(true);
                setShowCreateGroup(false);
                setShowAddContactForm(false);
                setShowImportModal(false);
              }}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">New Channel</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Broadcast news</div>
              </div>
            </button>
          </div>
        </div>

        {/* Batch Contacts Import Drawer */}
        {showImportModal && (
          <div className="p-4 border-b border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/30 space-y-3 shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-200">
                <BookUser className="w-4 h-4" />
                <span>Import Phone Contacts</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-purple-300/70">
              Paste or type your contacts (Name, Phone number per line). AGC will check which of them are active users:
            </p>
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="e.g.&#10;Mama Chidinma, 08031234567&#10;Uncle Yomi, 08028889911"
              className="w-full p-2.5 bg-white dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-white border border-purple-300 dark:border-purple-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!importText.trim() || isImporting}
                onClick={async () => {
                  const lines = importText.split('\n').filter((l) => l.trim().length > 0);
                  const parsed: { name: string; phone: string }[] = [];
                  for (const line of lines) {
                    const commaParts = line.split(',');
                    if (commaParts.length >= 2) {
                      parsed.push({ name: commaParts[0].trim(), phone: commaParts[1].trim() });
                    } else {
                      const match = line.match(/\+?[0-9\s-]{7,}/);
                      if (match) {
                        const phone = match[0].trim();
                        const name = line.replace(match[0], '').trim() || `Contact ${phone.slice(-4)}`;
                        parsed.push({ name, phone });
                      }
                    }
                  }
                  if (parsed.length > 0) {
                    setIsImporting(true);
                    const foundCount = await importDeviceContacts(parsed);
                    setIsImporting(false);
                    setInviteSentToast(`Synced ${parsed.length} contacts! (${foundCount} found on AGC ✨)`);
                    setTimeout(() => setInviteSentToast(null), 3500);
                  }
                  setImportText('');
                  setShowImportModal(false);
                }}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span>Import & Check AGC Users</span>
              </button>
            </div>
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
              placeholder="Search name, @username, or phone number..."
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
              <span>Find / Add</span>
            </button>
          </div>
        </div>

        {/* Create Group Drawer */}
        {showCreateGroup && (
          <div className="p-4 border-b border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-3 shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Users className="w-4 h-4" />
                <span>Create New Group</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. Lagos Tech Founders)..."
              className="w-full px-3 py-2 bg-white dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-white border border-purple-300 dark:border-purple-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <input
              type="text"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Description or group rules (optional)..."
              className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-white border border-purple-200 dark:border-purple-900/40 focus:outline-none"
            />

            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Select Members ({selectedGroupMembers.length} selected)
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap">
                {(() => {
                  const isBotSelected = selectedGroupMembers.some((m) => m.name === 'AgcBot' || m.name === 'AfriBot AI');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isBotSelected) {
                          setSelectedGroupMembers(selectedGroupMembers.filter((m) => m.name !== 'AgcBot' && m.name !== 'AfriBot AI'));
                        } else {
                          setSelectedGroupMembers([...selectedGroupMembers, { name: 'AgcBot', phone: '+234 BOT AI' }]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-colors ${
                        isBotSelected
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-500'
                          : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      <Bot className="w-3 h-3" />
                      <span>AgcBot (Admin)</span>
                      {isBotSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })()}
                {registeredList.slice(0, 15).map((c) => {
                  const memberPhone = c.normalizedPhoneNumber || c.rawPhoneNumber;
                  const isSelected = selectedGroupMembers.some(
                    (m) => m.name === c.name || (memberPhone && m.phone === memberPhone)
                  );
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedGroupMembers(
                            selectedGroupMembers.filter(
                              (m) => m.name !== c.name && m.phone !== memberPhone
                            )
                          );
                        } else {
                          setSelectedGroupMembers([
                            ...selectedGroupMembers,
                            { name: c.name, phone: memberPhone },
                          ]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-[#1c1033] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-purple-900/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={!groupName.trim()}
              onClick={handleCreateGroup}
              className="w-full py-2 bg-purple-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-xs"
            >
              {selectedGroupMembers.length > 0 ? `Create Group & Send ${selectedGroupMembers.length} Invite(s)` : 'Create Group'}
            </button>
          </div>
        )}

        {/* Create Channel Drawer */}
        {showCreateChannel && (
          <div className="p-4 border-b border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Radio className="w-4 h-4" />
                <span>Create Broadcast Channel</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateChannel(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name (e.g. Afrobeat Daily Hits)..."
              className="w-full px-3 py-2 bg-white dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-white border border-indigo-300 dark:border-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <input
              type="text"
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
              placeholder="Channel topic & broadcast info (optional)..."
              className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1033] rounded-xl text-xs text-slate-900 dark:text-white border border-indigo-200 dark:border-indigo-900/40 focus:outline-none"
            />

            {registeredList.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Invite Subscribers ({selectedChannelMembers.length} selected)
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap">
                  {registeredList.slice(0, 15).map((c) => {
                    const memberPhone = c.normalizedPhoneNumber || c.rawPhoneNumber;
                    const isSelected = selectedChannelMembers.some(
                      (m) => m.name === c.name || (memberPhone && m.phone === memberPhone)
                    );
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedChannelMembers(
                              selectedChannelMembers.filter(
                                (m) => m.name !== c.name && m.phone !== memberPhone
                              )
                            );
                          } else {
                            setSelectedChannelMembers([
                              ...selectedChannelMembers,
                              { name: c.name, phone: memberPhone },
                            ]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-[#1c1033] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-indigo-900/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!channelName.trim()}
              onClick={handleCreateChannel}
              className="w-full py-2 bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
            >
              {selectedChannelMembers.length > 0
                ? `Create Channel & Send ${selectedChannelMembers.length} Invite(s)`
                : 'Create Broadcast Channel'}
            </button>
          </div>
        )}

        {/* Find / Add Contact Flow - Phone Number or @Username */}
        {showAddContactForm && (
          <div className="p-4 bg-purple-50/70 dark:bg-[#180a33] border-b border-purple-200 dark:border-purple-800/40 space-y-3 shrink-0 animate-in slide-in-from-top-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-purple-200">
                Message Anyone by Phone or @Username
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/60 mt-0.5">
                Start messaging any AGC user immediately — no friend request or saved contact required.
              </p>
            </div>

            <form onSubmit={handleCheckPhone} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 0803 123 4567, +234..., or @username"
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
                <span>Find</span>
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
                    onClick={handleMessageFoundDirectly}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Now</span>
                  </button>
                  {!checkResult.isSelf && (
                    <button
                      type="button"
                      onClick={handleAddFoundUser}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowAddContactForm(false); setCheckResult(null); setNewPhone(''); }}
                    className="px-2.5 py-2 bg-slate-200 dark:bg-purple-900/30 text-slate-700 dark:text-purple-300 rounded-xl text-xs"
                  >
                    Close
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
          {/* Incoming Friend Requests (WeChat Style) */}
          {friendRequests && friendRequests.length > 0 && (
            <div className="p-3 bg-purple-500/10 dark:bg-purple-950/40 border-b border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Friend Requests ({friendRequests.length})</span>
                </span>
                <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-mono">
                  Pending
                </span>
              </div>
              <div className="space-y-2">
                {friendRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setActiveContactRequestPopup(req)}
                    className="p-2.5 bg-white dark:bg-[#1c0e35] hover:bg-purple-500/5 dark:hover:bg-[#251347] rounded-xl border border-purple-300/40 dark:border-purple-800/40 flex items-center justify-between gap-2 shadow-xs cursor-pointer transition-colors"
                    title="Click to view full request pop-up"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={req.senderAvatar || ICON_AVATAR}
                        alt={req.senderName}
                        className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {req.senderName}
                        </div>
                        <div className="text-[10px] text-purple-600 dark:text-purple-300/70 font-mono truncate">
                          {req.senderPhone}
                        </div>
                        {req.message && (
                          <div className="text-[11px] text-slate-500 dark:text-purple-300/60 italic truncate mt-0.5">
                            &ldquo;{req.message}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => declineFriendRequest(req.id)}
                        className="px-2 py-1 bg-slate-200 dark:bg-purple-900/30 text-slate-600 dark:text-purple-300 hover:bg-slate-300 rounded-lg text-xs cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  {contact.isRegisteredOnAGC && (() => {
                    const online = isUserOnline(contact.normalizedPhoneNumber);
                    return online ? (
                      <span
                        title="Online now"
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#120a21] shadow-sm shadow-emerald-400 animate-pulse"
                      />
                    ) : (
                      <span
                        title="Offline"
                        className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 dark:bg-purple-700/60 rounded-full border-2 border-white dark:border-[#120a21]"
                      />
                    );
                  })()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {contact.name}
                    </h4>
                    {contact.isRegisteredOnAGC && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                          AGC User
                        </span>
                        {isUserOnline(contact.normalizedPhoneNumber) && (
                          <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/30 border border-emerald-500/50 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Online</span>
                          </span>
                        )}
                      </div>
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

          {/* Global AGC User Search Results (Non-Contacts can always be messaged) */}
          {searchQuery.trim().length >= 2 && (isSearchingDirectory || nonSavedDirectoryResults.length > 0) && (
            <div className="p-3 bg-indigo-500/5 dark:bg-indigo-950/25 border-b border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>AGC People Directory (Message Directly)</span>
                </span>
                {isSearchingDirectory && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              </div>
              {nonSavedDirectoryResults.map((du) => (
                <div
                  key={`dir_${du.phoneNumber}`}
                  className="p-2.5 bg-white dark:bg-[#1a0d30] rounded-xl border border-purple-500/20 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-500/30 shrink-0">
                      <img src={du.avatarUrl || ICON_AVATAR} alt={du.fullName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{du.fullName}</span>
                        {du.username && (
                          <span className="text-[10px] font-mono text-purple-400 truncate">@{du.username}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-purple-300/60 truncate">
                        {du.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        openDirectChat({
                          phone: du.phoneNumber,
                          userId: du.id,
                          name: du.fullName,
                          avatar: du.avatarUrl,
                          location: 'AGC Directory',
                        });
                        setIsContactsModalOpen(false);
                      }}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredContacts.length === 0 && nonSavedDirectoryResults.length === 0 && !isSearchingDirectory && (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-purple-300/40">
              No contacts found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
