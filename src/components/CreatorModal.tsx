import React, { useState } from 'react';
import {
  Sparkles,
  Ticket,
  Music,
  Lock,
  Unlock,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  Download,
  Calendar,
  MapPin,
  Radio,
  Plus,
  X,
  CheckCircle2,
  QrCode,
  DollarSign,
  TrendingUp,
  Users,
  Volume2,
  ExternalLink,
  ShieldCheck,
  Disc,
  Crown,
  Phone,
  Video,
  FileText,
  Upload,
  Folder,
  Sliders,
  ArrowRight,
  Eye,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreatorProfile, CreatorPost, CreatorShowTicket, CreatorSong, CreatorDigitalFile } from '../types';

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

  const [activeTab, setActiveTab] = useState<'feed' | 'files' | 'vip_sessions' | 'shows' | 'music' | 'studio'>('feed');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [playingLeakPostId, setPlayingLeakPostId] = useState<string | null>(null);
  const [activeTicketQrModal, setActiveTicketQrModal] = useState<CreatorShowTicket | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // VIP Session Booking State
  const [bookingVipCreator, setBookingVipCreator] = useState<CreatorProfile | null>(null);
  const [vipSessionType, setVipSessionType] = useState<'voice' | 'video' | 'chat'>('voice');
  const [vipDurationMinutes, setVipDurationMinutes] = useState<number>(3);
  const [vipBookingProcessing, setVipBookingProcessing] = useState(false);

  // Digital File Category Filter
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>('all');

  // Studio Creator Modals
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

  // Upload Any Digital File from Device
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileCategory, setNewFileCategory] = useState<CreatorDigitalFile['category']>('ebook');
  const [newFileDesc, setNewFileDesc] = useState('');
  const [newFilePrice, setNewFilePrice] = useState('2000');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState('');

  // VIP Session Rates Customizer Form
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [rateVoicePerMin, setRateVoicePerMin] = useState('1500');
  const [rateVideoPerMin, setRateVideoPerMin] = useState('3000');
  const [rate3MinVoice, setRate3MinVoice] = useState('3500');
  const [rate5MinVoice, setRate5MinVoice] = useState('5500');
  const [rate3MinVideo, setRate3MinVideo] = useState('7500');
  const [rate5MinVideo, setRate5MinVideo] = useState('12000');
  const [rateVipChat, setRateVipChat] = useState('4000');

  if (!isCreatorModalOpen) return null;

  const handleSubscribe = (creator: CreatorProfile) => {
    const res = subscribeToCreator(creator.id);
    setSuccessToast(res.message);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleBuyTicket = (show: CreatorShowTicket) => {
    const res = buyShowTicket(show.id);
    if (res.ticket) {
      setActiveTicketQrModal(res.ticket);
    }
    setSuccessToast(res.message);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleBuySong = (song: CreatorSong) => {
    const res = buyCreatorSong(song.id);
    setSuccessToast(res.message);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createCreatorPost(newPostContent, newPostIsLocked, newPostMediaType);
    setNewPostContent('');
    setShowNewPostForm(false);
    setSuccessToast('🌟 Exclusive Creator Post published to your fan feed!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCreateShow = () => {
    if (!newShowTitle.trim()) return;
    createCreatorShow({
      creatorId: 'cr_kelvin_vibe',
      creatorName: currentUser.fullName || 'You (Creator)',
      creatorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: newShowTitle,
      type: newShowType,
      date: newShowDate,
      time: newShowTime,
      venueOrStreamUrl: newShowVenue,
      price: Number(newShowPrice) || 5000,
      currency: 'NGN',
      availableTickets: 150,
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      description: 'Official ticket drop. Revenue credited 100% to creator AfriChat Wallet.',
    });
    setNewShowTitle('');
    setShowNewShowForm(false);
    setSuccessToast('🎟️ Show & tickets listed on AfriCreator Hub!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCreateSong = () => {
    if (!newSongTitle.trim()) return;
    createCreatorSong({
      artistId: 'cr_kelvin_vibe',
      artistName: currentUser.fullName || 'You (Artist)',
      artistAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
    setSuccessToast('🎵 Song dropped for direct fan purchase! Earnings will deposit straight to your wallet.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploadedFileSize(`${sizeMb} MB`);
    setUploadedFileType(file.type || 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setUploadedFileDataUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDigitalFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) {
      alert('Please enter a product title');
      return;
    }
    if (!uploadedFileName) {
      alert('Please select a file to upload from your device.');
      return;
    }

    uploadCreatorFile({
      creatorId: 'cr_kelvin_vibe',
      creatorName: currentUser.fullName || 'You (Creator)',
      creatorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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

    setNewFileTitle('');
    setNewFileDesc('');
    setUploadedFileName('');
    setShowNewFileForm(false);
    setSuccessToast(`📁 Digital asset "${newFileTitle}" listed for sale! Fans can now buy and download.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSaveVipRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreatorVipRates('cr_kelvin_vibe', {
      voicePerMinute: Number(rateVoicePerMin) || 1500,
      videoPerMinute: Number(rateVideoPerMin) || 3000,
      bundle3MinVoice: Number(rate3MinVoice) || 3500,
      bundle5MinVoice: Number(rate5MinVoice) || 5500,
      bundle3MinVideo: Number(rate3MinVideo) || 7500,
      bundle5MinVideo: Number(rate5MinVideo) || 12000,
      vipDirectChat24h: Number(rateVipChat) || 4000,
    });
    setShowRateSettings(false);
    setSuccessToast('✅ Custom VIP Session & Call rates updated successfully!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const calculateVipPrice = (creator: CreatorProfile, type: 'voice' | 'video' | 'chat', mins: number) => {
    const vip = creator.vipServices || {
      voicePerMinute: 1500,
      videoPerMinute: 3000,
      bundle3MinVoice: 3500,
      bundle5MinVoice: 5500,
      bundle3MinVideo: 7500,
      bundle5MinVideo: 12000,
      vipDirectChat24h: 4000,
    };
    if (type === 'chat') return vip.vipDirectChat24h;
    if (type === 'voice') {
      if (mins === 3) return vip.bundle3MinVoice;
      if (mins === 5) return vip.bundle5MinVoice;
      return vip.voicePerMinute * mins;
    }
    if (type === 'video') {
      if (mins === 3) return vip.bundle3MinVideo;
      if (mins === 5) return vip.bundle5MinVideo;
      return vip.videoPerMinute * mins;
    }
    return 1000;
  };

  const handleConfirmVipBooking = () => {
    if (!bookingVipCreator) return;
    const price = calculateVipPrice(bookingVipCreator, vipSessionType, vipDurationMinutes);
    setVipBookingProcessing(true);
    setTimeout(() => {
      setVipBookingProcessing(false);
      const res = bookCreatorVipSession(bookingVipCreator.id, vipSessionType, vipDurationMinutes, price);
      setBookingVipCreator(null);
      if (res.success) {
        setIsCreatorModalOpen(false);
      } else {
        alert(res.message);
      }
    }, 600);
  };

  const filteredPosts = creatorPosts.filter((post) => {
    if (selectedCreatorId === 'all') return true;
    return post.creatorId === selectedCreatorId;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-black border-b border-purple-500/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                    AfriCreator Hub
                  </h3>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300">
                    Direct Economy
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  VIP Calls · Digital Files · Music Drops · Live Shows
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCreatorModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold animate-in slide-in-from-top-2 shadow-md flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs (6 Tabs) */}
        <div className="flex items-center overflow-x-auto no-scrollbar p-1 bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-[10px] font-bold shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'feed'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>VIP Feed</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'files'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>File Shop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vip_sessions')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'vip_sessions'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>VIP Calls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shows')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'shows'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('music')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'music'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`py-2 px-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            {currentUser.isCreator ? (
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            ) : (
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Studio / Sell</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: VIP SUBSCRIBER FEED (Like OnlyFans with African Twist) */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {/* Creator Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCreatorId('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCreatorId === 'all'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  All Creators
                </button>
                {creators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCreatorId(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedCreatorId === c.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    <span>{c.name.split(' ')[0]}</span>
                    {c.isSubscribedByMe && (
                      <span className="text-[9px] bg-white/20 px-1 rounded-full">VIP</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Creator Spotlight Header Card (If single creator selected) */}
              {selectedCreatorId !== 'all' && (
                (() => {
                  const creator = creators.find((c) => c.id === selectedCreatorId);
                  if (!creator) return null;
                  return (
                    <div className="rounded-3xl overflow-hidden border border-purple-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm">
                      <div className="h-20 w-full relative">
                        <img
                          src={creator.banner}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>
                      <div className="p-3.5 pt-0 -mt-7 relative z-10">
                        <div className="flex items-end justify-between">
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-black shadow-md"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const res = toggleFollowCreator(creator.id);
                                setSuccessToast(res.isFollowed ? `✓ Followed ${creator.name}! Their stories now appear in your Updates tab.` : `Unfollowed ${creator.name}`);
                                setTimeout(() => setSuccessToast(null), 3000);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-transform active:scale-95 border ${
                                creator.isFollowedByMe
                                  ? 'bg-neutral-800 text-white border-neutral-700'
                                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                              }`}
                            >
                              {creator.isFollowedByMe ? '✓ Following' : '+ Follow'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSubscribe(creator)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-sm ${
                                creator.isSubscribedByMe
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              }`}
                            >
                              {creator.isSubscribedByMe ? '✓ Subscribed VIP' : `Subscribe ${formatPrice(creator.monthlySubPrice, creator.currency)}/mo`}
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                          {creator.name}
                        </h4>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
                          {creator.handle} · {creator.subscribersCount.toLocaleString()} fans
                        </p>
                        <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1">
                          {creator.bio}
                        </p>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Posts Feed */}
              <div className="space-y-3">
                {filteredPosts.map((post) => {
                  const creator = creators.find((c) => c.id === post.creatorId);
                  const isUnlocked = !post.isLocked || creator?.isSubscribedByMe;

                  return (
                    <div
                      key={post.id}
                      className="p-3.5 rounded-3xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs space-y-2.5"
                    >
                      {/* Post Author */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={post.creatorAvatar}
                            alt={post.creatorName}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-500/50"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {post.creatorName}
                              </span>
                              {post.isLocked && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>VIP Only</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {post.creatorHandle} · {post.createdAt}
                            </span>
                          </div>
                        </div>

                        {creator && !creator.isSubscribedByMe && post.isLocked && (
                          <button
                            type="button"
                            onClick={() => handleSubscribe(creator)}
                            className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-2xs"
                          >
                            Unlock
                          </button>
                        )}
                      </div>

                      {/* Post Content */}
                      {isUnlocked ? (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                            {post.content}
                          </p>

                          {post.mediaType === 'image' && post.mediaUrl && (
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full rounded-2xl object-cover max-h-60"
                            />
                          )}

                          {post.mediaType === 'audio_leak' && (
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/30 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingLeakPostId(
                                    playingLeakPostId === post.id ? null : post.id
                                  )
                                }
                                className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
                              >
                                {playingLeakPostId === post.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                  Exclusive Studio Audio Leak ({post.audioDurationSec}s)
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  {Array.from({ length: 24 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`flex-1 rounded-full ${
                                        playingLeakPostId === post.id
                                          ? 'bg-purple-500 animate-pulse'
                                          : 'bg-purple-300 dark:bg-purple-900'
                                      }`}
                                      style={{ height: `${(i % 5) * 4 + 6}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Locked Post Teaser (OnlyFans style) */
                        <div className="relative rounded-2xl overflow-hidden p-6 bg-slate-100 dark:bg-neutral-900 border border-purple-200 dark:border-purple-900/40 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            Subscribers-Only Content
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 max-w-xs mx-auto">
                            Subscribe to {post.creatorName} to unlock full unreleased audio, high-definition videos, and backstage banter.
                          </p>
                          {creator && (
                            <button
                              type="button"
                              onClick={() => handleSubscribe(creator)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-transform active:scale-95"
                            >
                              Subscribe for {formatPrice(creator.monthlySubPrice, creator.currency)}/month
                            </button>
                          )}
                        </div>
                      )}

                      {/* Post Actions (Like, Comment, Tip) */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900 text-xs text-slate-500 dark:text-neutral-400">
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                        >
                          <Heart className="w-4 h-4" />
                          <span>{post.likesCount}</span>
                        </button>

                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-purple-500 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount} comments</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (creator) {
                              setSuccessToast(`💖 Sent ₦1,000 Tip to ${creator.name}'s wallet!`);
                              setTimeout(() => setSuccessToast(null), 3000);
                            }
                          }}
                          className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                        >
                          <span>Tip Artist</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DIGITAL FILES SHOP (Any File: Ebooks, Presets, Beats, Video, Code, Art) */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-purple-900/30 via-indigo-950/40 to-slate-900/60 rounded-2xl border border-purple-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                    <Folder className="w-4 h-4" />
                    <span>Digital File & Asset Marketplace</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Creators can sell any file directly from their device. Instant 100% wallet payout.
                  </p>
                </div>
                {currentUser.isCreator && (
                  <button
                    onClick={() => {
                      setActiveTab('studio');
                      setShowNewFileForm(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-[11px] shrink-0 hover:bg-purple-700"
                  >
                    + Sell File
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {['all', 'ebook', 'music_audio', 'preset_lut', 'video', 'design_art', 'code_software'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFileCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                      fileCategoryFilter === cat
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    {cat === 'all'
                      ? 'All Files'
                      : cat === 'ebook'
                      ? 'Ebooks & PDFs'
                      : cat === 'music_audio'
                      ? 'Beats & Samples'
                      : cat === 'preset_lut'
                      ? 'Presets & LUTs'
                      : cat === 'video'
                      ? 'Videos'
                      : cat === 'design_art'
                      ? 'Digital Art'
                      : 'Code / Tech'}
                  </button>
                ))}
              </div>

              {/* Files List */}
              <div className="space-y-3">
                {creatorFiles
                  .filter((f) => fileCategoryFilter === 'all' || f.category === fileCategoryFilter)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            {file.category === 'ebook' ? (
                              <FileText className="w-5 h-5" />
                            ) : file.category === 'music_audio' ? (
                              <Music className="w-5 h-5" />
                            ) : file.category === 'video' ? (
                              <Video className="w-5 h-5" />
                            ) : (
                              <Folder className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                              {file.title}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              By <span className="font-semibold text-slate-300">{file.creatorName}</span> · {file.fileSize} · {file.category.toUpperCase()}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-1 line-clamp-2">
                              {file.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 block">
                            ₦{file.price.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {file.downloadsCount} sold
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800 text-xs">
                        <span className="text-[10px] font-mono text-slate-400">
                          File: {file.fileName}
                        </span>

                        {file.isPurchasedByMe ? (
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Downloaded "${file.fileName}" (${file.fileSize}) to your device storage.`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-300"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download File</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const res = buyCreatorFile(file.id);
                              if (res.success) {
                                setSuccessToast(res.message);
                                setTimeout(() => setSuccessToast(null), 3000);
                              } else {
                                alert(res.message);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                          >
                            <span>Buy ₦{file.price.toLocaleString()}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: VIP 1-ON-1 SESSIONS (Calls, Chat, Video Call Booking per Minute & Bundles) */}
          {activeTab === 'vip_sessions' && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-amber-500/15 via-purple-600/10 to-indigo-950/40 rounded-2xl border border-amber-500/30 text-xs">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Phone className="w-4 h-4" />
                  <span>VIP 1-on-1 Sessions: Direct Calls with Creators</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  Book voice calls, video calls, or VIP direct chats per minute or 3/5 min bundles. Creator sets the price.
                </p>
              </div>

              <div className="space-y-3">
                {creators.map((creator) => {
                  const vip = creator.vipServices || {
                    voicePerMinute: 1500,
                    videoPerMinute: 3000,
                    bundle3MinVoice: 3500,
                    bundle5MinVoice: 5500,
                    bundle3MinVideo: 7500,
                    bundle5MinVideo: 12000,
                    vipDirectChat24h: 4000,
                  };

                  return (
                    <div
                      key={creator.id}
                      className="p-3.5 rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500/50"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {creator.name}
                              </span>
                              <span className="text-[9px] bg-amber-500/20 text-amber-500 font-bold px-1.5 py-0.2 rounded-full">
                                {creator.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {creator.handle} · {creator.category}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setBookingVipCreator(creator);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                        >
                          Book Session
                        </button>
                      </div>

                      {/* Creator Rate Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                        <div className="p-2 rounded-xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                          <span className="text-slate-400 block text-[9px]">Voice Call</span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            ₦{vip.voicePerMinute.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-purple-500">/ min</span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                          <span className="text-slate-400 block text-[9px]">Video Call</span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            ₦{vip.videoPerMinute.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-purple-500">/ min</span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                          <span className="text-slate-400 block text-[9px]">3 Min Bundle</span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            ₦{vip.bundle3MinVoice.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-emerald-500">Discount</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SHOW & CONCERT TICKETS (Online Live Streams & Physical Concerts) */}
          {activeTab === 'shows' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/20 to-pink-950/20 border border-purple-500/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-purple-500" />
                  <span>Online & Offline Show Ticket Pass</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight">
                  Buy entry tickets to physical African concerts or exclusive online livestreams. 100% fraud-proof QR tickets stored in your app.
                </p>
              </div>

              <div className="space-y-3.5">
                {creatorShows.map((show) => (
                  <div
                    key={show.id}
                    className="rounded-3xl overflow-hidden bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs group"
                  >
                    <div className="relative h-32 w-full">
                      <img
                        src={show.coverImage}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      <span
                        className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          show.type === 'online_stream'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {show.type === 'online_stream' ? '🔴 Online Livestream' : '🏛️ Physical Concert'}
                      </span>

                      <div className="absolute bottom-2 left-3 right-3 text-white">
                        <span className="text-[10px] text-purple-300 font-bold block">
                          {show.creatorName}
                        </span>
                        <h4 className="text-sm font-bold leading-tight truncate">
                          {show.title}
                        </h4>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span className="truncate">{show.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span className="truncate">{show.venueOrStreamUrl}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2">
                        {show.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Ticket Price</span>
                          <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400">
                            {formatPrice(show.price, show.currency)}
                          </span>
                        </div>

                        {show.isPurchasedByMe ? (
                          <button
                            type="button"
                            onClick={() => setActiveTicketQrModal(show)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View Ticket QR</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuyTicket(show)}
                            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Buy Ticket ({show.availableTickets} left)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT MUSIC DROPS (Artists Sell Songs Directly to Fans) */}
          {activeTab === 'music' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-500/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Disc className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span>Direct-To-Artist Music Store (100% Payout)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight">
                  No record label or streaming cut. Buy high-definition singles, beats, and mixtapes directly from African artists.
                </p>
              </div>

              <div className="space-y-3">
                {creatorSongs.map((song) => {
                  const isPlaying = playingSongId === song.id;

                  return (
                    <div
                      key={song.id}
                      className="p-3 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs flex items-center gap-3"
                    >
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 group cursor-pointer"
                        onClick={() => setPlayingSongId(isPlaying ? null : song.id)}
                      >
                        <img
                          src={song.coverArt}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-90 group-hover:opacity-100 transition-opacity">
                          {isPlaying ? (
                            <Pause className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5 text-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {song.title}
                          </h5>
                          {song.isPurchasedByMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-600">
                              Owned ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                          {song.artistName} · {song.genre} ({song.duration})
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>{song.playsCount.toLocaleString()} plays</span>
                          <span>•</span>
                          <span>{song.salesCount.toLocaleString()} sold</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {song.isPurchasedByMe ? (
                          <button
                            type="button"
                            onClick={() => alert(`Downloaded high-res audio track for "${song.title}"!`)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200"
                            title="Download Audio"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuySong(song)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                          >
                            <span>Buy {formatPrice(song.price, song.currency)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CREATOR STUDIO & ARTIST REVENUE DASHBOARD */}
          {activeTab === 'studio' && (
            !currentUser.isCreator ? (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/60 via-neutral-900 to-black border border-amber-500/30 text-white space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <Crown className="w-7 h-7 text-amber-200" />
                  </div>
                  <h4 className="font-black text-base text-white">
                    Become a Verified African Creator
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                    Regular listeners enjoy VIP feeds and concert tickets. To start selling songs, listing live shows, and collecting monthly fan subscriptions, activate your Creator Account.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Option 1: Gold Creator Plan (₦11,000 / mo · 5% Platform Fee) */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div>
                        <span className="text-xs font-bold text-amber-400 block">Gold Creator Checkmark</span>
                        <span className="text-[10px] text-slate-400">5% platform fee on all earnings</span>
                      </div>
                      <span className="text-sm font-black font-mono text-white">₦11,000 / mo</span>
                    </div>

                    <ul className="text-xs text-slate-300 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Platform charges 5% on music drops, concert tickets & monthly VIP subs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Gold Creator Verified badge on your profile and story updates</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Host Ajo / Esusu community savings circles at 2% platform fee</span>
                      </li>
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        const res = upgradeVerificationBadge('gold');
                        if (res.success) {
                          setSuccessToast('🎉 Welcome to AfriCreator! Gold Creator Studio is now active.');
                          setTimeout(() => setSuccessToast(null), 4000);
                        } else {
                          alert(res.message);
                        }
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:opacity-95 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Crown className="w-4 h-4 text-amber-200" />
                      <span>Pay ₦11,000/mo & Unlock Gold Creator (5% fee)</span>
                    </button>
                  </div>

                  {/* Option 2: Creator Plus Plan (₦25,000 / mo · only 2% Platform Fee) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent border border-purple-400/40 space-y-2.5 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-purple-300 block">Creator Plus Plan</span>
                          <span className="text-[9px] font-mono font-bold bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-full">
                            Best Value
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-300">Platform charges only 2% on earnings!</span>
                      </div>
                      <span className="text-sm font-black font-mono text-white">₦25,000 / mo</span>
                    </div>

                    <ul className="text-xs text-slate-300 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                        <span>Keep 98% of your revenue: platform takes only 2% on all creator earnings!</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                        <span>Host unlimited high-limit Ajo pots at 2% platform fee</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                        <span>Priority featured placement across Updates tab & Town View</span>
                      </li>
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        const res = upgradeVerificationBadge('creator_plus');
                        if (res.success) {
                          setSuccessToast('🌟 Welcome to Creator Plus! Lowest 2% platform fee enabled.');
                          setTimeout(() => setSuccessToast(null), 4000);
                        } else {
                          alert(res.message);
                        }
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:opacity-95 active:scale-98 text-white rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-purple-200" />
                      <span>Pay ₦25,000/mo & Unlock Creator Plus (2% fee)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {/* Creator Earnings Stats */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-950/40 via-neutral-900 to-black border border-purple-500/30 text-white space-y-3">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  Your Creator Economy Dashboard
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Total Earnings</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      ₦3,850,000
                    </span>
                    <span className="text-[9px] text-emerald-300 block mt-0.5">Paid to AfriChat Wallet</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Active VIP Fans</span>
                    <span className="text-lg font-black font-mono text-purple-300">
                      1,420
                    </span>
                    <span className="text-[9px] text-purple-200 block mt-0.5">Monthly subscribers</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Concert Tickets Sold:</span>
                    <span className="font-bold text-white font-mono">182</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Songs Sold:</span>
                    <span className="font-bold text-white font-mono">2,080</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons to Drop Content */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowNewPostForm(!showNewPostForm)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Exclusive Post (Free vs VIP Fans)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewShowForm(!showNewShowForm)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  <span>+ Sell Show Tickets (Online Stream or Concert)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewSongForm(!showNewSongForm)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-purple-500/50 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Music className="w-4 h-4" />
                  <span>+ Drop New Song (Direct to Fan Wallet)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewFileForm(!showNewFileForm)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>+ Sell Any File (Upload from Device)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRateSettings(!showRateSettings)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/30 transition-colors"
                >
                  <Sliders className="w-4 h-4" />
                  <span>⚙️ Set VIP Session Rates (Calls & Chats)</span>
                </button>
              </div>

              {/* Form 1: New Exclusive Post */}
              {showNewPostForm && (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 animate-in zoom-in-95">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Publish Creator Post
                  </h5>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Write a message to your fans or share studio notes..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-neutral-300">
                      Lock for Paid VIP Fans Only?
                    </span>
                    <input
                      type="checkbox"
                      checked={newPostIsLocked}
                      onChange={(e) => setNewPostIsLocked(e.target.checked)}
                      className="accent-purple-600 w-4 h-4"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePost}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                  >
                    Post to Fan Feed
                  </button>
                </div>
              )}

              {/* Form 2: New Show Ticket */}
              {showNewShowForm && (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 animate-in zoom-in-95">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Create & Sell Show Tickets
                  </h5>
                  <input
                    type="text"
                    value={newShowTitle}
                    onChange={(e) => setNewShowTitle(e.target.value)}
                    placeholder="Event title (e.g. Lagos Island Live or Amapiano Night)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newShowType}
                      onChange={(e) => setNewShowType(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                    >
                      <option value="offline_concert">Physical Live Concert</option>
                      <option value="online_stream">Online Stream</option>
                    </select>
                    <input
                      type="number"
                      value={newShowPrice}
                      onChange={(e) => setNewShowPrice(Number(e.target.value))}
                      placeholder="Ticket Price (₦)"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                    />
                  </div>
                  <input
                    type="text"
                    value={newShowVenue}
                    onChange={(e) => setNewShowVenue(e.target.value)}
                    placeholder="Venue or Stream Link"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={handleCreateShow}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                  >
                    List Event & Sell Tickets
                  </button>
                </div>
              )}

              {/* Form 3: New Song Drop */}
              {showNewSongForm && (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 animate-in zoom-in-95">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Drop New Song Directly to Fans
                  </h5>
                  <input
                    type="text"
                    value={newSongTitle}
                    onChange={(e) => setNewSongTitle(e.target.value)}
                    placeholder="Song title (e.g. Sisi Eko or Amapiano Groove)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newSongGenre}
                      onChange={(e) => setNewSongGenre(e.target.value)}
                      placeholder="Genre (Afrobeats)"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                    />
                    <input
                      type="number"
                      value={newSongPrice}
                      onChange={(e) => setNewSongPrice(Number(e.target.value))}
                      placeholder="Song Price (₦)"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSong}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                  >
                    Publish Song Drop
                  </button>
                </div>
              )}

              {/* Form 4: Sell Any Digital File (Upload from Device) */}
              {showNewFileForm && (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-500" />
                      <span>Sell Any File Directly (Upload from Device)</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowNewFileForm(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Sell ebooks, presets, beats, 4K footage, 3D assets, PDFs, or software. Fans pay directly to your AfriChat wallet before downloading.
                  </p>

                  <form onSubmit={handleCreateDigitalFile} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        File Asset (Pick from device storage) *
                      </label>
                      <input
                        type="file"
                        onChange={handleDeviceFileUpload}
                        className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer p-1.5 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                      />
                      {uploadedFileName && (
                        <div className="mt-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                          <span className="truncate font-mono">📎 {uploadedFileName}</span>
                          <span className="font-bold shrink-0">{uploadedFileSize}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        Product / Asset Title *
                      </label>
                      <input
                        type="text"
                        value={newFileTitle}
                        onChange={(e) => setNewFileTitle(e.target.value)}
                        placeholder="e.g. Master Afrobeats Drum Kit 2026 or Lagos Streetwear Lookbook"
                        required
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                          Category
                        </label>
                        <select
                          value={newFileCategory}
                          onChange={(e) => setNewFileCategory(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800"
                        >
                          <option value="ebook">Ebook / PDF Guide</option>
                          <option value="music_audio">Audio Sample / Beat</option>
                          <option value="preset_lut">Presets & Filters</option>
                          <option value="video">Video Masterclass</option>
                          <option value="design_art">Design / Art Asset</option>
                          <option value="code_software">Code / Tech Template</option>
                          <option value="other">Other Document</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                          Price (₦ NGN)
                        </label>
                        <input
                          type="number"
                          value={newFilePrice}
                          onChange={(e) => setNewFilePrice(e.target.value)}
                          placeholder="2000"
                          min="100"
                          required
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        Description / What fans get
                      </label>
                      <textarea
                        value={newFileDesc}
                        onChange={(e) => setNewFileDesc(e.target.value)}
                        placeholder="Describe contents, formats included, compatibility..."
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Publish & Sell File for ₦{Number(newFilePrice).toLocaleString()}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Form 5: Customize VIP 1-on-1 Call & Chat Rates */}
              {showRateSettings && (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-amber-500/30 space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span>Configure VIP Call & Chat Rates</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowRateSettings(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    You set your own prices! Fans can book private 1-on-1 calls with you per minute or choose 3/5 minute bundles.
                  </p>

                  <form onSubmit={handleSaveVipRates} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                          Voice Call (₦ / min)
                        </label>
                        <input
                          type="number"
                          value={rateVoicePerMin}
                          onChange={(e) => setRateVoicePerMin(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                          Video Call (₦ / min)
                        </label>
                        <input
                          type="number"
                          value={rateVideoPerMin}
                          onChange={(e) => setRateVideoPerMin(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 block">
                        Special Bundles (3 Mins & 5 Mins)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 block">3 Min Voice Bundle (₦)</label>
                          <input
                            type="number"
                            value={rate3MinVoice}
                            onChange={(e) => setRate3MinVoice(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block">5 Min Voice Bundle (₦)</label>
                          <input
                            type="number"
                            value={rate5MinVoice}
                            onChange={(e) => setRate5MinVoice(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block">3 Min Video Bundle (₦)</label>
                          <input
                            type="number"
                            value={rate3MinVideo}
                            onChange={(e) => setRate3MinVideo(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block">5 Min Video Bundle (₦)</label>
                          <input
                            type="number"
                            value={rate5MinVideo}
                            onChange={(e) => setRate5MinVideo(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        VIP 24h Direct Priority Chat Access (₦)
                      </label>
                      <input
                        type="number"
                        value={rateVipChat}
                        onChange={(e) => setRateVipChat(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md"
                    >
                      Save VIP Pricing & Publish
                    </button>
                  </form>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>

      {/* VIP 1-on-1 Session Booking Modal Overlay */}
      {bookingVipCreator && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 rounded-3xl p-5 w-full max-w-sm border border-purple-400 dark:border-neutral-800 shadow-2xl flex flex-col animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <img
                  src={bookingVipCreator.avatar}
                  alt={bookingVipCreator.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Book {bookingVipCreator.name}
                  </h4>
                  <p className="text-[10px] text-purple-500 font-mono">
                    VIP 1-on-1 Direct Session
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingVipCreator(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Select Session Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setVipSessionType('voice')}
                  className={`p-2 rounded-xl text-center border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    vipSessionType === 'voice'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-transparent'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Voice Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVipSessionType('video')}
                  className={`p-2 rounded-xl text-center border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    vipSessionType === 'video'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-transparent'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVipSessionType('chat')}
                  className={`p-2 rounded-xl text-center border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    vipSessionType === 'chat'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-transparent'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>VIP Chat (24h)</span>
                </button>
              </div>
            </div>

            {/* Duration Selector (for Calls) */}
            {vipSessionType !== 'chat' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Duration (Minutes / Bundles)
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {[1, 3, 5, 10].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setVipDurationMinutes(mins)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        vipDurationMinutes === mins
                          ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                          : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-transparent'
                      }`}
                    >
                      <span>{mins} Min{mins > 1 ? 's' : ''}</span>
                      {(mins === 3 || mins === 5) && (
                        <span className="block text-[8px] text-amber-300 font-normal">Bundle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price & Wallet Summary */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Total Session Fee:</span>
                <span className="font-black text-sm text-purple-600 dark:text-purple-400 font-mono">
                  ₦{calculateVipPrice(bookingVipCreator, vipSessionType, vipDurationMinutes).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Wallet Balance:</span>
                <span className="font-mono text-slate-200 font-semibold">₦{wallet.availableBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              disabled={vipBookingProcessing}
              onClick={handleConfirmVipBooking}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {vipBookingProcessing ? (
                <span>Connecting with {bookingVipCreator.name.split(' ')[0]}...</span>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>
                    Pay ₦{calculateVipPrice(bookingVipCreator, vipSessionType, vipDurationMinutes).toLocaleString()} & Start Session
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scannable Ticket QR Pass Modal Overlay */}
      {activeTicketQrModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 rounded-3xl p-5 w-full max-w-sm border border-purple-300 dark:border-neutral-800 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase mb-2">
              Valid Entry Pass ✓
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {activeTicketQrModal.title}
            </h4>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              {activeTicketQrModal.date} · {activeTicketQrModal.time}
            </p>

            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 my-4">
              <QrCode className="w-36 h-36 text-purple-950" />
            </div>

            <div className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 mb-3">
              Entry PIN: <span className="text-purple-600 dark:text-purple-400">{activeTicketQrModal.ticketPin}</span>
            </div>

            <p className="text-[10px] text-slate-400 mb-4">
              Show this QR code at the gate or livestream checkpoint. Single scan validation.
            </p>

            <button
              type="button"
              onClick={() => setActiveTicketQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              Done / Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
