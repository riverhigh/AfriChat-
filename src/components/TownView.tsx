import React, { useState } from 'react';
import {
  Users,
  Radio,
  Hash,
  Shield,
  ShieldCheck,
  Search,
  Sparkles,
  MessageCircle,
  Plus,
  Volume2,
  ExternalLink,
  Flame,
  Check,
  UserCheck,
  Lock,
  Headphones,
  Ticket,
  Wrench,
  BookOpen,
  Crown,
  Store,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TownCommunity } from '../types';

export const TownView: React.FC = () => {
  const {
    townCommunities,
    toggleJoinTownCommunity,
    hidePhoneNumberInTown,
    toggleHidePhoneNumberInTown,
    currentUser,
    audioSpaces,
    joinAudioSpace,
    setActiveChatId,
    chats,
    setIsCreatorModalOpen,
    setIsServicesModalOpen,
    setIsWritersModalOpen,
    setIsCelebrityModalOpen,
    setIsStoreRegModalOpen,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'groups' | 'spaces'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityType, setNewCommunityType] = useState<'group' | 'channel'>('group');
  const [newCommunityCategory, setNewCommunityCategory] = useState<TownCommunity['category']>('Tech & Hustle');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  const categories = [
    'All',
    'Tech & Hustle',
    'Market & Trade',
    'Campus & Youth',
    'Lifestyle & Faith',
    'Music & Creative',
  ];

  // Derive user's masked username
  const cleanUsername = currentUser.fullName
    ? `@${currentUser.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : '@afri_citizen';

  const filteredCommunities = townCommunities.filter((item) => {
    if (activeFilter === 'channels' && item.type !== 'channel') return false;
    if (activeFilter === 'groups' && item.type !== 'group') return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCommunityChat = (community: TownCommunity) => {
    // If there's an existing chat matching, open it; otherwise open first group or first chat
    const match = chats.find(
      (c) => c.isGroup && (c.name.toLowerCase().includes('group') || c.name.toLowerCase().includes(community.name.slice(0, 5).toLowerCase()))
    ) || chats[0];

    if (match) {
      setActiveChatId(match.id);
    }
  };

  return (
    <div className="flex flex-col pb-24 text-slate-800 dark:text-white bg-slate-50 dark:bg-black min-h-[calc(100vh-130px)]">
      {/* Top Banner Header */}
      <div className="px-4 pt-3.5 pb-2 bg-white dark:bg-black border-b border-slate-200 dark:border-neutral-900 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                Town
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                Public Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Groups, Channels & Street Radio Spaces
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-transform active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </div>

        {/* Anonymous Username & Phone Privacy Toggle (Prominent) */}
        <div className="mt-2 mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-purple-900/10 dark:from-purple-950/40 dark:to-neutral-900 border border-purple-200/80 dark:border-purple-900/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              hidePhoneNumberInTown ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
            }`}>
              {hidePhoneNumberInTown ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {hidePhoneNumberInTown ? 'Phone Number Hidden' : 'Show Phone in Town'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300">
                  {cleanUsername}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight truncate">
                {hidePhoneNumberInTown
                  ? 'Members only see your username. Phone number is protected.'
                  : 'Tap toggle to mask phone number across channels & groups.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleHidePhoneNumberInTown}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
              hidePhoneNumberInTown ? 'bg-purple-600' : 'bg-slate-300 dark:bg-neutral-700'
            }`}
            title="Toggle Anonymous Phone Masking"
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                hidePhoneNumberInTown ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, groups, street radio..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-transparent focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Type Tabs: All, Channels, Groups, Spaces */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            All Town
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('channels')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'channels'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            <Hash className="w-3 h-3" />
            <span>Channels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('groups')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'groups'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Groups</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('spaces')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'spaces'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            <Radio className="w-3 h-3 text-rose-500" />
            <span>Street Radio Spaces</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Creator Economy Spotlight Banner */}
        <div
          onClick={() => setIsCreatorModalOpen(true)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-pink-900/40 border border-purple-500/30 hover:border-purple-500/60 cursor-pointer flex items-center justify-between transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">AfriCreator Hub</span>
                <span className="text-[9px] font-mono font-bold bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded-full border border-pink-500/30">
                  Direct Wallet Payouts
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                VIP fan feed, concert tickets & buy songs directly from African artists
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
            <Ticket className="w-4 h-4 text-amber-400" />
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* 1. Artisan Stations & Service Workshop Hub */}
        <div
          onClick={() => setIsServicesModalOpen(true)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-900/40 via-emerald-950/40 to-slate-900/60 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer flex items-center justify-between transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Artisan Service Stations</span>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                  ₦5k Reg • ₦500 Listing
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Register master workshop station, book appointments, hire staff & set operating hours
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>

        {/* 2. African Writers Guild (AfriBooks) */}
        <div
          onClick={() => setIsWritersModalOpen(true)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-purple-950/40 border border-amber-500/30 hover:border-amber-500/60 cursor-pointer flex items-center justify-between transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">African Writers Guild</span>
                <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                  100% Human • No AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Publish books in chapters, tip authors, comment & read together in 2-friend buddy rooms
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
        </div>

        {/* 3. Two-Column Row: Celebrity Verification & Store Tiers */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsCelebrityModalOpen(true)}
            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-amber-500/30 hover:border-amber-500/60 text-left transition-all group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white flex items-center justify-center mb-1.5">
              <Crown className="w-4 h-4 text-amber-200" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
              Celebrity Check
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
              Identity Verification
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsStoreRegModalOpen(true)}
            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-blue-500/30 hover:border-blue-500/60 text-left transition-all group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-1.5">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
              Store Registration
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">
              ₦3k (30) / ₦7k (100)
            </span>
          </button>
        </div>

        {/* Live Street Radio Audio Spaces Section */}
        {(activeFilter === 'all' || activeFilter === 'spaces') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Street Radio (Audio Spaces)
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                12kbps Mesh Ready
              </span>
            </div>

            <div className="space-y-2.5">
              {audioSpaces.map((space) => (
                <div
                  key={space.id}
                  onClick={() => joinAudioSpace(space)}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/20 via-purple-950/20 to-black dark:from-[#210915] dark:to-[#12071d] border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={space.hostAvatar}
                        alt={space.hostName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/50"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white uppercase animate-pulse">
                            LIVE
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                            {space.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-500 transition-colors">
                          {space.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-neutral-300">
                          Host: <span className="font-semibold">{space.hostName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                        <Headphones className="w-3 h-3" />
                        {space.listenersCount} listening
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95"
                      >
                        Tune In
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communities (Channels & Groups) */}
        {activeFilter !== 'spaces' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                      : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3 mt-1">
              {filteredCommunities.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-neutral-800"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          {item.isVerified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold" title="Verified African Community">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
                          <span className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[9px] ${
                            item.type === 'channel'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {item.type}
                          </span>
                          <span>•</span>
                          <span>{item.membersCount.toLocaleString()} members</span>
                          <span>•</span>
                          <span className="truncate">{item.category}</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1 line-clamp-2">
                          {item.description}
                        </p>

                        {/* Recent Activity Quote */}
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-neutral-400 italic bg-slate-50 dark:bg-neutral-900/80 p-1.5 rounded-lg border-l-2 border-purple-500">
                          "{item.recentActivity}"
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleJoinTownCommunity(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                          item.isJoined
                            ? 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                        }`}
                      >
                        {item.isJoined ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Joined</span>
                          </>
                        ) : (
                          <span>+ Join</span>
                        )}
                      </button>

                      {item.isJoined && (
                        <button
                          type="button"
                          onClick={() => handleOpenCommunityChat(item)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        >
                          Open Chat →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Community / Channel */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 rounded-3xl p-5 w-full max-w-sm border border-slate-200 dark:border-neutral-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Town Community
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-3">
              Start a public broadcast channel or discussion group. Your phone number will be automatically protected under @username.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                  Community Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCommunityType('group')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      newCommunityType === 'group'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    Group (Chat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCommunityType('channel')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      newCommunityType === 'channel'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    Channel (Broadcast)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="e.g. Alaba Electronics Wholesalers"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                  Category
                </label>
                <select
                  value={newCommunityCategory}
                  onChange={(e) => setNewCommunityCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                >
                  <option value="Tech & Hustle">Tech & Hustle</option>
                  <option value="Market & Trade">Market & Trade</option>
                  <option value="Campus & Youth">Campus & Youth</option>
                  <option value="Lifestyle & Faith">Lifestyle & Faith</option>
                  <option value="Music & Creative">Music & Creative</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                  Description
                </label>
                <textarea
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  placeholder="What is this channel or group about?"
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin identity set as <strong>{cleanUsername}</strong> (Phone number hidden by default).</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newCommunityName.trim()) return;
                  setShowCreateModal(false);
                  setNewCommunityName('');
                  setNewCommunityDesc('');
                  alert(`🎉 "${newCommunityName}" created successfully in Town!`);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Publish to Town
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
