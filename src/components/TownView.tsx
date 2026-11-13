import React, { useState } from 'react';
import {
  Users,
  Radio,
  Hash,
  ShieldCheck,
  Lock,
  Search,
  Plus,
  Check,
  X,
  Compass,
  KeyRound,
  ArrowRight,
  Headphones,
  Sparkles,
  PawPrint,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TownCommunity } from '../types';

export const TownView: React.FC = () => {
  const {
    townCommunities,
    toggleJoinTownCommunity,
    addTownCommunity,
    openCommunityChat,
    hidePhoneNumberInTown,
    toggleHidePhoneNumberInTown,
    currentUser,
    audioSpaces,
    joinAudioSpace,
    createAudioSpace,
    setIsPetShopModalOpen,
    deleteTownCommunity,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'groups' | 'spaces'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const handleJoinByCode = () => {
    const raw = joinCodeInput.trim();
    if (!raw) return;
    const cleanCode = raw.toUpperCase().replace(/^.*\//, '');

    // Check Audio Spaces
    const spaceMatch = audioSpaces.find(
      (s) => s.id.toUpperCase().includes(cleanCode) || s.title.toUpperCase().includes(cleanCode)
    );
    if (spaceMatch) {
      joinAudioSpace(spaceMatch);
      setShowJoinCodeModal(false);
      setJoinCodeInput('');
      return;
    }

    // Check Town Communities
    const commMatch = townCommunities.find(
      (c) => c.id.toUpperCase().includes(cleanCode) || c.name.toUpperCase().includes(cleanCode)
    );
    if (commMatch) {
      if (!commMatch.isJoined) toggleJoinTownCommunity(commMatch.id);
      openCommunityChat(commMatch);
      setShowJoinCodeModal(false);
      setJoinCodeInput('');
      return;
    }

    // Dynamically join community with this code
    const isChan = cleanCode.startsWith('C');
    addTownCommunity(
      `Group ${cleanCode}`,
      isChan ? 'channel' : 'group',
      'Tech & Hustle',
      `Joined with unique invite code ${cleanCode}`
    );
    setShowJoinCodeModal(false);
    setJoinCodeInput('');
  };

  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityType, setNewCommunityType] = useState<'group' | 'channel' | 'space'>('group');
  const [newCommunityCategory, setNewCommunityCategory] = useState<TownCommunity['category']>('Tech & Hustle');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  const categories = [
    'All',
    'Tech & Hustle',
    'Market & Trade',
    'Campus & Youth',
    'Lifestyle & Faith',
    'Music & Creative',
    'Pets & Animals',
  ];

  const cleanUsername = currentUser.username
    ? `@${currentUser.username}`
    : currentUser.fullName && currentUser.fullName !== 'Chioma Adebayo' && currentUser.fullName !== 'AGC User'
    ? `@${currentUser.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : currentUser.phoneNumber
    ? `@user_${currentUser.phoneNumber.slice(-4)}`
    : '@afri_citizen';

  const liveSpaces = audioSpaces.filter((s) => s.isLive);

  const filteredCommunities = townCommunities.filter((item) => {
    // 1. Strict filter: purge any test, mock, dummy, or sample entities
    const lowerName = item.name.toLowerCase();
    const lowerDesc = (item.description || '').toLowerCase();
    const lowerId = item.id.toLowerCase();
    if (
      lowerName.includes('test') ||
      lowerName.includes('mock') ||
      lowerName.includes('dummy') ||
      lowerName.includes('sample') ||
      lowerDesc.includes('test group') ||
      lowerDesc.includes('mock account') ||
      lowerId.startsWith('test_') ||
      lowerId.startsWith('__test')
    ) {
      return false;
    }

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

  return (
    <div className="flex flex-col pb-24 text-slate-900 dark:text-white bg-[#f8f7fc] dark:bg-[#070312] min-h-[calc(100vh-130px)]">
      
      {/* ── Top Header & Navigation Bar ──────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-3 bg-white/95 dark:bg-[#0d071c]/95 backdrop-blur-md border-b border-purple-100 dark:border-purple-900/30 sticky top-0 z-20 shadow-xs space-y-3">
        
        {/* Title Row + Privacy Indicator + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                Town Square
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-300 font-bold tracking-wide">
                Public Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 truncate">
              African channels, groups & live spaces
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Always-Masked Phone Privacy Badge */}
            <div
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/80 shadow-2xs select-none"
              title="Phone numbers are strictly masked and protected across Town groups, spaces and channels"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-mono font-bold max-w-[85px] truncate">{cleanUsername}</span>
              <span className="text-[9px] font-bold bg-purple-600/15 px-1 py-0.2 rounded text-purple-700 dark:text-purple-300">
                Private
              </span>
            </div>

            {/* Join Code Button */}
            <button
              type="button"
              onClick={() => setShowJoinCodeModal(true)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              title="Join by invite code"
            >
              <KeyRound className="w-4 h-4 text-purple-500" />
            </button>

            {/* Create Button */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-purple-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Clean Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-purple-400/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, groups, live spaces..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 dark:bg-[#140b2a] rounded-xl border border-slate-200 dark:border-purple-900/40 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-300/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-[#140b2a] rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-purple-900/30">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`py-1.5 rounded-lg transition-all text-center ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-purple-300/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Town
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('spaces')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeFilter === 'spaces'
                ? 'bg-white dark:bg-purple-600 text-rose-600 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-purple-300/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Spaces</span>
            {liveSpaces.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('channels')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeFilter === 'channels'
                ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-purple-300/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Channels</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('groups')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeFilter === 'groups'
                ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-purple-300/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Groups</span>
          </button>
        </div>

        {/* Secondary Category Filters */}
        {activeFilter !== 'spaces' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-purple-200/70 hover:bg-slate-200 dark:hover:bg-purple-900/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">

        {/* 1. Live Spaces Section */}
        {(activeFilter === 'all' || activeFilter === 'spaces') && liveSpaces.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Live Audio Spaces
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                {liveSpaces.length} Active Now
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {liveSpaces.map((space) => (
                <div
                  key={space.id}
                  onClick={() => joinAudioSpace(space)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#120924] border border-purple-100 dark:border-purple-900/40 hover:border-purple-500/60 transition-all cursor-pointer shadow-xs hover:shadow-md group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={space.hostAvatar}
                        alt={space.hostName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/60 shadow-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ring-2 ring-white dark:ring-[#120924]">
                        🎙️
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-300">
                          {space.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate mt-0.5">
                        {space.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-purple-300/60 truncate flex items-center gap-1.5">
                        <span>Host:</span>
                        <strong className="text-slate-800 dark:text-white font-semibold">{space.hostName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); joinAudioSpace(space); }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Tune In</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-purple-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{space.listenersCount} listeners</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Spaces Filter */}
        {activeFilter === 'spaces' && liveSpaces.length === 0 && (
          <div className="py-12 px-4 text-center bg-white dark:bg-[#120924] rounded-3xl border border-dashed border-purple-300/60 dark:border-purple-800/40">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white font-display">
              No live audio spaces right now
            </h4>
            <p className="text-xs text-slate-400 dark:text-purple-300/60 mt-1 max-w-xs mx-auto">
              Start your own Live Space and broadcast to listeners across Africa in real time!
            </p>
            <button
              type="button"
              onClick={() => {
                setNewCommunityType('space');
                setShowCreateModal(true);
              }}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-purple-600/20 inline-flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Start Live Space</span>
            </button>
          </div>
        )}

        {/* 2. Channels & Discussion Groups Directory */}
        {activeFilter !== 'spaces' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-purple-300/60 px-1">
              <span className="font-bold uppercase tracking-wider font-mono text-[11px]">
                {activeFilter === 'channels'
                  ? 'Broadcast Channels'
                  : activeFilter === 'groups'
                  ? 'Discussion Groups'
                  : 'Town Directory'}
              </span>
              <span className="font-mono text-[11px] font-semibold">{filteredCommunities.length} communities</span>
            </div>

            {/* African Pets Hub Spotlight Banner */}
            {(selectedCategory === 'All' || selectedCategory === 'Pets & Animals') && (
              <div
                onClick={() => setIsPetShopModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/15 border border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/60 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <PawPrint className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        African Pets Forum & Pet Shop
                      </h4>
                      <span className="text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-mono uppercase">
                        New
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-purple-300/70 truncate mt-0.5">
                      Buy & sell purebred Boerboels, cats, birds, aquarium & join pet discussions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPetShopModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shrink-0 transition-transform active:scale-95 shadow-sm inline-flex items-center gap-1"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {filteredCommunities.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white dark:bg-[#120924] rounded-3xl border border-dashed border-purple-300/60 dark:border-purple-800/40">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white font-display">
                  {searchQuery || selectedCategory !== 'All' ? 'No matching communities' : 'No town communities yet'}
                </h4>
                <p className="text-xs text-slate-400 dark:text-purple-300/60 mt-1 max-w-xs mx-auto">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your filters or search keywords.'
                    : 'Be the first to launch an African trade group, tech channel, or town square space.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-purple-600/20 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Community</span>
                </button>
              </div>
            ) : (
              filteredCommunities.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); openCommunityChat(item); }}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#120924] border border-purple-100 dark:border-purple-900/30 hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-purple-900/50 shadow-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          {item.isVerified && (
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-purple-300/70">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                              item.type === 'channel'
                                ? 'bg-purple-600/15 text-purple-700 dark:text-purple-300'
                                : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-white">
                            {item.membersCount} {item.membersCount === 1 ? 'member' : 'members'}
                          </span>
                          <span>•</span>
                          <span className="truncate">{item.category}</span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-purple-200/70 mt-1 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleJoinTownCommunity(item.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 border ${
                          item.isJoined
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-white dark:bg-white/5 text-slate-700 dark:text-white border-slate-200 dark:border-white/10 hover:border-purple-500'
                        }`}
                      >
                        {item.isJoined ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Joined</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Join</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCommunityChat(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                        title="Open group discussion"
                      >
                        <span>Chat</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {(item.adminName === currentUser.fullName || item.adminName === 'You' || item.creatorId === currentUser.id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Permanently delete "${item.name}"? This will remove this ${item.type} for all members.`)) {
                              deleteTownCommunity(item.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 transition-colors"
                          title={`Delete ${item.type} (Creator)`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Create Community / Space ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120924] rounded-3xl p-5 w-full max-w-sm border border-purple-100 dark:border-purple-900/60 shadow-2xl animate-in zoom-in-95 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold font-display">
                Create Town Community
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-3 leading-relaxed">
              Start a public broadcast channel, discussion group, or street radio space. Your phone number is masked under your username.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-300 block mb-1">
                  Community Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewCommunityType('group')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                      newCommunityType === 'group'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'border-slate-200 dark:border-purple-900/40 text-slate-600 dark:text-purple-300/70'
                    }`}
                  >
                    Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCommunityType('channel')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                      newCommunityType === 'channel'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'border-slate-200 dark:border-purple-900/40 text-slate-600 dark:text-purple-300/70'
                    }`}
                  >
                    Channel
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCommunityType('space')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                      newCommunityType === 'space'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 dark:border-purple-900/40 text-slate-600 dark:text-purple-300/70'
                    }`}
                  >
                    Live Space 🎙️
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-300 block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="e.g. Lagos Tech Innovators"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-[#1a0e33] rounded-xl border border-slate-200 dark:border-purple-900/50 focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-300 block mb-1">
                  Category
                </label>
                <select
                  value={newCommunityCategory}
                  onChange={(e) => setNewCommunityCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-[#1a0e33] rounded-xl border border-slate-200 dark:border-purple-900/50 focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                >
                  <option value="Tech & Hustle">Tech & Hustle</option>
                  <option value="Market & Trade">Market & Trade</option>
                  <option value="Campus & Youth">Campus & Youth</option>
                  <option value="Lifestyle & Faith">Lifestyle & Faith</option>
                  <option value="Music & Creative">Music & Creative</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-300 block mb-1">
                  Description
                </label>
                <textarea
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  placeholder="What is this channel or group about?"
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-[#1a0e33] rounded-xl border border-slate-200 dark:border-purple-900/50 focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin identity set as <strong>{cleanUsername}</strong> (Phone hidden).</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newCommunityName.trim()) return;
                  if (newCommunityType === 'space') {
                    createAudioSpace(newCommunityName, newCommunityDesc, newCommunityCategory as any);
                  } else {
                    addTownCommunity(newCommunityName, newCommunityType, newCommunityCategory, newCommunityDesc);
                  }
                  setShowCreateModal(false);
                  setNewCommunityName('');
                  setNewCommunityDesc('');
                }}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 ${
                  newCommunityType === 'space'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                }`}
              >
                {newCommunityType === 'space' ? 'Go Live Now 🎙️' : 'Publish Community'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Join with Code ─────────────────────────────────────────── */}
      {showJoinCodeModal && (
        <div
          onClick={() => setShowJoinCodeModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#120924] rounded-3xl p-5 border border-purple-100 dark:border-purple-900/60 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Join by Invite Code</h3>
                  <p className="text-[10px] text-slate-500 dark:text-purple-300/60">Enter code or paste invite link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinCodeModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                placeholder="e.g. G9X7A2 or paste link..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a0e33] border border-slate-200 dark:border-purple-900/50 text-xs text-slate-900 dark:text-white font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <p className="text-[10px] text-slate-400 dark:text-purple-300/50">
                Join any private or public group, channel, or street radio live space.
              </p>
            </div>

            <button
              type="button"
              disabled={!joinCodeInput.trim()}
              onClick={handleJoinByCode}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Join Room Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
