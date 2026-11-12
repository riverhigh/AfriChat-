import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Ticket,
  Music,
  Lock,
  Heart,
  MessageCircle,
  Play,
  Pause,
  Download,
  Calendar,
  MapPin,
  Plus,
  X,
  CheckCircle2,
  QrCode,
  TrendingUp,
  Users,
  Crown,
  Phone,
  Video,
  FileText,
  Upload,
  Folder,
  Disc,
  Star,
  Share2,
  Search,
  Radio,
  ExternalLink,
  Volume2,
  Home,
  Compass,
  User,
  CreditCard,
  Bookmark,
  Send,
  MoreVertical,
  Bell,
  Coins,
  ChevronRight,
  Filter,
  Check,
  Headphones,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreatorProfile, CreatorShowTicket, CreatorSong, CreatorDigitalFile } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

type DropFilter = 'all' | 'ticket' | 'song' | 'call' | 'file';
type NavTab = 'home' | 'discover' | 'profile' | 'subscriptions';

interface CreatorDrop {
  id: string;
  type: 'ticket' | 'song' | 'call' | 'file';
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  isVerified: boolean;
  badge?: string;
  timeAgo: string;
  title: string;
  description: string;
  price: number;
  coverImage?: string;
  duration?: string;
  likes?: number;
  meta: {
    badgeText: string;
    subtext: string;
    actionLabel: string;
    icon: React.ElementType;
  };
  rawData: any;
}

