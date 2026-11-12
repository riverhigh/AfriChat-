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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreatorProfile, CreatorShowTicket, CreatorSong, CreatorDigitalFile } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

type DropFilter = 'all' | 'ticket' | 'song' | 'call' | 'file';

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

  const [activeFilter, setActiveFilter] = useState<DropFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [activeTicketQr, setActiveTicketQr] = useState<CreatorShowTicket | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedDropType, setSelectedDropType] = useState<'ticket' | 'song' | 'file'>('ticket');

  // New Drop Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('5000');
  const [newVenue, setNewVenue] = useState('Eko Hotel Convention Centre, Lagos');
  const [newDate, setNewDate] = useState('Friday, Dec 25, 2026');

  // Live real-time drops state
  const [liveDrops, setLiveDrops] = useState<CreatorDrop[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      creatorHandle: show.creatorName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      creatorAvatar: show.creatorAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isVerified: true,
      badge: 'Concert Drop',
      timeAgo: 'Just now',
      title: show.title,
      description: show.description,
      price: show.price,
      coverImage: show.coverImage,
      meta: {
        badgeText: show.type === 'online_stream' ? 'Live Stream Ticket' : 'Physical Concert Pass',
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
      creatorHandle: song.artistName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      creatorAvatar: song.artistAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isVerified: true,
      badge: 'Exclusive Track',
      timeAgo: '2 hours ago',
      title: song.title,
      description: `Exclusive single off ${song.album}. High fidelity master with 100% direct artist support.`,
      price: song.price,
      coverImage: song.coverArt,
      meta: {
        badgeText: `${song.genre} · ${song.duration}`,
        subtext: `🎵 ${song.playsCount?.toLocaleString() || 5000}+ Streams · Direct to Phone`,
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
      creatorHandle: c.handle,
      creatorAvatar: c.avatar,
      isVerified: c.isVerified,
      badge: c.badge || 'VIP Call',
      timeAgo: 'Today',
      title: `1-on-1 VIP Video/Voice Call Session with ${c.name}`,
      description: `Book private consultation, music feedback, mentorship or personalized video shoutout directly with ${c.name}.`,
      price: c.vipServices?.bundle3MinVoice || 3500,
      coverImage: c.banner,
      meta: {
        badgeText: '1-on-1 Direct Access',
        subtext: `📞 Verified Private Line · 3 to 15 Mins`,
        actionLabel: `Book VIP Call (from ₦${(c.vipServices?.bundle3MinVoice || 3500).toLocaleString()})`,
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
      creatorHandle: file.creatorName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      creatorAvatar: file.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVerified: true,
      badge: 'Digital Pack',
      timeAgo: file.createdAt || 'Recent',
      title: file.title,
      description: file.description,
      price: file.price,
      coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      meta: {
        badgeText: `${file.category.toUpperCase()} · ${file.fileSize}`,
        subtext: `📁 ${file.downloadsCount} Downloads · Instant Unlock`,
        actionLabel: file.isPurchasedByMe ? 'Download File' : `Unlock & Download (₦${file.price.toLocaleString()})`,
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
      alert('Drop link copied! Share with friends or WhatsApp groups.');
    }
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

  return (
    <div
      onClick={() => setIsCreatorModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#10081d] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-500/25"
      >
        {/* Mobile grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-purple-900/60 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header - AfriChat Signature Purple Gradient */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-950 to-[#10081d] border-b border-purple-500/20 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-600/30 text-purple-300 flex items-center justify-center border border-purple-400/30 shadow-inner">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-display">
                    AfriCreator Hub & Live Drops
                  </h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/70">
                  Exclusive tickets, songs, VIP calls & files from African artists
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDropModal(true)}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95 border border-purple-400/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Drop</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatorModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center mt-3">
            <Search className="w-4 h-4 absolute left-3 text-purple-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Davido, Burna Boy, concert tickets, songs..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/40 rounded-xl text-xs text-white placeholder-purple-300/50 focus:outline-none focus:ring-1 focus:ring-purple-400 border border-white/10"
            />
          </div>

          {/* Clean 1-Row Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
            {[
              { id: 'all', label: '🔥 All Drops', icon: Sparkles },
              { id: 'ticket', label: '🎟️ Tickets', icon: Ticket },
              { id: 'song', label: '🎵 Songs & Leaks', icon: Music },
              { id: 'call', label: '📞 VIP Calls', icon: Phone },
              { id: 'file', label: '📁 Digital Files', icon: Folder },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition-all shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white/10 text-purple-200 hover:bg-white/15'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 z-10">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Release Drop Modal Form */}
        {showDropModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#160d26] rounded-3xl p-5 shadow-2xl space-y-3.5 border border-purple-500/30 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Release Live Creator Drop
                </h4>
                <button
                  type="button"
                  onClick={() => setShowDropModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-purple-950/40 rounded-xl">
                {[
                  { id: 'ticket', label: '🎟️ Ticket' },
                  { id: 'song', label: '🎵 Song' },
                  { id: 'file', label: '📁 File' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedDropType(t.id as any)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      selectedDropType === t.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-purple-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handlePublishDrop} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Drop Title
                  </label>
                  <input
                    type="text"
                    placeholder={
                      selectedDropType === 'ticket'
                        ? 'e.g. Davido Timeless Concert Pass'
                        : selectedDropType === 'song'
                        ? 'e.g. Unreleased Acoustic Mix'
                        : 'e.g. Afrobeats Master Drumkit'
                    }
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Description & Highlights
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell your fans what makes this drop special..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {selectedDropType === 'ticket' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Venue
                      </label>
                      <input
                        type="text"
                        value={newVenue}
                        onChange={(e) => setNewVenue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Date
                      </label>
                      <input
                        type="text"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Price (NGN)
                  </label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 active:scale-95 transition-transform"
                >
                  🚀 Broadcast Live to Feed
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Ticket QR Modal */}
        {activeTicketQr && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-white dark:bg-[#160d26] rounded-3xl p-5 shadow-2xl text-center space-y-3 border border-purple-500/30 text-slate-900 dark:text-white">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  Verified AGC Ticket Pass
                </span>
                <button
                  onClick={() => setActiveTicketQr(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block">
                <QrCode className="w-36 h-36 text-slate-900 mx-auto" />
              </div>

              <div>
                <h4 className="font-bold text-sm leading-tight">{activeTicketQr.title}</h4>
                <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-1">
                  PIN: <strong className="font-mono text-purple-600">{activeTicketQr.ticketPin || 'TICK-AFRI-2026'}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{activeTicketQr.venueOrStreamUrl}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  alert('Ticket saved to your phone passbook!');
                  setActiveTicketQr(null);
                }}
                className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Ticket to Phone
              </button>
            </div>
          </div>
        )}

        {/* Main Unified Creator Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 dark:bg-[#0c0617]">
          {filteredDrops.map((drop) => {
            const Icon = drop.meta.icon;

            return (
              <div
                key={drop.id}
                className="rounded-3xl bg-white dark:bg-[#140b22] border border-slate-200/80 dark:border-purple-900/30 overflow-hidden shadow-xs hover:border-purple-500/40 transition-all space-y-3 group"
              >
                {/* Creator Header Bar */}
                <div className="p-4 pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={drop.creatorAvatar}
                      alt={drop.creatorName}
                      className="w-10 h-10 rounded-2xl object-cover border border-purple-500/20 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {drop.creatorName}
                        </h4>
                        {drop.isVerified && (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-[10px] font-bold">
                            ★
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {drop.creatorHandle} · {drop.timeAgo}
                      </p>
                    </div>
                  </div>

                  {/* Drop Type Tag */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/40 dark:border-purple-800">
                    <Icon className="w-3 h-3" />
                    <span>{drop.badge || drop.meta.badgeText}</span>
                  </span>
                </div>

                {/* Cover Image / Visual Artwork Preview */}
                {drop.coverImage && (
                  <div className="px-4">
                    <div className="relative rounded-2xl overflow-hidden max-h-56 bg-slate-900 border border-black/5 dark:border-white/5">
                      <img
                        src={drop.coverImage}
                        alt={drop.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      {drop.type === 'song' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlayingSongId(playingSongId === drop.id ? null : drop.id);
                            toast(playingSongId === drop.id ? 'Paused preview' : 'Playing 30s preview...');
                          }}
                          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        >
                          {playingSongId === drop.id ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Drop Title & Description */}
                <div className="px-4 space-y-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                    {drop.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {drop.description}
                  </p>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium pt-0.5">
                    {drop.meta.subtext}
                  </div>
                </div>

                {/* Action Row: Price & 1-Tap Purchase / Booking */}
                <div className="p-4 pt-2 border-t border-slate-100 dark:border-purple-900/20 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                      ₦{drop.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold hidden sm:inline">
                      🛡️ AGC Escrow
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Share */}
                    <button
                      type="button"
                      onClick={() => handleShareDrop(drop)}
                      className="p-2 text-slate-400 hover:text-purple-500 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      title="Share Drop"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Chat Artist */}
                    <button
                      type="button"
                      onClick={() => handleChatCreator(drop)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-purple-950/40 hover:bg-slate-200 text-slate-700 dark:text-purple-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      💬 Chat
                    </button>

                    {/* Primary Drop Action */}
                    <button
                      type="button"
                      onClick={() => handleAction(drop)}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all border border-purple-400/30"
                    >
                      {drop.meta.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredDrops.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-purple-400/40" />
              <p className="font-semibold text-slate-500">
                No creator drops found for this filter.
              </p>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="px-3 py-1 text-xs text-purple-600 font-bold hover:underline"
              >
                View all live drops →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
