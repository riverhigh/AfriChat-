import React, { useState } from 'react';
import {
  Plus,
  Eye,
  Heart,
  Clock,
  Camera,
  Video,
  Edit3,
  CheckCircle2,
  Upload,
  MessageCircle,
  Sparkles,
  Play,
  Film,
  BadgeCheck,
  Crown,
  Lock,
  Music,
  Ticket,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserStatus } from '../types';

const THOUGHT_THEMES = [
  { name: 'Indigo Dusk', bg: 'from-indigo-600 via-purple-600 to-pink-600' },
  { name: 'Emerald Palm', bg: 'from-emerald-600 to-teal-800' },
  { name: 'Sunset Lagos', bg: 'from-amber-600 via-orange-600 to-rose-700' },
  { name: 'Royal Violet', bg: 'from-purple-700 via-indigo-800 to-slate-900' },
  { name: 'Electric Cyan', bg: 'from-cyan-600 to-blue-800' },
];

export const StatusView: React.FC = () => {
  const {
    statuses,
    setActiveViewingStatus,
    addDeviceMediaStatus,
    addDeviceVideoStatus,
    addThoughtStatus,
    currentUser,
    creators,
    creatorPosts,
    setIsCreatorModalOpen,
    t,
  } = useApp();

  const [modalMode, setModalMode] = useState<'none' | 'device_photo' | 'device_video' | 'thought'>('none');
  const [showAddStoryMenu, setShowAddStoryMenu] = useState(false);
  const [deviceMediaPreview, setDeviceMediaPreview] = useState<string>('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [thoughtText, setThoughtText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(THOUGHT_THEMES[0]);

  const myStatus = statuses.find((s) => s.isMe);
  const otherStatuses = statuses.filter((s) => !s.isMe);

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setDeviceMediaPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostDevicePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceMediaPreview) {
      alert('Please choose a photo from your device');
      return;
    }

    addDeviceMediaStatus(mediaCaption.trim() || 'Photo Status 📸', deviceMediaPreview, 'image');
    setDeviceMediaPreview('');
    setMediaCaption('');
    setModalMode('none');
  };

  const handlePostDeviceVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceMediaPreview) {
      alert('Please choose a video from your device');
      return;
    }

    addDeviceVideoStatus(mediaCaption.trim() || 'Video Status 🎥', deviceMediaPreview);
    setDeviceMediaPreview('');
    setMediaCaption('');
    setModalMode('none');
  };

  const handlePostThought = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thoughtText.trim()) {
      alert('Please type your thought yarn');
      return;
    }

    addThoughtStatus(thoughtText.trim(), selectedTheme.bg);
    setThoughtText('');
    setModalMode('none');
  };

  return (
    <div className="flex flex-col pb-24 bg-white dark:bg-black text-slate-900 dark:text-white min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-neutral-800">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
            Updates
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            24h Status Stories: Photo, Video & Thought Bubbles
          </p>
        </div>

        {/* Unified Add Update Button */}
        <button
          onClick={() => setShowAddStoryMenu(true)}
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          title="Add Status Story"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Story</span>
        </button>
      </div>

      {/* My Status Section */}
      <div className="p-3 border-b border-slate-100 dark:border-neutral-800">
        <div
          onClick={() => {
            if (myStatus) {
              setActiveViewingStatus(myStatus);
            } else {
              setShowAddStoryMenu(true);
            }
          }}
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-full p-0.5 border-2 border-purple-600">
                <img
                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt="My status"
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddStoryMenu(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center border-2 border-white dark:border-black shadow-xs transition-transform active:scale-95"
                title="Add Photo, Video or Thought"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  {t('myStatus')}
                </h3>
                {currentUser.verificationBadge && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      currentUser.verificationBadge === 'gold'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    <span>{currentUser.verificationBadge === 'gold' ? 'Gold Creator' : 'Blue Host'}</span>
                  </span>
                )}
              </div>
              {myStatus ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                    <Eye className="w-3.5 h-3.5" /> {myStatus.viewsCount} views
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    <Heart className="w-3.5 h-3.5 fill-rose-500" /> {myStatus.likesCount} likes
                  </span>
                  {myStatus.videoUrl && (
                    <>
                      <span>·</span>
                      <span className="text-[10px] font-mono text-purple-600 font-bold">VIDEO</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Tap plus sign to add a Photo, Video or Thought Bubble
                </p>
              )}
            </div>
          </div>

          {myStatus && (
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3" />
              <span>{myStatus.expiresInHours}h left</span>
            </span>
          )}
        </div>
      </div>

      {/* Subscribed & Followed Creators Updates Tray */}
      <div className="p-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/60">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Followed & Subscribed Creators</span>
          </span>
          <button
            onClick={() => setIsCreatorModalOpen(true)}
            className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
          >
            Explore Hub →
          </button>
        </div>

        {creators.some((c) => c.isSubscribedByMe || c.isFollowedByMe) ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {creators
              .filter((c) => c.isSubscribedByMe || c.isFollowedByMe)
              .map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => setIsCreatorModalOpen(true)}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-purple-600 to-pink-500 shadow-xs group-hover:scale-105 transition-transform">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-13 h-13 rounded-full object-cover border-2 border-white dark:border-black"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-black">
                      <Crown className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-white max-w-[68px] truncate text-center">
                    {creator.name.split(' ')[0]}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    {creator.isSubscribedByMe ? 'VIP' : 'Following'}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 bg-purple-50/70 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-900/30">
            <div className="text-[11px] text-slate-600 dark:text-neutral-300">
              Follow top African creators to see their 24h stories and VIP drops here.
            </div>
            <button
              type="button"
              onClick={() => setIsCreatorModalOpen(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 ml-2 shadow-xs"
            >
              Follow Creators
            </button>
          </div>
        )}
      </div>

      {/* Statuses Feed */}
      <div className="p-3 space-y-3">
        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t('recentUpdates')}
        </div>

        <div className="space-y-3">
          {/* Subscribed & Followed Creators Feed Drops */}
          {creatorPosts
            .filter((p) => {
              const c = creators.find((cr) => cr.id === p.creatorId);
              return c?.isSubscribedByMe || c?.isFollowedByMe;
            })
            .map((post) => {
              const creator = creators.find((c) => c.id === post.creatorId);
              return (
                <div
                  key={post.id}
                  onClick={() => setIsCreatorModalOpen(true)}
                  className="p-3.5 rounded-3xl bg-gradient-to-br from-purple-950/20 via-slate-50 to-pink-950/10 dark:from-purple-950/40 dark:via-neutral-900 dark:to-neutral-950 border border-purple-500/30 cursor-pointer shadow-2xs hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={creator?.avatar || post.creatorAvatar}
                          alt={post.creatorName}
                          className="w-9 h-9 rounded-full object-cover border border-purple-500/40"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Crown className="w-2 h-2" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {post.creatorName}
                          </span>
                          <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded-full">
                            {creator?.isSubscribedByMe ? 'VIP Story' : 'Creator Story'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {post.createdAt} · Verified African Creator
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      {post.mediaType === 'audio_leak' ? '🎵 Studio Leak' : '🌟 VIP Drop'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden max-h-48 border border-purple-500/20">
                      <img
                        src={post.mediaUrl}
                        alt="VIP Post Media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                      Tap to open VIP Hub & Leaks
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-rose-500">
                        <Heart className="w-3 h-3 fill-rose-500" /> {post.likesCount}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          {otherStatuses.map((status: UserStatus) => {
            const isThought = status.statusType === 'thought';
            const isVideo = status.statusType === 'video' || Boolean(status.videoUrl);

            if (isThought) {
              return (
                /* Thought Bubble Card in Feed */
                <div
                  key={status.id}
                  onClick={() => setActiveViewingStatus(status)}
                  className="p-4 rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 cursor-pointer shadow-2xs hover:shadow-md transition-all relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={status.userAvatar}
                        alt={status.userName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-neutral-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {status.userName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {status.createdAt} · {status.expiresInHours}h left
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Thought</span>
                    </span>
                  </div>

                  {/* Visual Thought Bubble */}
                  <div
                    className={`p-4 rounded-2xl bg-gradient-to-br ${
                      status.thoughtBg || 'from-indigo-600 via-purple-600 to-pink-600'
                    } text-white shadow-sm relative`}
                  >
                    <p className="text-sm font-semibold leading-relaxed">
                      &ldquo;{status.caption}&rdquo;
                    </p>

                    {/* Small Thought Bubble Tail Dots */}
                    <div className="flex items-center gap-1 mt-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                    </div>
                  </div>

                  {/* Likes counter */}
                  <div className="flex items-center justify-between mt-2 pt-1 text-xs text-slate-400 font-mono">
                    <span className="text-[11px] text-slate-400">Tap to open full story</span>
                    <span className="flex items-center gap-1">
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          status.hasLikedByMe ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                        }`}
                      />
                      <span>{status.likesCount}</span>
                    </span>
                  </div>
                </div>
              );
            }

            /* Video or Photo Media Status */
            return (
              <div
                key={status.id}
                onClick={() => setActiveViewingStatus(status)}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60 rounded-2xl cursor-pointer transition-colors border border-slate-200/60 dark:border-neutral-800"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <div className="w-13 h-13 rounded-full p-0.5 border-2 border-purple-600 shrink-0">
                      <img
                        src={status.userAvatar}
                        alt={status.userName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    {isVideo && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-black">
                        <Play className="w-2 h-2 fill-current ml-0.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {status.userName}
                      </h4>
                      {isVideo && (
                        <span className="text-[9px] font-mono font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded">
                          VIDEO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                      {status.caption}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{status.createdAt}</span>
                      <span>·</span>
                      <span>{status.expiresInHours}h left</span>
                    </div>
                  </div>
                </div>

                {/* Media thumbnail */}
                {status.mediaUrl && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-neutral-800 shrink-0 ml-2">
                    <img
                      src={status.mediaUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    {isVideo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: PHOTO STATUS (DEVICE UPLOAD) */}
      {modalMode === 'device_photo' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>Upload Photo Status</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select a photo from your camera or device gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handlePostDevicePhoto} className="space-y-3.5">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:border-purple-600 transition-colors">
                {deviceMediaPreview ? (
                  <img
                    src={deviceMediaPreview}
                    alt="Preview"
                    className="max-h-48 rounded-xl object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                      Tap to Choose Photo
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP (Camera or Gallery)
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDeviceFileUpload(e, false)}
                  className="hidden"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-1">
                  Photo Caption
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="e.g. Balogun market fresh bale unpacking! 📸"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                disabled={!deviceMediaPreview}
                className="w-full py-2.5 bg-purple-600 disabled:opacity-50 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Publish Photo Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIDEO STATUS (DEVICE VIDEO UPLOAD) */}
      {modalMode === 'device_video' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-purple-600" />
                  <span>Upload Video Status</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select a video clip from camera or storage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handlePostDeviceVideo} className="space-y-3.5">
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:border-purple-600 transition-colors">
                {deviceMediaPreview ? (
                  <video
                    src={deviceMediaPreview}
                    controls
                    autoPlay
                    loop
                    className="max-h-48 rounded-xl object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center py-4">
                    <Video className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                      Tap to Choose Video Clip
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      MP4, MOV, WEBM (Short video reels)
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleDeviceFileUpload(e, true)}
                  className="hidden"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-1">
                  Video Caption
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="e.g. Live at the mechanic workshop! Engine sounding brand new 🎥"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                disabled={!deviceMediaPreview}
                className="w-full py-2.5 bg-purple-600 disabled:opacity-50 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Publish Video Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SHARE A THOUGHT (THOUGHT BUBBLE) */}
      {modalMode === 'thought' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Post a Thought Bubble</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Displays as an authentic cloud thought bubble in updates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handlePostThought} className="space-y-3.5">
              {/* Live Preview Thought Bubble */}
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br ${selectedTheme.bg} text-white shadow-lg text-center space-y-2`}
              >
                <div className="text-[9px] uppercase tracking-widest font-mono text-white/70">
                  💭 Bubble Preview
                </div>
                <p className="text-base font-bold min-h-[48px] flex items-center justify-center leading-snug">
                  {thoughtText.trim() ? `"${thoughtText}"` : 'Type your thoughts below...'}
                </p>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-1.5">
                  Choose Bubble Gradient
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {THOUGHT_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => setSelectedTheme(theme)}
                      className={`h-7 px-2.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${theme.bg} shrink-0 border-2 transition-transform ${
                        selectedTheme.name === theme.name ? 'border-white scale-105 shadow-xs' : 'border-transparent opacity-75'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thought Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-1">
                  Your Thought
                </label>
                <textarea
                  rows={3}
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="e.g. Lagos traffic today is something else 😩🚗 or Market restocked!"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Publish Thought Bubble
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Story Action Sheet: Photo, Video & Thought Bubble Chooser */}
      {showAddStoryMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setShowAddStoryMenu(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add 24h Status Story
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Visible to contacts for 24 hours
                </p>
              </div>
              <button
                onClick={() => setShowAddStoryMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddStoryMenu(false);
                  setModalMode('device_photo');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 hover:border-purple-500/50 transition-all text-center group"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Photo / Camera
                </span>
                <span className="text-[9px] text-slate-400">
                  From device
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddStoryMenu(false);
                  setModalMode('device_video');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 hover:border-purple-500/50 transition-all text-center group"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Video Story
                </span>
                <span className="text-[9px] text-slate-400">
                  Short video
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddStoryMenu(false);
                  setModalMode('thought');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 hover:border-purple-500/50 transition-all text-center group"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Thought
                </span>
                <span className="text-[9px] text-slate-400">
                  Color gradient
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