export const CreatorModal: React.FC = () => {
  const {
    isCreatorModalOpen,
    setIsCreatorModalOpen,
    creators,
    creatorShows,
    creatorSongs,
    creatorFiles,
    buyShowTicket,
    buyCreatorSong,
    buyCreatorFile,
    bookCreatorVipSession,
    createCreatorShow,
    createCreatorSong,
    uploadCreatorFile,
    wallet,
    currentUser,
    startCall,
    setActiveTab,
    setActiveChatId,
    chats,
  } = useApp();

  // Navigation & View State
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [activeFilter, setActiveFilter] = useState<DropFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [activeTicketQr, setActiveTicketQr] = useState<CreatorShowTicket | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedDropType, setSelectedDropType] = useState<'ticket' | 'song' | 'file'>('ticket');

  // Interactive Social State
  const [likes, setLikes] = useState<Record<string, boolean>>({
    drop_show_sh_davido_timeless: true,
    drop_song_s_burna_cityboys: true,
  });
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({
    drop_show_sh_davido_timeless: true,
  });
  const [activeTipDrop, setActiveTipDrop] = useState<CreatorDrop | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(1000);
  const [tipNote, setTipNote] = useState<string>('Keep inspiring Africa! 🚀');

  // Quick Composer State
  const [quickPostText, setQuickPostText] = useState('');

  // Drop Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('5000');
  const [newVenue, setNewVenue] = useState('Eko Hotel Convention Centre, Lagos');
  const [newDate, setNewDate] = useState('Friday, Dec 25, 2026');

  // Profile View Sub-tab
  const [profileSubTab, setProfileSubTab] = useState<'posts' | 'media' | 'vip'>('posts');
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);

  // Live real-time drops state
  const [liveDrops, setLiveDrops] = useState<CreatorDrop[]>([]);

  const toast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 🌐 Supabase Realtime Live Drop Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const dropChannel = supabase.channel('live_creator_drops', { config: { broadcast: { self: false } } });
    dropChannel
      .on('broadcast', { event: 'new_creator_drop' }, ({ payload }: any) => {
        if (!payload?.drop) return;
        setLiveDrops((prev) => [payload.drop, ...prev]);
        toast(`✨ New Drop: ${payload.drop.creatorName} just released "${payload.drop.title}"!`);
      })
      .subscribe();

    return () => {
      dropChannel.unsubscribe();
    };
  }, []);

  if (!isCreatorModalOpen) return null;

  // Build unified feed items from all creator activities
  const allFeedDrops: CreatorDrop[] = [
    ...liveDrops,
    // Tickets
    ...creatorShows.map((show) => ({
      id: `drop_show_${show.id}`,
      type: 'ticket' as const,
      creatorId: show.creatorId,
      creatorName: show.creatorName,
      creatorHandle: `@${show.creatorName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      creatorAvatar: show.creatorAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isVerified: true,
      badge: 'Concert Drop',
      timeAgo: '1h ago',
      title: show.title,
      description: show.description,
      price: show.price,
      coverImage: show.coverImage,
      duration: 'Live Concert',
      likes: 124,
      meta: {
        badgeText: show.type === 'online_stream' ? 'Live Stream Pass' : 'VIP Concert Pass',
        subtext: `📅 ${show.date} · 📍 ${show.venueOrStreamUrl}`,
        actionLabel: show.isPurchasedByMe ? 'View My Ticket QR' : `Get Ticket (₦${show.price.toLocaleString()})`,
        icon: Ticket,
      },
      rawData: show,
    })),
    // Songs & Audio Leaks
    ...creatorSongs.map((song) => ({
      id: `drop_song_${song.id}`,
      type: 'song' as const,
      creatorId: song.artistId,
      creatorName: song.artistName,
      creatorHandle: `@${song.artistName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      creatorAvatar: song.artistAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isVerified: true,
      badge: 'Exclusive Track',
      timeAgo: '3h ago',
      title: song.title,
      description: `Exclusive master single off "${song.album}". Direct fan unlock with 100% artist revenue support.`,
      price: song.price,
      coverImage: song.coverArt,
      duration: song.duration || '3:30',
      likes: 89,
      meta: {
        badgeText: `${song.genre} · ${song.duration}`,
        subtext: `🎵 ${song.playsCount?.toLocaleString() || '12.4k'}+ Streams · Instant Audio Stream`,
        actionLabel: `Buy Song (₦${song.price.toLocaleString()})`,
        icon: Music,
      },
      rawData: song,
    })),
    // VIP Calls
    ...creators.map((c) => ({
      id: `drop_call_${c.id}`,
      type: 'call' as const,
      creatorId: c.id,
      creatorName: c.name,
      creatorHandle: `@${c.handle.replace(/^@/, '')}`,
      creatorAvatar: c.avatar,
      isVerified: c.isVerified,
      badge: c.badge || 'VIP Call',
      timeAgo: '16h ago',
      title: `1-on-1 VIP Video Session with ${c.name}`,
      description: `Book private consultation, creative feedback, mentorship or personalized video shoutout directly with ${c.name}.`,
      price: c.vipServices?.bundle3MinVoice || 3500,
      coverImage: c.banner || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=700&auto=format&fit=crop&q=80',
      duration: '15m Session',
      likes: 56,
      meta: {
        badgeText: '1-on-1 Private Line',
        subtext: `📞 Verified Private Session · Instant Call Connect`,
        actionLabel: `Book VIP Call (₦${(c.vipServices?.bundle3MinVoice || 3500).toLocaleString()})`,
        icon: Phone,
      },
      rawData: c,
    })),
    // Digital Files & Packs
    ...creatorFiles.map((file) => ({
      id: `drop_file_${file.id}`,
      type: 'file' as const,
      creatorId: file.creatorId,
      creatorName: file.creatorName,
      creatorHandle: `@${file.creatorName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      creatorAvatar: file.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVerified: true,
      badge: 'Digital Pack',
      timeAgo: file.createdAt || '1d ago',
      title: file.title,
      description: file.description,
      price: file.price,
      coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=700&auto=format&fit=crop&q=80',
      duration: file.fileSize || '45 MB',
      likes: 42,
      meta: {
        badgeText: `${file.category.toUpperCase()} · ${file.fileSize}`,
        subtext: `📁 ${file.downloadsCount} Downloads · Instant Download`,
        actionLabel: file.isPurchasedByMe ? 'Download File' : `Unlock Pack (₦${file.price.toLocaleString()})`,
        icon: Folder,
      },
      rawData: file,
    })),
  ];

  // Filtering
  const filteredDrops = allFeedDrops.filter((drop) => {
    if (activeFilter !== 'all' && drop.type !== activeFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      drop.title.toLowerCase().includes(q) ||
      drop.creatorName.toLowerCase().includes(q) ||
      drop.description.toLowerCase().includes(q)
    );
  });

  const toggleLike = (dropId: string) => {
    setLikes((prev) => ({
      ...prev,
      [dropId]: !prev[dropId],
    }));
  };

  const toggleBookmark = (dropId: string) => {
    setBookmarks((prev) => {
      const isNow = !prev[dropId];
      toast(isNow ? 'Saved to your collections' : 'Removed from collections');
      return { ...prev, [dropId]: isNow };
    });
  };

  const handleAction = (drop: CreatorDrop) => {
    if (drop.type === 'ticket') {
      const show: CreatorShowTicket = drop.rawData;
      if (show.isPurchasedByMe) {
        setActiveTicketQr(show);
      } else {
        const res = buyShowTicket(show.id);
        if (res.ticket) setActiveTicketQr(res.ticket);
        toast(res.message);
      }
    } else if (drop.type === 'song') {
      const song: CreatorSong = drop.rawData;
      const res = buyCreatorSong(song.id);
      toast(res.message);
    } else if (drop.type === 'call') {
      const creator: CreatorProfile = drop.rawData;
      const price = creator.vipServices?.bundle3MinVoice || 3500;
      const res = bookCreatorVipSession(creator.id, 'voice', 3, price);
      toast(res.message);
      if (res.success) {
        startCall(creator.name, '+2348000000000', creator.avatar, 'voice');
      }
    } else if (drop.type === 'file') {
      const file: CreatorDigitalFile = drop.rawData;
      if (file.isPurchasedByMe) {
        toast(`📥 Downloading "${file.fileName}"...`);
      } else {
        const res = buyCreatorFile(file.id);
        toast(res.message);
      }
    }
  };

  const handleChatCreator = (drop: CreatorDrop) => {
    let target = chats.find(
      (c) =>
        c.name.toLowerCase().includes(drop.creatorName.toLowerCase()) ||
        drop.creatorName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (!target && chats.length > 0) target = chats[0];
    setIsCreatorModalOpen(false);
    setActiveTab('chats');
    if (target) setActiveChatId(target.id);
  };

  const handleShareDrop = (drop: CreatorDrop) => {
    const text = `🔥 ${drop.creatorName} dropped "${drop.title}" on AfriChat (₦${drop.price.toLocaleString()})! Check it out: https://africhat.app/drops/${drop.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast('Drop link copied! Share with friends or groups.');
    }
  };

  const handleSendTip = () => {
    if (!activeTipDrop) return;
    if ((wallet.availableBalance || 0) < tipAmount) {
      toast('Insufficient wallet balance. Top up your AGC Naira wallet.');
      return;
    }
    toast(`🎉 Tipped ₦${tipAmount.toLocaleString()} to ${activeTipDrop.creatorName}!`);
    setActiveTipDrop(null);
  };

  const handlePublishDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    const priceNum = Number(newPrice) || 2000;

    if (selectedDropType === 'ticket') {
      createCreatorShow({
        creatorId: 'cr_self',
        creatorName: currentUser.fullName || 'Verified Artist',
        creatorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        title: newTitle.trim(),
        type: 'offline_concert',
        date: newDate,
        time: '8:00 PM WAT',
        venueOrStreamUrl: newVenue,
        price: priceNum,
        currency: 'NGN',
        availableTickets: 200,
        coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&auto=format&fit=crop&q=80',
        description: newDesc.trim() || 'Verified encrypted AGC Escrow Concert Ticket.',
      });
    } else if (selectedDropType === 'song') {
      createCreatorSong({
        artistId: 'cr_self',
        artistName: currentUser.fullName || 'Verified Artist',
        artistAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        title: newTitle.trim(),
        album: 'AfriChat Exclusive Single',
        genre: 'Afrobeats',
        price: priceNum,
        currency: 'NGN',
        duration: '3:30',
        releaseDate: 'Today',
        coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      });
    } else {
      uploadCreatorFile({
        creatorId: 'cr_self',
        creatorName: currentUser.fullName || 'Verified Artist',
        creatorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        title: newTitle.trim(),
        description: newDesc.trim() || 'Exclusive digital creative asset.',
        category: 'music_audio',
        fileName: `${newTitle.trim().replace(/\s+/g, '_')}.zip`,
        fileSize: '45 MB',
        fileType: 'application/zip',
        price: priceNum,
        currency: 'NGN',
      });
    }

    // Broadcast live to all users via Supabase
    if (isSupabaseConfigured) {
      try {
        const dropCh = supabase.channel('live_creator_drops', { config: { broadcast: { self: false } } });
        dropCh.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            dropCh.send({
              type: 'broadcast',
              event: 'new_creator_drop',
              payload: {
                drop: {
                  id: `live_${Date.now()}`,
                  type: selectedDropType,
                  creatorId: 'cr_self',
                  creatorName: currentUser.fullName || 'Verified Artist',
                  creatorHandle: '@you',
                  creatorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
                  isVerified: true,
                  badge: 'New Release',
                  timeAgo: 'Just now',
                  title: newTitle.trim(),
                  description: newDesc.trim() || 'New exclusive release on AfriCreator Hub.',
                  price: priceNum,
                  coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&auto=format&fit=crop&q=80',
                  meta: {
                    badgeText: selectedDropType.toUpperCase(),
                    subtext: 'Direct to Fan · AGC Escrow Verified',
                    actionLabel: `Get (₦${priceNum.toLocaleString()})`,
                    icon: selectedDropType === 'ticket' ? Ticket : selectedDropType === 'song' ? Music : Folder,
                  },
                  rawData: {},
                },
              },
            });
          }
        });
      } catch (e) {}
    }

    setShowDropModal(false);
    setNewTitle('');
    setNewDesc('');
    toast('🎉 New drop broadcasted live to the African Creator Feed!');
  };

  const handleQuickPostSubmit = () => {
    if (!quickPostText.trim()) return;
    createCreatorSong({
      artistId: 'cr_self',
      artistName: currentUser.fullName || 'You (Creator)',
      artistAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      title: quickPostText.slice(0, 32),
      album: 'Fan Stream Single',
      genre: 'Afrobeats',
      price: 1500,
      currency: 'NGN',
      duration: '3:15',
      releaseDate: 'Today',
      coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    });
    setQuickPostText('');
    toast('🚀 Post published to your creator stream!');
  };

  return (
    <div
      onClick={() => setIsCreatorModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-6 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-full sm:h-[94vh] bg-[#0b0518] rounded-none sm:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-purple-500/20 text-white"
      >
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR NAVIGATION (OnlyFans / Patreon style in Deep African Purple) */}
        {/* ========================================================================= */}
        <aside className="w-full md:w-64 bg-[#120726] border-r border-purple-500/15 flex flex-col justify-between shrink-0">
          <div>
            {/* Top Logo & App Branding */}
            <div className="p-4 md:p-5 flex items-center justify-between border-b border-purple-500/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-black text-sm text-white font-display tracking-tight">
                      AfriCreator
                    </h2>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-[9px] font-bold text-purple-300 border border-purple-400/30">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-300/60 font-medium">
                    OnlyFans-style African Drops
                  </p>
                </div>
              </div>

              {/* Close on Mobile */}
              <button
                type="button"
                onClick={() => setIsCreatorModalOpen(false)}
                className="md:hidden text-purple-300/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              <button
                type="button"
                onClick={() => setNavTab('home')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  navTab === 'home'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-purple-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home Feed</span>
              </button>

              <button
                type="button"
                onClick={() => setNavTab('discover')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  navTab === 'discover'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-purple-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Discover Grid</span>
                <span className="ml-auto px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  LIVE
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNavTab('subscriptions')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  navTab === 'subscriptions'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-purple-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>My Tickets & Passes</span>
              </button>

              <button
                type="button"
                onClick={() => setNavTab('profile')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  navTab === 'profile'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-purple-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Creator Studio</span>
              </button>
            </nav>

            {/* + NEW DROP CTA BUTTON (Inspired by OnlyFans "+ NEW POST") */}
            <div className="p-3">
              <button
                type="button"
                onClick={() => setShowDropModal(true)}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 via-fuchsia-600 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-2xl font-black text-xs shadow-xl shadow-purple-600/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all tracking-wide"
              >
                <Plus className="w-4 h-4" />
                <span>+ NEW DROP / POST</span>
              </button>
            </div>
          </div>

          {/* Bottom User Pill & Wallet */}
          <div className="p-3 border-t border-purple-500/15 bg-purple-950/20">
            <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#180a33] border border-purple-500/20">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.fullName || 'You'}
                className="w-8 h-8 rounded-full object-cover border border-purple-400/40"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.fullName || 'Creator'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  <span>₦{(wallet.availableBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* CENTER CONTENT REGION */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c051a]">
          {/* Header Bar */}
          <header className="px-5 py-3 bg-[#130728] border-b border-purple-500/15 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-white font-display">
                {navTab === 'home' && 'Creator Home Feed'}
                {navTab === 'discover' && 'Discover African Talent'}
                {navTab === 'subscriptions' && 'Unlocked Passes & Tickets'}
                {navTab === 'profile' && 'Creator Profile & Studio'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Escrow Protected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Close Button on Desktop */}
              <button
                type="button"
                onClick={() => setIsCreatorModalOpen(false)}
                className="hidden md:flex text-purple-300/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Toast Notification */}
          {successToast && (
            <div className="mx-4 mt-3 p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/50 animate-in slide-in-from-top-2 z-20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Content Sub-Views */}
          <div className="flex-1 overflow-y-auto">
            {/* ========================================================================= */}
            {/* VIEW A: HOME FEED (Inspired by Image 2 - OnlyFans feed + composer + tip) */}
            {/* ========================================================================= */}
            {navTab === 'home' && (
              <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-5">
                {/* 1. Quick Post Composer (OnlyFans "Compose new post...") */}
                <div className="rounded-3xl bg-[#160a30] border border-purple-500/20 p-4 space-y-3 shadow-xl shadow-purple-950/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt="You"
                      className="w-10 h-10 rounded-full object-cover border border-purple-400/40"
                    />
                    <input
                      type="text"
                      value={quickPostText}
                      onChange={(e) => setQuickPostText(e.target.value)}
                      placeholder="Compose new drop or song teaser for your fans..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-purple-300/40 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-purple-500/15">
                    <div className="flex items-center gap-2 text-purple-300/60">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDropType('song');
                          setShowDropModal(true);
                        }}
                        className="p-1.5 hover:text-purple-300 hover:bg-purple-900/40 rounded-xl transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Music className="w-4 h-4 text-purple-400" />
                        <span>Song</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDropType('ticket');
                          setShowDropModal(true);
                        }}
                        className="p-1.5 hover:text-purple-300 hover:bg-purple-900/40 rounded-xl transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Ticket className="w-4 h-4 text-fuchsia-400" />
                        <span>Ticket</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDropType('file');
                          setShowDropModal(true);
                        }}
                        className="p-1.5 hover:text-purple-300 hover:bg-purple-900/40 rounded-xl transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Folder className="w-4 h-4 text-indigo-400" />
                        <span>Pack</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickPostSubmit}
                      disabled={!quickPostText.trim()}
                      className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                    >
                      Post Drop
                    </button>
                  </div>
                </div>

                {/* 2. Category Filter Pills */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'all', label: '🔥 All Drops' },
                    { id: 'ticket', label: '🎟️ Concert Tickets' },
                    { id: 'song', label: '🎵 Music Leaks' },
                    { id: 'call', label: '📞 VIP Calls' },
                    { id: 'file', label: '📁 Digital Packs' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        activeFilter === f.id
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-[#180a33] text-purple-200/70 hover:bg-purple-900/40 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* 3. Feed Cards */}
                <div className="space-y-5">
                  {filteredDrops.map((drop) => {
                    const isLiked = likes[drop.id] || false;
                    const isBookmarked = bookmarks[drop.id] || false;
                    const Icon = drop.meta.icon;

                    return (
                      <article
                        key={drop.id}
                        className="rounded-3xl bg-[#150a2e] border border-purple-500/20 overflow-hidden shadow-xl shadow-purple-950/40 hover:border-purple-400/30 transition-all"
                      >
                        {/* Creator Header */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={drop.creatorAvatar}
                              alt={drop.creatorName}
                              className="w-11 h-11 rounded-2xl object-cover border border-purple-400/30"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs text-white hover:underline cursor-pointer">
                                  {drop.creatorName}
                                </h4>
                                {drop.isVerified && (
                                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-black flex items-center justify-center text-[8px] font-black">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-purple-300/60">
                                {drop.creatorHandle} · {drop.timeAgo}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-900/40 text-purple-300 border border-purple-500/30">
                            <Icon className="w-3 h-3 text-purple-400" />
                            <span>{drop.badge}</span>
                          </span>
                        </div>

                        {/* Drop Text / Caption */}
                        <div className="px-4 pb-3 space-y-1">
                          <h3 className="font-black text-sm text-white font-display">
                            {drop.title}
                          </h3>
                          <p className="text-xs text-purple-200/80 leading-relaxed">
                            {drop.description}
                          </p>
                        </div>

                        {/* Media Container (16:9 Bold Card Preview) */}
                        {drop.coverImage && (
                          <div className="relative bg-black/60 overflow-hidden max-h-80 group">
                            <img
                              src={drop.coverImage}
                              alt={drop.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            {/* Watermark Pill */}
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-purple-300 border border-white/10">
                              🔒 AGC ESCROW SECURED
                            </div>

                            {/* Play overlay for audio */}
                            {drop.type === 'song' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlayingSongId(playingSongId === drop.id ? null : drop.id);
                                  toast(playingSongId === drop.id ? 'Paused preview' : 'Playing 30s Afrobeats preview...');
                                }}
                                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-2xl shadow-purple-600/60 hover:scale-110 transition-all ring-4 ring-white/20"
                              >
                                {playingSongId === drop.id ? (
                                  <Pause className="w-6 h-6 fill-current" />
                                ) : (
                                  <Play className="w-6 h-6 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Sub-Card Tagged Info */}
                        <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#1b0d38] border border-purple-500/15 flex items-center justify-between">
                          <div className="text-[11px] text-purple-300/80 flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-bold text-sm">
                              ₦{drop.price.toLocaleString()}
                            </span>
                            <span>·</span>
                            <span>{drop.meta.subtext}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAction(drop)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                          >
                            {drop.meta.actionLabel}
                          </button>
                        </div>

                        {/* Interaction Bar (Like, Tip, Comment, Bookmark) */}
                        <div className="p-4 pt-3 flex items-center justify-between border-t border-purple-500/15 mt-3">
                          <div className="flex items-center gap-4">
                            {/* Like Button */}
                            <button
                              type="button"
                              onClick={() => toggleLike(drop.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                                isLiked ? 'text-rose-400' : 'text-purple-300/60 hover:text-white'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                              <span>{(drop.likes || 10) + (isLiked ? 1 : 0)}</span>
                            </button>

                            {/* Chat Creator */}
                            <button
                              type="button"
                              onClick={() => handleChatCreator(drop)}
                              className="flex items-center gap-1.5 text-xs font-bold text-purple-300/60 hover:text-white transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>Chat</span>
                            </button>

                            {/* SEND TIP BUTTON (OnlyFans Inspiration in Purple!) */}
                            <button
                              type="button"
                              onClick={() => setActiveTipDrop(drop)}
                              className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 border border-purple-400/20 transition-all hover:scale-105"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-300" />
                              <span>SEND TIP</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Share */}
                            <button
                              type="button"
                              onClick={() => handleShareDrop(drop)}
                              className="p-2 text-purple-300/60 hover:text-white rounded-xl transition-colors"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* Bookmark */}
                            <button
                              type="button"
                              onClick={() => toggleBookmark(drop.id)}
                              className={`p-2 rounded-xl transition-colors ${
                                isBookmarked ? 'text-purple-400' : 'text-purple-300/60 hover:text-white'
                              }`}
                              title="Bookmark"
                            >
                              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW B: DISCOVER GRID (Inspired by Image 1 - OnlyFans Discover grid)      */}
            {/* ========================================================================= */}
            {navTab === 'discover' && (
              <div className="p-4 sm:p-5 space-y-4">
                {/* Search Bar & Sub-Filters */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Davido, Burna Boy, concert passes, VIP leaks..."
                      className="w-full pl-9 pr-4 py-2 bg-[#160a30] rounded-2xl text-xs text-white placeholder-purple-300/40 border border-purple-500/20 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {['all', 'ticket', 'song', 'call', 'file'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActiveFilter(type as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all capitalize shrink-0 ${
                          activeFilter === type
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#180a33] text-purple-300/70 hover:bg-purple-900/40'
                        }`}
                      >
                        {type === 'all' ? 'All Media' : `${type}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Visual Grid (Image 1 style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrops.map((drop) => {
                    const isLiked = likes[drop.id] || false;
                    const isBookmarked = bookmarks[drop.id] || false;

                    return (
                      <div
                        key={drop.id}
                        onClick={() => handleAction(drop)}
                        className="group relative rounded-3xl overflow-hidden bg-[#160a30] border border-purple-500/20 shadow-xl shadow-purple-950/40 cursor-pointer transition-all hover:scale-[1.02] hover:border-purple-400/40 flex flex-col justify-between aspect-[4/3] sm:aspect-[16/10]"
                      >
                        {/* Background Thumbnail with dark gradient overlay */}
                        <img
                          src={drop.coverImage || drop.creatorAvatar}
                          alt={drop.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                        {/* Top Overlay: Creator avatar + name */}
                        <div className="relative z-10 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                            <img
                              src={drop.creatorAvatar}
                              alt={drop.creatorName}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-[11px] font-bold text-white truncate max-w-[100px]">
                              {drop.creatorName}
                            </span>
                            <span className="text-[10px] text-purple-300/80">· {drop.timeAgo}</span>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-purple-600/80 text-[10px] font-bold text-white uppercase backdrop-blur-md">
                            {drop.type}
                          </span>
                        </div>

                        {/* Center Title Sticker (Inspired by Image 1 bold sticker text) */}
                        <div className="relative z-10 px-3 py-1 text-center">
                          <span className="inline-block px-3 py-1 bg-purple-900/80 backdrop-blur-md rounded-xl text-xs font-black tracking-wider uppercase text-white shadow-lg border border-purple-400/30">
                            {drop.title}
                          </span>
                        </div>

                        {/* Bottom Bar: Duration, Like Counter, Bookmark */}
                        <div className="relative z-10 p-3 flex items-center justify-between text-xs font-bold text-white/90">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md">
                            <Play className="w-3 h-3 fill-current text-purple-400" />
                            <span className="font-mono text-[11px]">{drop.duration || '3:30'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(drop.id);
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md ${
                                isLiked ? 'text-rose-400' : 'text-white/80'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                              <span className="text-[11px]">{(drop.likes || 12) + (isLiked ? 1 : 0)}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(drop.id);
                              }}
                              className={`p-1 rounded-lg bg-black/60 backdrop-blur-md ${
                                isBookmarked ? 'text-purple-400' : 'text-white/80'
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW C: CREATOR PROFILE (Inspired by Image 3 - OnlyFans profile + Spotify)*/}
            {/* ========================================================================= */}
            {navTab === 'profile' && (
              <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
                {/* Profile Card Container */}
                <div className="rounded-3xl bg-[#140a2c] border border-purple-500/20 overflow-hidden shadow-2xl">
                  {/* Banner Image / African Purple Gradient */}
                  <div className="h-32 sm:h-44 bg-gradient-to-r from-purple-900 via-fuchsia-900 to-indigo-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-500/20 to-transparent" />
                  </div>

                  {/* Profile Info Header */}
                  <div className="px-5 pb-5 relative">
                    {/* Avatar circle */}
                    <div className="relative -mt-14 mb-3 inline-block">
                      <div className="w-24 h-24 rounded-full border-4 border-[#140a2c] overflow-hidden bg-purple-900 shadow-xl">
                        <img
                          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={currentUser.fullName || 'Creator'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#140a2c]" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-white font-display">
                            {currentUser.fullName || 'Verified African Creator'}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-300 border border-purple-400/30">
                            ★ VERIFIED
                          </span>
                        </div>
                        <p className="text-xs text-purple-300/70 font-mono mt-0.5">
                          @{currentUser.fullName?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'creator_agc'} · Available
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDropModal(true)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                        >
                          Release New Drop
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(`https://africhat.app/@${currentUser.fullName || 'creator'}`);
                              toast('Profile share link copied!');
                            }
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl transition-colors border border-purple-500/20"
                          title="Share Profile"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-2xl bg-[#1b0d38] border border-purple-500/15 text-center">
                      <div>
                        <div className="font-black text-base text-white">12</div>
                        <div className="text-[10px] text-purple-300/60 uppercase font-bold">Total Drops</div>
                      </div>
                      <div>
                        <div className="font-black text-base text-purple-400">1.8k</div>
                        <div className="text-[10px] text-purple-300/60 uppercase font-bold">Subscribers</div>
                      </div>
                      <div>
                        <div className="font-black text-base text-emerald-400 font-mono">
                          ₦{(wallet.availableBalance || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-purple-300/60 uppercase font-bold">Earnings</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SPOTIFY / AFROBEAT STREAM INTEGRATION WIDGET (Inspired by Image 3 right card!) */}
                <div className="rounded-3xl bg-[#140a2c] border border-purple-500/20 p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-400/30">
                        ♫
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                        Spotify / Afrobeat Streaming
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSpotifyPlaying(!isSpotifyPlaying);
                        toast(isSpotifyPlaying ? 'Spotify stream paused' : 'Streaming Davido - Timeless on Spotify');
                      }}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{isSpotifyPlaying ? 'PAUSE STREAM' : 'SIGN IN WITH SPOTIFY'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-[#1c0e3d] rounded-2xl border border-purple-500/15 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">Featured Afro-Sound Track</div>
                      <div className="text-[11px] text-purple-300/70">Davido ft. Asake — "No Competition"</div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-mono">
                      {isSpotifyPlaying ? 'NOW PLAYING' : 'READY TO STREAM'}
                    </span>
                  </div>
                </div>

                {/* Sub-tabs: Posts / Media / VIP */}
                <div className="flex border-b border-purple-500/20">
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('posts')}
                    className={`pb-3 px-4 text-xs font-bold transition-colors ${
                      profileSubTab === 'posts'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-purple-300/60 hover:text-white'
                    }`}
                  >
                    MY DROPS (12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('media')}
                    className={`pb-3 px-4 text-xs font-bold transition-colors ${
                      profileSubTab === 'media'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-purple-300/60 hover:text-white'
                    }`}
                  >
                    MEDIA ARCHIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('vip')}
                    className={`pb-3 px-4 text-xs font-bold transition-colors ${
                      profileSubTab === 'vip'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-purple-300/60 hover:text-white'
                    }`}
                  >
                    1-ON-1 VIP CALLS
                  </button>
                </div>

                {/* Posts List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allFeedDrops.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleAction(d)}
                      className="p-3.5 rounded-2xl bg-[#150a2e] border border-purple-500/15 hover:border-purple-400/30 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={d.coverImage || d.creatorAvatar}
                          alt={d.title}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-white truncate max-w-[150px]">{d.title}</h4>
                          <span className="text-[10px] text-emerald-400 font-mono">₦{d.price.toLocaleString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW D: SUBSCRIPTIONS & UNLOCKS                                           */}
            {/* ========================================================================= */}
            {navTab === 'subscriptions' && (
              <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
                <div className="text-center py-4">
                  <h3 className="text-lg font-black text-white font-display">My Unlocked Passes & Tickets</h3>
                  <p className="text-xs text-purple-300/70 mt-1">
                    Your active concert tickets, unreleased song licenses and booked VIP calls.
                  </p>
                </div>

                <div className="space-y-3">
                  {creatorShows.filter((s) => s.isPurchasedByMe).map((show) => (
                    <div
                      key={show.id}
                      className="p-4 rounded-3xl bg-[#160a30] border border-emerald-500/30 flex items-center justify-between shadow-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <Ticket className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white">{show.title}</h4>
                          <p className="text-[11px] text-purple-300/80">📅 {show.date} · {show.venueOrStreamUrl}</p>
                          <span className="text-[10px] font-mono text-emerald-400">PIN: {show.ticketPin}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTicketQr(show)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Show QR
                      </button>
                    </div>
                  ))}

                  {creatorShows.filter((s) => s.isPurchasedByMe).length === 0 && (
                    <div className="p-10 rounded-3xl bg-[#140a2c] border border-purple-500/20 text-center space-y-3">
                      <Ticket className="w-10 h-10 mx-auto text-purple-400/40" />
                      <p className="text-xs text-purple-300/70 font-semibold">
                        You have not purchased any live concert tickets yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNavTab('home');
                          setActiveFilter('ticket');
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-500 transition-all"
                      >
                        Browse Concert Passes →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* SEND TIP MODAL (Direct AGC Wallet Tipping in Purple Theme)                 */}
      {/* ========================================================================= */}
      {activeTipDrop && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#170b2f] rounded-3xl p-5 shadow-2xl border border-purple-500/30 text-white space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-300" />
                <h4 className="font-bold text-sm">Send Tip to {activeTipDrop.creatorName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveTipDrop(null)}
                className="text-purple-300/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-purple-200/80">
              Show love to {activeTipDrop.creatorName}. Tips are sent directly from your AGC Naira wallet with zero platform cut!
            </p>

            {/* Quick Tip Amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    tipAmount === amt
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/40'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Note */}
            <div>
              <label className="block text-[11px] font-bold text-purple-300 mb-1">Fan Note</label>
              <input
                type="text"
                value={tipNote}
                onChange={(e) => setTipNote(e.target.value)}
                placeholder="Write a message..."
                className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="text-[11px] text-purple-300/60 flex justify-between">
              <span>Your Wallet Balance:</span>
              <strong className="text-emerald-400 font-mono">₦{(wallet.availableBalance || 0).toLocaleString()}</strong>
            </div>

            <button
              type="button"
              onClick={handleSendTip}
              className="w-full py-3 bg-gradient-to-r from-purple-500 via-fuchsia-600 to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 hover:opacity-95 transition-all"
            >
              Send ₦{tipAmount.toLocaleString()} Tip 🚀
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DROP PUBLISH MODAL FORM                                                   */}
      {/* ========================================================================= */}
      {showDropModal && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#160d2e] rounded-3xl p-5 shadow-2xl space-y-3.5 border border-purple-500/30 text-white max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Release Live Creator Drop
              </h4>
              <button
                type="button"
                onClick={() => setShowDropModal(false)}
                className="text-purple-300/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-purple-950/40 rounded-xl">
              {[
                { id: 'ticket', label: '🎟️ Ticket' },
                { id: 'song', label: '🎵 Song' },
                { id: 'file', label: '📁 Pack' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedDropType(t.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedDropType === t.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePublishDrop} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-purple-300 mb-0.5">
                  Drop Title
                </label>
                <input
                  type="text"
                  placeholder={
                    selectedDropType === 'ticket'
                      ? 'e.g. Davido Timeless Concert Pass'
                      : selectedDropType === 'song'
                      ? 'e.g. Unreleased Afrobeats Single'
                      : 'e.g. Afrobeat Drumkit & Presets'
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs text-white outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-300 mb-0.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell your fans what makes this drop special..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs text-white outline-none focus:border-purple-400"
                />
              </div>

              {selectedDropType === 'ticket' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 mb-0.5">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={newVenue}
                      onChange={(e) => setNewVenue(e.target.value)}
                      className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 mb-0.5">
                      Date
                    </label>
                    <input
                      type="text"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-purple-300 mb-0.5">
                  Price (NGN)
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#120726] border border-purple-500/30 rounded-xl text-xs font-mono text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-500 via-fuchsia-600 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 hover:opacity-95 transition-all"
              >
                🚀 Broadcast Live to AfriCreator Feed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TICKET QR MODAL                                                           */}
      {/* ========================================================================= */}
      {activeTicketQr && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#160d2e] rounded-3xl p-5 shadow-2xl text-center space-y-3 border border-purple-500/30 text-white animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-400">
                Verified AGC Concert Pass
              </span>
              <button
                onClick={() => setActiveTicketQr(null)}
                className="text-purple-300/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block">
              <QrCode className="w-36 h-36 text-slate-900 mx-auto" />
            </div>

            <div>
              <h4 className="font-bold text-sm leading-tight text-white">{activeTicketQr.title}</h4>
              <p className="text-xs text-purple-300 mt-1">
                PIN: <strong className="font-mono text-emerald-400">{activeTicketQr.ticketPin || 'TICK-AFRI-2026'}</strong>
              </p>
              <p className="text-[11px] text-purple-300/70 mt-0.5">{activeTicketQr.venueOrStreamUrl}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                toast('Ticket saved to your phone passbook!');
                setActiveTicketQr(null);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save Ticket to Phone
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
