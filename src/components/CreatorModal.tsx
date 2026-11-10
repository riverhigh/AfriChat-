import React, { useState } from 'react';
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
  Sliders,
  Disc,
  Star,
  ArrowRight,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreatorProfile, CreatorShowTicket, CreatorSong } from '../types';

// ─── Tab type ────────────────────────────────────────────────────────────────
type CreatorTab = 'feed' | 'files' | 'vip_sessions' | 'shows' | 'music' | 'studio';

const TAB_CONFIG: { id: CreatorTab; label: string; icon: React.ElementType }[] = [
  { id: 'feed',         label: 'VIP Feed',   icon: Lock },
  { id: 'files',        label: 'Files',      icon: Folder },
  { id: 'vip_sessions', label: 'VIP Calls',  icon: Phone },
  { id: 'shows',        label: 'Tickets',    icon: Ticket },
  { id: 'music',        label: 'Music',      icon: Music },
  { id: 'studio',       label: 'Studio',     icon: TrendingUp },
];

export const CreatorModal: React.FC = () => {
  const {
    isCreatorModalOpen,
    setIsCreatorModalOpen,
    creators,
    creatorPosts,
    creatorShows,
    creatorSongs,
    subscribeToCreator,
    toggleFollowCreator,
    buyShowTicket,
    buyCreatorSong,
    createCreatorPost,
    createCreatorShow,
    createCreatorSong,
    formatPrice,
    currentUser,
    upgradeVerificationBadge,
    creatorFiles,
    buyCreatorFile,
    uploadCreatorFile,
    bookCreatorVipSession,
    updateCreatorVipRates,
    wallet,
  } = useApp();

  const [activeTab, setActiveTab] = useState<CreatorTab>('feed');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [playingLeakPostId, setPlayingLeakPostId] = useState<string | null>(null);
  const [activeTicketQrModal, setActiveTicketQrModal] = useState<CreatorShowTicket | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // VIP Session Booking
  const [bookingVipCreator, setBookingVipCreator] = useState<CreatorProfile | null>(null);
  const [vipSessionType, setVipSessionType] = useState<'voice' | 'video' | 'chat'>('voice');
  const [vipDurationMinutes, setVipDurationMinutes] = useState<number>(3);
  const [vipBookingProcessing, setVipBookingProcessing] = useState(false);

  // File Category Filter
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>('all');

  // Studio Forms
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostIsLocked, setNewPostIsLocked] = useState(true);
  const [newPostMediaType, setNewPostMediaType] = useState<'text' | 'image' | 'audio_leak'>('audio_leak');

  const [showNewShowForm, setShowNewShowForm] = useState(false);
  const [newShowTitle, setNewShowTitle] = useState('');
  const [newShowType, setNewShowType] = useState<'online_stream' | 'offline_concert'>('offline_concert');
  const [newShowDate, setNewShowDate] = useState('Saturday, Dec 26, 2026');
  const [newShowTime, setNewShowTime] = useState('7:00 PM WAT');
  const [newShowVenue, setNewShowVenue] = useState('Eko Hotel Convention Centre, Lagos');
  const [newShowPrice, setNewShowPrice] = useState(15000);

  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongAlbum, setNewSongAlbum] = useState('Single Drop');
  const [newSongGenre, setNewSongGenre] = useState('Afrobeats');
  const [newSongPrice, setNewSongPrice] = useState(500);

  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileCategory, setNewFileCategory] = useState<'ebook' | 'music_audio' | 'preset_lut' | 'video' | 'design_art' | 'code_software'>('ebook');
  const [newFileDesc, setNewFileDesc] = useState('');
  const [newFilePrice, setNewFilePrice] = useState('2000');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState('');

  const [showRateSettings, setShowRateSettings] = useState(false);
  const [rateVoicePerMin, setRateVoicePerMin] = useState('1500');
  const [rateVideoPerMin, setRateVideoPerMin] = useState('3000');
  const [rate3MinVoice, setRate3MinVoice] = useState('3500');
  const [rate5MinVoice, setRate5MinVoice] = useState('5500');
  const [rate3MinVideo, setRate3MinVideo] = useState('7500');
  const [rate5MinVideo, setRate5MinVideo] = useState('12000');
  const [rateVipChat, setRateVipChat] = useState('4000');

  if (!isCreatorModalOpen) return null;

  const toast = (msg: string) => { setSuccessToast(msg); setTimeout(() => setSuccessToast(null), 4000); };

  const handleSubscribe = (creator: CreatorProfile) => toast(subscribeToCreator(creator.id).message);
  const handleBuyTicket = (show: CreatorShowTicket) => {
    const res = buyShowTicket(show.id);
    if (res.ticket) setActiveTicketQrModal(res.ticket);
    toast(res.message);
  };
  const handleBuySong = (song: CreatorSong) => toast(buyCreatorSong(song.id).message);

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createCreatorPost(newPostContent, newPostIsLocked, newPostMediaType);
    setNewPostContent('');
    setShowNewPostForm(false);
    toast('🌟 Exclusive Creator Post published!');
  };

  const handleCreateShow = () => {
    if (!newShowTitle.trim()) return;
    createCreatorShow({
      creatorId: 'cr_self',
      creatorName: currentUser.fullName || 'You',
      creatorAvatar: currentUser.avatarUrl || '',
      title: newShowTitle,
      type: newShowType,
      date: newShowDate,
      time: newShowTime,
      venueOrStreamUrl: newShowVenue,
      price: Number(newShowPrice) || 5000,
      currency: 'NGN',
      availableTickets: 150,
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      description: '100% revenue credited to creator AGC Wallet.',
    });
    setNewShowTitle('');
    setShowNewShowForm(false);
    toast('🎟️ Show & tickets listed on AfriCreator Hub!');
  };

  const handleCreateSong = () => {
    if (!newSongTitle.trim()) return;
    createCreatorSong({
      artistId: 'cr_self',
      artistName: currentUser.fullName || 'You',
      artistAvatar: currentUser.avatarUrl || '',
      title: newSongTitle,
      album: newSongAlbum,
      genre: newSongGenre,
      price: Number(newSongPrice) || 500,
      currency: 'NGN',
      duration: '3:15',
      coverArt: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=300&auto=format&fit=crop&q=80',
      releaseDate: 'Today',
    });
    setNewSongTitle('');
    setShowNewSongForm(false);
    toast('🎵 Song dropped for direct fan purchase!');
  };

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    setUploadedFileType(file.type || 'application/octet-stream');
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setUploadedFileDataUrl(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleCreateDigitalFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim() || !uploadedFileName) { alert('Enter a title and select a file.'); return; }
    uploadCreatorFile({
      creatorId: 'cr_self',
      creatorName: currentUser.fullName || 'You',
      creatorAvatar: currentUser.avatarUrl || '',
      title: newFileTitle.trim(),
      description: newFileDesc.trim() || 'Exclusive creator digital asset.',
      category: newFileCategory,
      fileName: uploadedFileName,
      fileSize: uploadedFileSize || '10 MB',
      fileType: uploadedFileType || 'application/octet-stream',
      fileDataUrl: uploadedFileDataUrl,
      price: Number(newFilePrice) || 2000,
      currency: 'NGN',
    });
    setNewFileTitle(''); setNewFileDesc(''); setUploadedFileName(''); setShowNewFileForm(false);
    toast(`📁 "${newFileTitle}" listed for sale!`);
  };

  const handleSaveVipRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreatorVipRates('cr_self', {
      voicePerMinute: Number(rateVoicePerMin) || 1500,
      videoPerMinute: Number(rateVideoPerMin) || 3000,
      bundle3MinVoice: Number(rate3MinVoice) || 3500,
      bundle5MinVoice: Number(rate5MinVoice) || 5500,
      bundle3MinVideo: Number(rate3MinVideo) || 7500,
      bundle5MinVideo: Number(rate5MinVideo) || 12000,
      vipDirectChat24h: Number(rateVipChat) || 4000,
    });
    setShowRateSettings(false);
    toast('✅ VIP Session rates updated!');
  };

  const calculateVipPrice = (creator: CreatorProfile, type: 'voice' | 'video' | 'chat', mins: number) => {
    const vip = creator.vipServices || { voicePerMinute: 1500, videoPerMinute: 3000, bundle3MinVoice: 3500, bundle5MinVoice: 5500, bundle3MinVideo: 7500, bundle5MinVideo: 12000, vipDirectChat24h: 4000 };
    if (type === 'chat') return vip.vipDirectChat24h;
    if (type === 'voice') return mins === 3 ? vip.bundle3MinVoice : mins === 5 ? vip.bundle5MinVoice : vip.voicePerMinute * mins;
    return mins === 3 ? vip.bundle3MinVideo : mins === 5 ? vip.bundle5MinVideo : vip.videoPerMinute * mins;
  };

  const handleConfirmVipBooking = () => {
    if (!bookingVipCreator) return;
    setVipBookingProcessing(true);
    setTimeout(() => {
      setVipBookingProcessing(false);
      const res = bookCreatorVipSession(bookingVipCreator.id, vipSessionType, vipDurationMinutes, calculateVipPrice(bookingVipCreator, vipSessionType, vipDurationMinutes));
      setBookingVipCreator(null);
      if (res.success) setIsCreatorModalOpen(false);
      else alert(res.message);
    }, 600);
  };

  const filteredPosts = creatorPosts.filter((p) => selectedCreatorId === 'all' || p.creatorId === selectedCreatorId);

  // ─── Shared styles ──────────────────────────────────────────────────────────
  const card = 'rounded-2xl border border-white/8 bg-white/4 p-4 space-y-3';
  const inputCls = 'w-full px-3 py-2.5 text-sm bg-white/6 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all';
  const btnPrimary = 'flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-purple-900/50 transition-all';
  const btnOutline = 'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/15 hover:border-purple-500/60 hover:bg-purple-500/8 text-white/70 hover:text-white font-semibold text-sm transition-all';
  const label = 'text-[11px] font-bold uppercase tracking-widest text-white/40 block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
      {/* ── Sheet / Modal ────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md bg-[#060608] rounded-t-3xl sm:rounded-3xl border border-white/8 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-none">AfriCreator Hub</h2>
                <p className="text-[11px] text-white/35 mt-0.5">VIP Calls · Files · Music · Shows</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatorModalOpen(false)}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast */}
          {successToast && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span>{successToast}</span>
            </div>
          )}
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-0.5 px-3 py-2 border-b border-white/6 overflow-x-auto no-scrollbar">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/60'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 text-white">

          {/* ════════════════════════════════════════════════════════════════
              TAB 1 · VIP FEED
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'feed' && (
            <div className="space-y-5">
              {/* Creator filter chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(['all', ...creators.map((c) => c.id)] as string[]).map((id) => {
                  const creator = id === 'all' ? null : creators.find((c) => c.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedCreatorId(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                        selectedCreatorId === id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/8'
                      }`}
                    >
                      {creator ? (
                        <>
                          <img src={creator.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                          <span>{creator.name.split(' ')[0]}</span>
                          {creator.isSubscribedByMe && <span className="text-[9px] opacity-70">VIP</span>}
                        </>
                      ) : (
                        <span>All Creators</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Creator spotlight */}
              {selectedCreatorId !== 'all' && (() => {
                const creator = creators.find((c) => c.id === selectedCreatorId);
                if (!creator) return null;
                return (
                  <div className={card}>
                    <div className="flex items-center gap-3">
                      <img src={creator.avatar} alt={creator.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">{creator.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">{creator.badge}</span>
                        </div>
                        <span className="text-[11px] text-white/40 font-mono">{creator.handle} · {creator.subscribersCount.toLocaleString()} fans</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/55 leading-relaxed">{creator.bio}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { const r = toggleFollowCreator(creator.id); toast(r.isFollowed ? `✓ Following ${creator.name}` : `Unfollowed`); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${creator.isFollowedByMe ? 'border-white/20 text-white/60' : 'border-white/15 text-white/70 hover:border-purple-500/50 hover:text-purple-300'}`}
                      >
                        {creator.isFollowedByMe ? '✓ Following' : '+ Follow'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubscribe(creator)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${creator.isSubscribedByMe ? 'bg-white/8 text-white/60 border border-white/10' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/50'}`}
                      >
                        {creator.isSubscribedByMe ? '✓ VIP Subscriber' : `Subscribe ${formatPrice(creator.monthlySubPrice, creator.currency)}/mo`}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Posts */}
              <div className="space-y-3">
                {filteredPosts.length === 0 && (
                  <div className="py-16 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-sm font-semibold text-white/40">No creator posts yet</p>
                    <p className="text-xs text-white/25 max-w-xs">Follow & subscribe to creators to see their exclusive VIP drops here</p>
                  </div>
                )}
                {filteredPosts.map((post) => {
                  const creator = creators.find((c) => c.id === post.creatorId);
                  const isUnlocked = !post.isLocked || creator?.isSubscribedByMe;
                  return (
                    <div key={post.id} className={card}>
                      {/* Author row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img src={post.creatorAvatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-500/30" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{post.creatorName}</span>
                              {post.isLocked && (
                                <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-bold border border-purple-500/20">
                                  <Lock className="w-2.5 h-2.5" />VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/35 font-mono">{post.creatorHandle} · {post.createdAt}</span>
                          </div>
                        </div>
                        {creator && !creator.isSubscribedByMe && post.isLocked && (
                          <button type="button" onClick={() => handleSubscribe(creator)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold">Unlock</button>
                        )}
                      </div>

                      {/* Content */}
                      {isUnlocked ? (
                        <div className="space-y-2.5">
                          <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                          {post.mediaType === 'audio_leak' && (
                            <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setPlayingLeakPostId(playingLeakPostId === post.id ? null : post.id)}
                                className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95"
                              >
                                {playingLeakPostId === post.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-white/80 block">Studio Audio Leak · {post.audioDurationSec}s</span>
                                <div className="flex items-end gap-0.5 mt-1.5 h-5">
                                  {Array.from({ length: 28 }).map((_, i) => (
                                    <div key={i} className={`flex-1 rounded-sm ${playingLeakPostId === post.id ? 'bg-purple-500 animate-pulse' : 'bg-white/15'}`} style={{ height: `${(i % 5) * 20 + 20}%` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-5 rounded-xl border border-white/8 bg-white/3 text-center space-y-2.5">
                          <div className="w-10 h-10 rounded-full bg-purple-600/10 mx-auto flex items-center justify-center border border-purple-500/20">
                            <Lock className="w-4.5 h-4.5 text-purple-400" />
                          </div>
                          <p className="text-xs text-white/50">Subscribers-only content</p>
                          {creator && (
                            <button type="button" onClick={() => handleSubscribe(creator)} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                              Subscribe {formatPrice(creator.monthlySubPrice, creator.currency)}/mo
                            </button>
                          )}
                        </div>
                      )}

                      {/* Post actions */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/6 text-[11px] text-white/35">
                        <button type="button" className="flex items-center gap-1.5 hover:text-rose-400 transition-colors">
                          <Heart className="w-3.5 h-3.5" /><span>{post.likesCount}</span>
                        </button>
                        <button type="button" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" /><span>{post.commentsCount}</span>
                        </button>
                        <button type="button" onClick={() => creator && toast(`💖 Sent ₦1,000 Tip to ${creator.name}!`)} className="font-bold text-amber-500/70 hover:text-amber-400 transition-colors">
                          Tip Artist
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 2 · FILE SHOP
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'files' && (
            <div className="space-y-5">
              {/* Category filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {['all', 'ebook', 'music_audio', 'preset_lut', 'video', 'design_art', 'code_software'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFileCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${fileCategoryFilter === cat ? 'bg-purple-600 text-white' : 'bg-white/6 text-white/40 border border-white/8 hover:bg-white/10 hover:text-white/70'}`}
                  >
                    {cat === 'all' ? 'All' : cat === 'ebook' ? 'Ebooks' : cat === 'music_audio' ? 'Beats' : cat === 'preset_lut' ? 'Presets' : cat === 'video' ? 'Video' : cat === 'design_art' ? 'Art' : 'Code'}
                  </button>
                ))}
              </div>

              {/* File list */}
              {creatorFiles.filter((f) => fileCategoryFilter === 'all' || f.category === fileCategoryFilter).length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <Folder className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">No files listed yet</p>
                  <p className="text-xs text-white/25">Creators can sell any file directly — ebooks, beats, presets, videos & more</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creatorFiles.filter((f) => fileCategoryFilter === 'all' || f.category === fileCategoryFilter).map((file) => (
                    <div key={file.id} className={card}>
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                          {file.category === 'ebook' ? <FileText className="w-5 h-5 text-purple-400" /> : file.category === 'music_audio' ? <Music className="w-5 h-5 text-purple-400" /> : file.category === 'video' ? <Video className="w-5 h-5 text-purple-400" /> : <Folder className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white line-clamp-1">{file.title}</h4>
                          <p className="text-[10px] text-white/35 mt-0.5">{file.creatorName} · {file.fileSize} · {file.category.toUpperCase()}</p>
                          <p className="text-xs text-white/50 mt-1 line-clamp-2">{file.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black font-mono text-purple-400 block">₦{file.price.toLocaleString()}</span>
                          <span className="text-[9px] text-white/30">{file.downloadsCount} sold</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/6 flex items-center justify-between">
                        <span className="text-[10px] text-white/25 font-mono truncate">{file.fileName}</span>
                        {file.isPurchasedByMe ? (
                          <button type="button" onClick={() => alert(`Downloaded "${file.fileName}"`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white/70 text-xs font-bold transition-all">
                            <Download className="w-3.5 h-3.5" />Download
                          </button>
                        ) : (
                          <button type="button" onClick={() => { const r = buyCreatorFile(file.id); if (r.success) toast(r.message); else alert(r.message); }} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all">
                            Buy ₦{file.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 3 · VIP CALLS
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'vip_sessions' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-white/4 border border-white/8">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Zap className="w-4 h-4" />
                  <span>Book a 1-on-1 session with any creator</span>
                </div>
                <p className="text-[11px] text-white/35 mt-1">Voice, video or VIP chat per minute. Creator sets the rates.</p>
              </div>

              {creators.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">No creators available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creators.map((creator) => {
                    const vip = creator.vipServices || { voicePerMinute: 1500, videoPerMinute: 3000, bundle3MinVoice: 3500, bundle5MinVoice: 5500, bundle3MinVideo: 7500, bundle5MinVideo: 12000, vipDirectChat24h: 4000 };
                    return (
                      <div key={creator.id} className={card}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={creator.avatar} alt={creator.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500/30" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-white">{creator.name}</span>
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded-full">{creator.badge}</span>
                              </div>
                              <span className="text-[11px] text-white/35 font-mono">{creator.category}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => setBookingVipCreator(creator)} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all">
                            Book
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/6">
                          {[
                            { label: 'Voice', value: `₦${vip.voicePerMinute.toLocaleString()}/min` },
                            { label: 'Video', value: `₦${vip.videoPerMinute.toLocaleString()}/min` },
                            { label: '3-Min Bundle', value: `₦${vip.bundle3MinVoice.toLocaleString()}` },
                          ].map((item) => (
                            <div key={item.label} className="text-center">
                              <span className="text-[9px] text-white/30 block">{item.label}</span>
                              <span className="text-[11px] font-bold text-purple-300">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIP Booking Modal */}
              {bookingVipCreator && (
                <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur flex items-end sm:items-center justify-center p-4">
                  <div className="w-full max-w-sm bg-[#0a0a0f] rounded-3xl border border-white/10 shadow-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={bookingVipCreator.avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/40" />
                        <div>
                          <span className="text-sm font-bold text-white">{bookingVipCreator.name}</span>
                          <span className="text-[11px] text-white/35 block">VIP Session Booking</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setBookingVipCreator(null)} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Session type */}
                    <div>
                      <span className={label}>Session Type</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['voice', 'video', 'chat'] as const).map((type) => (
                          <button key={type} type="button" onClick={() => setVipSessionType(type)} className={`py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${vipSessionType === type ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/4 border-white/8 text-white/50 hover:border-purple-500/40'}`}>
                            {type === 'voice' ? <Phone className="w-4 h-4" /> : type === 'video' ? <Video className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                            <span className="capitalize">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    {vipSessionType !== 'chat' && (
                      <div>
                        <span className={label}>Duration</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[3, 5, 10].map((mins) => (
                            <button key={mins} type="button" onClick={() => setVipDurationMinutes(mins)} className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${vipDurationMinutes === mins ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/4 border-white/8 text-white/50 hover:border-purple-500/40'}`}>
                              {mins} min
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="p-3.5 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-between">
                      <span className="text-xs text-white/50">Total</span>
                      <span className="text-xl font-black text-purple-300 font-mono">
                        ₦{calculateVipPrice(bookingVipCreator, vipSessionType, vipDurationMinutes).toLocaleString()}
                      </span>
                    </div>

                    <button type="button" onClick={handleConfirmVipBooking} disabled={vipBookingProcessing} className={btnPrimary}>
                      {vipBookingProcessing ? 'Booking…' : 'Confirm & Pay from Wallet'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 4 · TICKETS
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'shows' && (
            <div className="space-y-4">
              {creatorShows.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">No shows listed yet</p>
                  <p className="text-xs text-white/25 max-w-xs">Creators can list physical concerts and online livestream tickets here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorShows.map((show) => (
                    <div key={show.id} className="rounded-2xl overflow-hidden border border-white/8">
                      {/* Cover */}
                      <div className="relative h-36">
                        <img src={show.coverImage} alt={show.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${show.type === 'online_stream' ? 'bg-rose-600 text-white' : 'bg-purple-600 text-white'}`}>
                          {show.type === 'online_stream' ? '🔴 Livestream' : '🏛️ Concert'}
                        </span>
                        <div className="absolute bottom-3 left-3">
                          <span className="text-[10px] text-purple-300 font-bold">{show.creatorName}</span>
                          <h4 className="text-sm font-bold text-white leading-tight">{show.title}</h4>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-4 space-y-3 bg-white/3">
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/40">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-purple-400" /><span>{show.date}</span></div>
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400" /><span className="truncate">{show.venueOrStreamUrl}</span></div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/6">
                          <div>
                            <span className="text-[10px] text-white/30">Ticket</span>
                            <span className="text-sm font-black text-purple-400 font-mono block">{formatPrice(show.price, show.currency)}</span>
                          </div>
                          {show.isPurchasedByMe ? (
                            <button type="button" onClick={() => setActiveTicketQrModal(show)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 text-white/70 text-xs font-bold border border-white/10">
                              <QrCode className="w-3.5 h-3.5" />View QR
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleBuyTicket(show)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                              <Ticket className="w-3.5 h-3.5" />{show.availableTickets} left
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 5 · MUSIC
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'music' && (
            <div className="space-y-4">
              {creatorSongs.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <Disc className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">No music drops yet</p>
                  <p className="text-xs text-white/25 max-w-xs">Artists sell songs directly to fans — 100% payout, no label cut</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creatorSongs.map((song) => {
                    const isPlaying = playingSongId === song.id;
                    return (
                      <div key={song.id} className={`${card} !space-y-0 flex items-center gap-3.5`}>
                        {/* Cover */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer" onClick={() => setPlayingSongId(isPlaying ? null : song.id)}>
                          <img src={song.coverArt} alt={song.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            {isPlaying ? <Pause className="w-5 h-5 text-purple-400" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                          </div>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">{song.title}</span>
                            {song.isPurchasedByMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/40 font-bold shrink-0">Owned</span>}
                          </div>
                          <p className="text-[11px] text-white/35 truncate">{song.artistName} · {song.genre} · {song.duration}</p>
                          <p className="text-[10px] text-white/25 font-mono mt-0.5">{song.playsCount.toLocaleString()} plays · {song.salesCount.toLocaleString()} sold</p>
                        </div>
                        {/* Action */}
                        <div className="shrink-0">
                          {song.isPurchasedByMe ? (
                            <button type="button" onClick={() => alert(`Downloaded "${song.title}"`)} className="p-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white border border-white/8">
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleBuySong(song)} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                              {formatPrice(song.price, song.currency)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 6 · STUDIO
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'studio' && (
            !currentUser.isCreator ? (
              /* ── Upgrade CTA ─── */
              <div className="space-y-4">
                <div className="text-center space-y-2 py-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center mx-auto">
                    <Crown className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-base font-black text-white">Become a Verified Creator</h3>
                  <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                    Sell music, list shows, run fan subscriptions & VIP sessions — all paid straight to your AGC Wallet.
                  </p>
                </div>

                {/* Gold plan */}
                <div className={card}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-400">Gold Creator</span>
                      <span className="text-[10px] text-white/30 block mt-0.5">5% platform fee on earnings</span>
                    </div>
                    <span className="text-sm font-black font-mono text-white">₦11,000<span className="text-[11px] text-white/35">/mo</span></span>
                  </div>
                  <ul className="space-y-2 pt-1">
                    {['Gold checkmark badge on profile & stories', 'Sell music, files & show tickets', 'Monthly fan subscriptions'].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => { const r = upgradeVerificationBadge('gold'); r.success ? toast('🎉 Gold Creator Studio activated!') : alert(r.message); }} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-bold text-sm shadow-lg shadow-amber-900/40 transition-all">
                    <Crown className="w-4 h-4" />Activate Gold Creator · ₦11k/mo
                  </button>
                </div>

                {/* Creator Plus plan */}
                <div className={`${card} border-purple-500/30 relative overflow-hidden`}>
                  <div className="absolute top-3 right-3">
                    <span className="text-[9px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">Best Value</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-300">Creator Plus Plan</span>
                    <span className="text-[10px] text-white/30 block mt-0.5">Only 2% platform fee on earnings</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <ul className="space-y-2 pt-1">
                      {['Keep 98% of all revenue', 'Priority placement in Updates & Town', 'Unlimited Ajo groups at 2% fee'].map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/6">
                    <span className="text-sm font-black font-mono text-white">₦25,000<span className="text-[11px] text-white/35">/mo</span></span>
                    <button type="button" onClick={() => { const r = upgradeVerificationBadge('creator_plus'); r.success ? toast('🌟 Creator Plus activated — lowest 2% fee!') : alert(r.message); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-purple-900/50 transition-all">
                      <Sparkles className="w-3.5 h-3.5" />Activate Plus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Creator Dashboard ─── */
              <div className="space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Wallet Balance', value: `₦${wallet.availableBalance.toLocaleString()}`, sub: 'Available', color: 'text-purple-300' },
                    { label: 'VIP Subscribers', value: `${creators.reduce((a, c) => a + c.subscribersCount, 0).toLocaleString()}`, sub: 'Monthly fans', color: 'text-white' },
                  ].map((s) => (
                    <div key={s.label} className={`${card} !space-y-0.5`}>
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">{s.label}</span>
                      <span className={`text-xl font-black font-mono ${s.color}`}>{s.value}</span>
                      <span className="text-[10px] text-white/25">{s.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="space-y-2.5">
                  <span className={label}>Drop New Content</span>

                  <button type="button" onClick={() => setShowNewPostForm(!showNewPostForm)} className={btnPrimary}>
                    <Plus className="w-4 h-4" />New Exclusive Fan Post
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setShowNewShowForm(!showNewShowForm)} className={btnOutline}>
                      <Ticket className="w-4 h-4" />Sell Tickets
                    </button>
                    <button type="button" onClick={() => setShowNewSongForm(!showNewSongForm)} className={btnOutline}>
                      <Music className="w-4 h-4" />Drop Song
                    </button>
                  </div>

                  <button type="button" onClick={() => setShowNewFileForm(!showNewFileForm)} className={btnOutline}>
                    <Upload className="w-4 h-4" />Sell Any File from Device
                  </button>

                  <button type="button" onClick={() => setShowRateSettings(!showRateSettings)} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-500/70 hover:text-amber-400 font-semibold text-xs transition-all">
                    <Sliders className="w-3.5 h-3.5" />Set VIP Call & Chat Rates
                  </button>
                </div>

                {/* ── New Post Form ─────────────────────────────────── */}
                {showNewPostForm && (
                  <div className={`${card} animate-in zoom-in-98`}>
                    <span className={label}>New Creator Post</span>
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a message, studio notes, or exclusive content..."
                      rows={3}
                      className={inputCls}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">VIP Only?</span>
                        <button type="button" onClick={() => setNewPostIsLocked(!newPostIsLocked)} className={`w-10 h-5 rounded-full transition-all relative ${newPostIsLocked ? 'bg-purple-600' : 'bg-white/15'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${newPostIsLocked ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowNewPostForm(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-xs">Cancel</button>
                        <button type="button" onClick={handleCreatePost} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">Publish</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── New Show Form ─────────────────────────────────── */}
                {showNewShowForm && (
                  <div className={`${card} animate-in zoom-in-98 space-y-3`}>
                    <span className={label}>List a Show</span>
                    <input value={newShowTitle} onChange={(e) => setNewShowTitle(e.target.value)} placeholder="Show title" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      {(['offline_concert', 'online_stream'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setNewShowType(t)} className={`py-2 rounded-lg text-xs font-bold border transition-all ${newShowType === t ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/4 border-white/8 text-white/50'}`}>
                          {t === 'offline_concert' ? '🏛 Concert' : '🔴 Livestream'}
                        </button>
                      ))}
                    </div>
                    <input value={newShowDate} onChange={(e) => setNewShowDate(e.target.value)} placeholder="Date" className={inputCls} />
                    <input value={newShowVenue} onChange={(e) => setNewShowVenue(e.target.value)} placeholder="Venue / Stream URL" className={inputCls} />
                    <input type="number" value={newShowPrice} onChange={(e) => setNewShowPrice(Number(e.target.value))} placeholder="Ticket price (₦)" className={inputCls} />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowNewShowForm(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 text-xs">Cancel</button>
                      <button type="button" onClick={handleCreateShow} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">List Show</button>
                    </div>
                  </div>
                )}

                {/* ── New Song Form ─────────────────────────────────── */}
                {showNewSongForm && (
                  <div className={`${card} animate-in zoom-in-98 space-y-3`}>
                    <span className={label}>Drop a Song</span>
                    <input value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} placeholder="Song title" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={newSongGenre} onChange={(e) => setNewSongGenre(e.target.value)} placeholder="Genre" className={inputCls} />
                      <input value={newSongAlbum} onChange={(e) => setNewSongAlbum(e.target.value)} placeholder="Album / Single" className={inputCls} />
                    </div>
                    <input type="number" value={newSongPrice} onChange={(e) => setNewSongPrice(Number(e.target.value))} placeholder="Price (₦)" className={inputCls} />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowNewSongForm(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 text-xs">Cancel</button>
                      <button type="button" onClick={handleCreateSong} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">Drop Song</button>
                    </div>
                  </div>
                )}

                {/* ── New File Form ─────────────────────────────────── */}
                {showNewFileForm && (
                  <form onSubmit={handleCreateDigitalFile} className={`${card} animate-in zoom-in-98 space-y-3`}>
                    <span className={label}>Sell a File</span>
                    <input value={newFileTitle} onChange={(e) => setNewFileTitle(e.target.value)} placeholder="Product title" className={inputCls} />
                    <select value={newFileCategory} onChange={(e) => setNewFileCategory(e.target.value as typeof newFileCategory)} className={inputCls}>
                      <option value="ebook">Ebook / PDF</option>
                      <option value="music_audio">Beat / Sample Pack</option>
                      <option value="preset_lut">Preset / LUT</option>
                      <option value="video">Video</option>
                      <option value="design_art">Design / Art</option>
                      <option value="code_software">Code / Software</option>
                    </select>
                    <textarea value={newFileDesc} onChange={(e) => setNewFileDesc(e.target.value)} placeholder="Description" rows={2} className={inputCls} />
                    <input type="number" value={newFilePrice} onChange={(e) => setNewFilePrice(e.target.value)} placeholder="Price (₦)" className={inputCls} />
                    <label className="block">
                      <div className={`${card} !p-3 cursor-pointer border-dashed flex items-center gap-2.5`}>
                        <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-xs text-white/40">{uploadedFileName || 'Choose file from device'}</span>
                      </div>
                      <input type="file" className="hidden" onChange={handleDeviceFileUpload} />
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowNewFileForm(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 text-xs">Cancel</button>
                      <button type="submit" className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">List for Sale</button>
                    </div>
                  </form>
                )}

                {/* ── VIP Rate Settings ─────────────────────────────── */}
                {showRateSettings && (
                  <form onSubmit={handleSaveVipRates} className={`${card} animate-in zoom-in-98 space-y-3`}>
                    <span className={label}>Set Your VIP Rates</span>
                    {[
                      { label: 'Voice / min (₦)', val: rateVoicePerMin, set: setRateVoicePerMin },
                      { label: 'Video / min (₦)', val: rateVideoPerMin, set: setRateVideoPerMin },
                      { label: '3-Min Voice Bundle (₦)', val: rate3MinVoice, set: setRate3MinVoice },
                      { label: '5-Min Voice Bundle (₦)', val: rate5MinVoice, set: setRate5MinVoice },
                      { label: '3-Min Video Bundle (₦)', val: rate3MinVideo, set: setRate3MinVideo },
                      { label: '5-Min Video Bundle (₦)', val: rate5MinVideo, set: setRate5MinVideo },
                      { label: 'VIP Chat 24h (₦)', val: rateVipChat, set: setRateVipChat },
                    ].map((r) => (
                      <div key={r.label}>
                        <span className="text-[10px] text-white/35 block mb-1">{r.label}</span>
                        <input type="number" value={r.val} onChange={(e) => r.set(e.target.value)} className={inputCls} />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowRateSettings(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 text-xs">Cancel</button>
                      <button type="submit" className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">Save Rates</button>
                    </div>
                  </form>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Ticket QR Modal ─────────────────────────────────────────────────── */}
      {activeTicketQrModal && (
        <div className="fixed inset-0 z-70 bg-black/95 flex items-center justify-center p-6">
          <div className="bg-[#0a0a0f] rounded-3xl border border-white/10 p-6 w-full max-w-xs space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center mx-auto">
              <Ticket className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{activeTicketQrModal.title}</h4>
              <p className="text-[11px] text-white/35 mt-1">Ticket #{activeTicketQrModal.id}</p>
            </div>
            <div className="w-32 h-32 rounded-2xl bg-white mx-auto flex items-center justify-center">
              <QrCode className="w-20 h-20 text-black" />
            </div>
            <p className="text-[10px] text-white/25 font-mono">AFRI-PASS-{activeTicketQrModal.id.toUpperCase()}</p>
            <button type="button" onClick={() => setActiveTicketQrModal(null)} className={btnOutline}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
