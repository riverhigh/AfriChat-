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
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceContact } from '../types';

export const ContactsModal: React.FC = () => {
  const {
    isContactsModalOpen,
    setIsContactsModalOpen,
    deviceContacts,
    startChatWithContact,
    addNewDeviceContact,
    startCall,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'registered' | 'invite'>('registered');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAbout, setNewAbout] = useState('');
  const [inviteSentToast, setInviteSentToast] = useState<string | null>(null);

  if (!isContactsModalOpen) return null;

  const registeredList = deviceContacts.filter((c) => c.isRegisteredOnAfriChat);
  const nonRegisteredList = deviceContacts.filter((c) => !c.isRegisteredOnAfriChat);

  const filteredContacts = deviceContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.rawPhoneNumber.includes(searchQuery) ||
      contact.normalizedPhoneNumber.includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterTab === 'registered') return contact.isRegisteredOnAfriChat;
    if (filterTab === 'invite') return !contact.isRegisteredOnAfriChat;
    return true;
  });

  const handleSendInvite = (contact: DeviceContact) => {
    setInviteSentToast(`💬 Free SMS invite sent to ${contact.name} (${contact.normalizedPhoneNumber}) via Termii local gateway!`);
    setTimeout(() => {
      setInviteSentToast(null);
    }, 3500);
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please enter a name and phone number');
      return;
    }
    addNewDeviceContact(newName.trim(), newPhone.trim(), newAbout.trim());
    setNewName('');
    setNewPhone('');
    setNewAbout('');
    setShowAddContactForm(false);
  };

  return (
    <div
      onClick={() => setIsContactsModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Contacts on AfriChat
              </h3>
              <p className="text-[10px] text-slate-400">
                {registeredList.length} registered · {nonRegisteredList.length} inviteable contacts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsContactsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
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
        <div className="p-4 space-y-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or African phone number..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab('registered')}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  filterTab === 'registered'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                On AfriChat ({registeredList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('invite')}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  filterTab === 'invite'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Invite via SMS ({nonRegisteredList.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddContactForm(!showAddContactForm)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Add Contact Inline Drawer */}
        {showAddContactForm && (
          <form onSubmit={handleCreateContact} className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 space-y-2 shrink-0 animate-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Add New Device Contact (Auto E.164 Sync)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name / Store"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <input
                type="tel"
                placeholder="Phone (e.g. 0803 123 4567)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Save & Query Backend
              </button>
              <button
                type="button"
                onClick={() => setShowAddContactForm(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  {contact.isRegisteredOnAfriChat && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161426]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {contact.name}
                    </h4>
                    {contact.isRegisteredOnAfriChat && (
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full font-bold">
                        On AfriChat
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {contact.normalizedPhoneNumber}
                  </div>
                  {contact.about && (
                    <p className="text-[11px] text-slate-400 truncate italic mt-0.5">
                      &ldquo;{contact.about}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                {contact.isRegisteredOnAfriChat ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startChatWithContact(contact)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                      title="Start Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall(contact.name, contact.normalizedPhoneNumber, contact.avatar, 'voice')}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendInvite(contact)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Invite SMS</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No contacts found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
