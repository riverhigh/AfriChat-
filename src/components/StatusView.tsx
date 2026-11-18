import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Plus,
  Eye,
  Heart,
  Camera,
  Video,
  Edit3,
  Upload,
  Sparkles,
  Film,
  Crown,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
  Megaphone,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { useApp, phonesMatch, isStatusExpiredClient } from '../context/AppContext';
import { UserStatus } from '../types';
import { compressChatMediaImage } from '../utils/imageUtils';

const OutsideModal = React.lazy(() =>
  import('./OutsideModal').then((m) => ({ default: m.OutsideModal }))
);

const THOUGHT_THEMES = [
  { name: 'Indigo Dusk', bg: 'from-indigo-600 via-purple-600 to-pink-600' },
  { name: 'Emerald Palm', bg: 'from-emerald-600 to-teal-800' },
  { name: 'Sunset Lagos', bg: 'from-amber-600 via-orange-600 to-rose-700' },
  { name: 'Royal Violet', bg: 'from-purple-700 via-indigo-800 to-slate-900' },
  { name: 'Electric Cyan', bg: 'from-cyan-600 to-blue-800' },
];

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%232e1065'/><circle cx='50' cy='38' r='16' fill='%23a855f7'/><path d='M20 86c0-16.5 13.5-30 30-30s30 13.5 30 30' fill='%23a855f7'/></svg>";

/** WhatsApp / Instagram style segmented story ring */
const StoryRing: React.FC<{ count: number; hasUnviewed: boolean; size?: number }> = ({
  count,
  hasUnviewed,
  size = 56,
}) => {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = count > 1 ? 4 : 0;
  const segmentLength = circumference / count - gap;
  const strokeColor = hasUnviewed ? '#8b5cf6' : '#94a3b8';

  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90 pointer-events-none">
      {count <= 1 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      ) : (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${Math.max(1, segmentLength)} ${gap}`}
        />
      )}
    </svg>
  );
};

interface ContactStoryGroup {
  key: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isCreator: boolean;
  statuses: UserStatus[];
  latestStatus: UserStatus;
  hasUnviewed: boolean;
}

export const StatusView: React.FC = () => {
  const {
    statuses,
    setActiveViewingStatus,
    markStatusViewed,
    addDeviceMediaStatus,
    addDeviceVideoStatus,
    addThoughtStatus,
    addSponsoredStatus,
    deleteStatus,
    currentUser,
    creators,
    creatorPosts,
    setIsCreatorModalOpen,
    deviceContacts,
    setIsContactsModalOpen,
    setIsSecurityModalOpen,
    securitySettings,
    systemConfig,
    cmsData,
    t,
  } = useApp();

  const [modalMode, setModalMode] = useState<'none' | 'device_photo' | 'device_video' | 'thought' | 'sponsored_ad'>('none');
  const [showAddStoryMenu, setShowAddStoryMenu] = useState(false);
  const [showOutsideModal, setShowOutsideModal] = useState(false);
  const [showMyStoriesTray, setShowMyStoriesTray] = useState(false);
  const [isViewedExpanded, setIsViewedExpanded] = useState(true);

  const [deviceMediaPreview, setDeviceMediaPreview] = useState<string>('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [thoughtText, setThoughtText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(THOUGHT_THEMES[0]);

  // Sponsored Ad Creation Fields
  const [adBrand, setAdBrand] = useState(currentUser.fullName || '');
  const [adCaption, setAdCaption] = useState('');
  const [adCtaLabel, setAdCtaLabel] = useState('Shop Now');
  const [adTargetUrl, setAdTargetUrl] = useState('');
  const [adPaymentPin, setAdPaymentPin] = useState('');
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [adSubmittedNotice, setAdSubmittedNotice] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const myStatuses = useMemo(
    () => statuses.filter((s) => s.isMe && !s.isSponsored && !isStatusExpiredClient(s, nowMs)),
    [statuses, nowMs]
  );

  const myPendingAds = useMemo(() => {
    const rawAds = Array.isArray(cmsData?.sponsoredStatuses) ? cmsData.sponsoredStatuses : [];
    const myPhone = (currentUser.phoneNumber || '').replace(/\D/g, '').slice(-9);
    return rawAds.filter((a: any) => {
      if (a.approvalStatus !== 'pending' && a.status !== 'pending') return false;
      if (!myPhone) return false;
      const adPhone = String(a.submittedByPhone || '').replace(/\D/g, '').slice(-9);
      return adPhone === myPhone;
    });
  }, [cmsData?.sponsoredStatuses, currentUser.phoneNumber]);

  // Sponsored status ads only show admin-approved live ads (no synthetic/unapproved fallback)
  const sponsoredStatuses = useMemo(() => {
    return statuses.filter(
      (s) =>
        !isStatusExpiredClient(s, nowMs) &&
        Boolean(s.isSponsored || s.statusType === 'sponsored') &&
        s.approvalStatus !== 'pending' &&
        s.approvalStatus !== 'rejected'
    );
  }, [statuses, nowMs]);

  // Strict Privacy for personal stories: only show non-sponsored statuses from saved device contacts
  const otherStatuses = useMemo(() => {
    return statuses.filter((s) => {
      if (s.isMe || s.isSponsored || s.statusType === 'sponsored') return false;
      if (isStatusExpiredClient(s, nowMs)) return false;
      if (!s.userPhone) return false;
      return deviceContacts.some((c) => {
        const cp = c.normalizedPhoneNumber || c.rawPhoneNumber;
        return phonesMatch(s.userPhone, cp);
      });
    });
  }, [statuses, deviceContacts, nowMs]);

  const getStatusTimeLeft = (s: { id?: string; expiresAt?: string; createdAtISO?: string; createdAt?: string; expiresInHours?: number }): string => {
    let expiresAt = s.expiresAt ? new Date(s.expiresAt).getTime() : NaN;
    if (isNaN(expiresAt)) {
      const expiresInHours = s.expiresInHours ?? 24;
      let createdMs = 0;
      if (s.createdAtISO) {
        createdMs = new Date(s.createdAtISO).getTime();
      } else if (s.id) {
        const match = s.id.match(/\d{12,14}/);
        if (match) createdMs = parseInt(match[0], 10);
      }
      if (!createdMs && s.createdAt) {
        const parsed = Date.parse(s.createdAt);
        if (!isNaN(parsed)) createdMs = parsed;
      }
      if (!createdMs) return '23h left';
      expiresAt = createdMs + expiresInHours * 3_600_000;
    }
    const ms = expiresAt - nowMs;
    if (ms <= 0) return '';
    const totalMins = Math.floor(ms / 60_000);
    if (totalMins < 1) return '< 1m left';
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  const formatStatusCaption = (st: UserStatus): string => {
    if (st.isReshared || st.caption?.toLowerCase().includes('reshared')) {
      return 'reshared';
    }
    return st.caption || (st.statusType === 'thought' ? 'Thought' : 'Photo update');
  };

  const isStatusViewedByMe = (st: UserStatus) =>
    Boolean(st.viewers && st.viewers.some((v) => v.id === currentUser.id));

  const { recentGroups, viewedGroups } = useMemo(() => {
    const groupsMap = new Map<string, ContactStoryGroup>();

    otherStatuses.forEach((st) => {
      const key = st.userId || st.userName;
      const unviewed = !isStatusViewedByMe(st);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          userId: st.userId,
          userName: st.userName,
          userAvatar: st.userAvatar || FALLBACK_AVATAR,
          isCreator: creators.some(
            (c) => c.id === st.userId || c.name.toLowerCase() === st.userName.toLowerCase()
          ),
          statuses: [st],
          latestStatus: st,
          hasUnviewed: unviewed,
        });
      } else {
        const group = groupsMap.get(key)!;
        group.statuses.push(st);
        if (unviewed) group.hasUnviewed = true;
      }
    });

    const recent: ContactStoryGroup[] = [];
    const viewed: ContactStoryGroup[] = [];

    groupsMap.forEach((g) => {
      if (g.hasUnviewed) recent.push(g);
      else viewed.push(g);
    });

    return { recentGroups: recent, viewedGroups: viewed };
  }, [otherStatuses, creators, currentUser.id]);

  const totalMyViews = myStatuses.reduce((acc, s) => acc + (s.viewsCount || 0), 0);

  const handleDeviceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusError(null);

    if (isVideo) {
      if (file.size > 20 * 1024 * 1024) {
        setStatusError('Video exceeds 20MB limit. Choose a shorter clip.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setDeviceMediaPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const compressed = await compressChatMediaImage(file);
        setDeviceMediaPreview(compressed);
      } catch (err) {
        console.warn('Status photo compression notice:', err);
      }
    }
  };

  const handlePostDevicePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceMediaPreview) {
      setStatusError('Please select a photo from your device.');
      return;
    }
    addDeviceMediaStatus(mediaCaption.trim() || 'Photo Status', deviceMediaPreview, 'image');
    setDeviceMediaPreview('');
    setMediaCaption('');
    setStatusError(null);
    setModalMode('none');
  };

  const handlePostDeviceVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceMediaPreview) {
      setStatusError('Please select a video clip.');
      return;
    }
    addDeviceVideoStatus(mediaCaption.trim() || 'Video Status', deviceMediaPreview);
    setDeviceMediaPreview('');
    setMediaCaption('');
    setStatusError(null);
    setModalMode('none');
  };

  const handlePostThought = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thoughtText.trim()) {
      setStatusError('Please enter your thought before publishing.');
      return;
    }
    addThoughtStatus(thoughtText.trim(), selectedTheme.bg);
    setThoughtText('');
    setStatusError(null);
    setModalMode('none');
  };

  const sponsoredAdFee = Number(systemConfig?.sponsoredAdFeeNgn ?? 2500);

  const handlePostSponsoredAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adBrand.trim() || !adCaption.trim()) {
      setStatusError('Enter brand name and promo message.');
      return;
    }
    if (!securitySettings.hasPaymentPin) {
      setStatusError('Set your 4-digit Payment PIN in Hub → Security & Recovery first.');
      return;
    }
    if (adPaymentPin.trim().length < 4) {
      setStatusError('Enter your 4-digit Payment PIN to authorize the ad fee.');
      return;
    }
    const visualUrl = deviceMediaPreview || '/src/assets/images/lagos_tech_smartphones_1794210826603.jpg';
    setIsSubmittingAd(true);
    setStatusError(null);
    const res = await addSponsoredStatus(
      {
        brand: adBrand.trim(),
        caption: adCaption.trim(),
        mediaUrl: visualUrl,
        ctaLabel: adCtaLabel.trim() || 'Shop Now',
        targetUrl: adTargetUrl.trim() || '#market',
      },
      adPaymentPin.trim()
    );
    setIsSubmittingAd(false);
    if (!res.success) {
      setStatusError(res.message);
      return;
    }
    setDeviceMediaPreview('');
    setAdCaption('');
    setAdTargetUrl('');
    setAdPaymentPin('');
    setStatusError(null);
    setModalMode('none');
    setAdSubmittedNotice(res.message);
    setTimeout(() => setAdSubmittedNotice(null), 6000);
  };

  const openGroupStories = (group: ContactStoryGroup) => {
    const target = group.statuses.find((s) => !isStatusViewedByMe(s)) || group.statuses[0];
    setActiveViewingStatus(target);
    markStatusViewed(target.id);
  };

  const openSingleStory = (statusItem: UserStatus) => {
    setActiveViewingStatus(statusItem);
    markStatusViewed(statusItem.id);
  };

  return (
    <div className="relative flex flex-col pb-28 bg-white dark:bg-black text-slate-900 dark:text-white min-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            Updates
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            24h Stories from your contacts, creators &amp; sponsors
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowOutsideModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-300 hover:bg-purple-600/25 text-xs font-semibold transition-colors whitespace-nowrap"
            title="Discover Parties, Concerts & Events Outside"
          >
            <MapPin className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span>Outside</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusError(null);
              setDeviceMediaPreview('');
              setAdPaymentPin('');
              setModalMode('sponsored_ad');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Promote Ad</span>
          </button>
        </div>
      </div>

      {(adSubmittedNotice || myPendingAds.length > 0) && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {adSubmittedNotice
                  ? adSubmittedNotice
                  : `${myPendingAds.length} Sponsored Ad${myPendingAds.length > 1 ? 's' : ''} Pending Admin Approval`}
              </span>
            </div>
            <p className="text-[11px] opacity-80">
              Paid ads go live once approved by Admin. Rejected ads are refunded automatically to your wallet.
            </p>
          </div>
          {adSubmittedNotice && (
            <button
              type="button"
              onClick={() => setAdSubmittedNotice(null)}
              className="text-amber-500 hover:text-amber-400 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Horizontal Stories & Sponsored Ad Rings Carousel */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/40 dark:bg-zinc-950/60">
        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-1">
          {/* My Status Ring */}
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                setActiveViewingStatus(myStatuses[myStatuses.length - 1] || myStatuses[0]);
              } else {
                setShowAddStoryMenu(true);
              }
            }}
            className="flex flex-col items-center shrink-0 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-violet-500 to-purple-600 relative">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-white dark:border-zinc-950">
                <img
                  src={currentUser.avatarUrl || FALLBACK_AVATAR}
                  alt="My status"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {myStatuses.length === 0 && (
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium mt-1.5 truncate max-w-[64px]">
              My Status
            </span>
          </div>

          {/* Sponsored Ad Rings (Purple-to-Gold Gradient Ring + AD Badge) */}
          {sponsoredStatuses.map((adStatus) => (
            <div
              key={adStatus.id}
              onClick={() => openSingleStory(adStatus)}
              className="flex flex-col items-center shrink-0 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-violet-600 to-indigo-600 shadow-lg">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-white dark:border-zinc-950 relative">
                  <img
                    src={adStatus.mediaUrl || adStatus.userAvatar || FALLBACK_AVATAR}
                    alt={adStatus.sponsorBrand || 'Sponsored Ad'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-[8px] font-extrabold text-black text-center py-0.5 tracking-wider">
                    AD
                  </span>
                </div>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1.5 truncate max-w-[64px]">
                {adStatus.sponsorBrand || 'Sponsored'}
              </span>
            </div>
          ))}

          {/* Contact Story Rings (Unviewed & Viewed) */}
          {[...recentGroups, ...viewedGroups].map((group) => (
            <div
              key={group.key}
              onClick={() => openGroupStories(group)}
              className="flex flex-col items-center shrink-0 cursor-pointer"
            >
              <div
                className={`w-16 h-16 rounded-full p-0.5 ${
                  group.hasUnviewed ? 'bg-violet-500' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-white dark:border-zinc-950">
                  <img
                    src={group.userAvatar || FALLBACK_AVATAR}
                    alt={group.userName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-slate-600 dark:text-zinc-300 mt-1.5 truncate max-w-[64px]">
                {group.userName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 1. My Status Row (Quick Controls & Manage Tray) */}
      <div className="border-b border-slate-100 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-neutral-900/60 transition-colors">
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                setActiveViewingStatus(myStatuses[myStatuses.length - 1] || myStatuses[0]);
              } else {
                setShowAddStoryMenu(true);
              }
            }}
            className="flex items-center gap-3.5 flex-1 cursor-pointer min-w-0"
          >
            <div className="relative shrink-0 w-13 h-13 flex items-center justify-center">
              {myStatuses.length > 0 ? (
                <>
                  <StoryRing count={myStatuses.length} hasUnviewed={true} size={52} />
                  <img
                    src={currentUser.avatarUrl || FALLBACK_AVATAR}
                    alt="My status"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover"
                  />
                </>
              ) : (
                <div className="relative w-12 h-12">
                  <img
                    src={currentUser.avatarUrl || FALLBACK_AVATAR}
                    alt="My status"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-purple-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-black">
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {t('myStatus')}
                </h3>
                {myStatuses.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    · {myStatuses.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                {myStatuses.length > 0
                  ? `${myStatuses.length} story${myStatuses.length > 1 ? 's' : ''} · ${totalMyViews} views`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {myStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMyStoriesTray(!showMyStoriesTray)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                title="Manage my stories"
              >
                {showMyStoriesTray ? 'Hide' : 'Manage'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalMode('thought')}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-600 flex items-center justify-center transition-all"
              title="Write Thought / Text Status"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalMode('device_photo')}
              className="w-10 h-10 rounded-full bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center transition-all shadow-xs"
              title="Take or Upload Photo / Video"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manage My Stories Tray */}
        {myStatuses.length > 0 && showMyStoriesTray && (
          <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-neutral-800/60 bg-slate-50/50 dark:bg-neutral-950/40">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {myStatuses.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setActiveViewingStatus(st)}
                  className="shrink-0 flex items-center gap-2 p-1.5 pr-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl hover:border-purple-500/50 cursor-pointer shadow-2xs transition-all"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-purple-600/10 flex items-center justify-center shrink-0">
                    {st.statusType === 'thought' ? (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${
                          st.thoughtBg || 'from-indigo-600 to-purple-600'
                        } flex items-center justify-center text-xs text-white font-bold`}
                      >
                        Aa
                      </div>
                    ) : st.videoUrl || st.statusType === 'video' ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-xs">
                        <Film className="w-4 h-4" />
                      </div>
                    ) : st.mediaUrl ? (
                      <img src={st.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-4 h-4 text-purple-500" />
                    )}
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate max-w-[90px]">
                      {formatStatusCaption(st)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <span>{getStatusTimeLeft(st)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                        <Eye className="w-3 h-3" /> {st.viewsCount}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStatus(st.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                    title="Delete story"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sponsored Feed Cards (Promoted System & Vendor Stories) */}
      {sponsoredStatuses.length > 0 && (
        <div className="border-b border-slate-100 dark:border-neutral-800">
          <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tracking-wide">
              Sponsored Promotions
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {sponsoredStatuses.length} active
            </span>
          </div>
          <div className="divide-y divide-slate-100/80 dark:divide-neutral-900">
            {sponsoredStatuses.map((ad) => (
              <div
                key={ad.id}
                onClick={() => openSingleStory(ad)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-violet-600 to-indigo-600 shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-white dark:border-zinc-950 relative">
                      <img
                        src={ad.mediaUrl || ad.userAvatar || FALLBACK_AVATAR}
                        alt={ad.sponsorBrand || ad.userName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-[7px] font-extrabold text-black text-center">
                        AD
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                        {ad.sponsorBrand || ad.userName}
                      </h4>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        · Sponsored
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                      {ad.caption}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 ml-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  <span>{ad.ctaLabel || 'View'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Recent Updates Section (Unviewed Contacts) */}
      <div className="mt-2">
        <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-neutral-400 tracking-wide">
          {t('recentUpdates')}
        </div>

        {recentGroups.length > 0 ? (
          <div className="divide-y divide-slate-100/80 dark:divide-neutral-900">
            {recentGroups.map((group) => (
              <div
                key={group.key}
                onClick={() => openGroupStories(group)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0 w-13 h-13 flex items-center justify-center">
                    <StoryRing count={group.statuses.length} hasUnviewed={true} size={52} />
                    <img
                      src={group.userAvatar}
                      alt={group.userName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {group.userName}
                      </h4>
                      {group.isCreator && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          · VIP
                        </span>
                      )}
                      {group.statuses.length > 1 && (
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                          ({group.statuses.length})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                      {formatStatusCaption(group.latestStatus)}
                    </p>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                      {getStatusTimeLeft(group.latestStatus)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
            <p>No recent status updates from your contacts.</p>
            <button
              type="button"
              onClick={() => setIsContactsModalOpen(true)}
              className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-block"
            >
              Sync Phone Contacts to see friends&apos; stories
            </button>
          </div>
        )}
      </div>

      {/* 3. Viewed Updates Section */}
      {viewedGroups.length > 0 && (
        <div className="mt-2 border-t border-slate-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setIsViewedExpanded(!isViewedExpanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400 tracking-wide hover:bg-slate-50 dark:hover:bg-neutral-900/40 transition-colors"
          >
            <span>Viewed updates ({viewedGroups.length})</span>
            {isViewedExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isViewedExpanded && (
            <div className="divide-y divide-slate-100/80 dark:divide-neutral-900 opacity-80">
              {viewedGroups.map((group) => (
                <div
                  key={group.key}
                  onClick={() => openGroupStories(group)}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0 w-13 h-13 flex items-center justify-center">
                      <StoryRing count={group.statuses.length} hasUnviewed={false} size={52} />
                      <img
                        src={group.userAvatar}
                        alt={group.userName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover grayscale-20"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-neutral-200 truncate">
                          {group.userName}
                        </h4>
                        {group.statuses.length > 1 && (
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            ({group.statuses.length})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                        {formatStatusCaption(group.latestStatus)}
                      </p>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        {getStatusTimeLeft(group.latestStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Followed Creators VIP Drops Tray */}
      {creators.some((c) => c.isSubscribedByMe || c.isFollowedByMe) && (
        <div className="mt-4 px-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 tracking-wide flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Channels &amp; VIP Creators</span>
            </span>
            <button
              onClick={() => setIsCreatorModalOpen(true)}
              className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              Explore →
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {creators
              .filter((c) => c.isSubscribedByMe || c.isFollowedByMe)
              .map((creator) => {
                const crStatus = statuses.find(
                  (s) => s.userId === creator.id || s.userName.toLowerCase().includes(creator.name.toLowerCase())
                );
                return (
                  <div
                    key={creator.id}
                    onClick={() => {
                      if (crStatus) {
                        setActiveViewingStatus(crStatus);
                        markStatusViewed(crStatus.id);
                      } else {
                        setIsCreatorModalOpen(true);
                      }
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                  >
                    <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 shadow-2xs group-hover:scale-105 transition-transform">
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-black"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-black">
                        <Crown className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-white max-w-[64px] truncate text-center">
                      {creator.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 5. Creator VIP Drops Feed */}
      {creatorPosts.filter((p) => {
        const c = creators.find((cr) => cr.id === p.creatorId);
        return c?.isSubscribedByMe || c?.isFollowedByMe;
      }).length > 0 && (
        <div className="mt-4 px-3 pb-2 border-t border-slate-100 dark:border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 tracking-wide flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>VIP Creator Drops</span>
            </span>
            <button
              onClick={() => setIsCreatorModalOpen(true)}
              className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              Open Hub →
            </button>
          </div>

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
                  className="p-3.5 rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 cursor-pointer hover:border-purple-500/40 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={creator?.avatar || post.creatorAvatar}
                        alt={post.creatorName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {post.creatorName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {post.createdAt} · {creator?.isSubscribedByMe ? 'VIP Story' : 'Creator Story'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      {post.mediaType === 'audio_leak' ? 'Studio Leak' : 'VIP Drop'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden max-h-48">
                      <img
                        src={post.mediaUrl}
                        alt="VIP Post Media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                      Tap to open VIP Hub &amp; Leaks
                    </span>
                    <span className="flex items-center gap-1 text-rose-500">
                      <Heart className="w-3 h-3 fill-rose-500" /> {post.likesCount}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-5 flex flex-col items-center gap-3 z-30">
        <button
          type="button"
          onClick={() => setModalMode('thought')}
          className="w-11 h-11 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:text-purple-600 shadow-md flex items-center justify-center border border-slate-200 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-all"
          title="Write Thought Status"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setModalMode('device_photo')}
          className="w-13 h-13 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Add Photo or Video Status"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* MODAL 1: PHOTO STATUS */}
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
                  Select a photo from your camera or gallery
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

            {statusError && (
              <p className="text-xs text-rose-500 font-medium">{statusError}</p>
            )}

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
                      JPG, PNG, WEBP (Compressed client-side)
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
                  placeholder="Type a caption..."
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

      {/* MODAL 2: VIDEO STATUS */}
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
                  Select a video clip (max 20MB)
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

            {statusError && (
              <p className="text-xs text-rose-500 font-medium">{statusError}</p>
            )}

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
                  placeholder="Type a video caption..."
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

      {/* MODAL 3: THOUGHT BUBBLE */}
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
                  Displays as a 24h gradient thought card
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

            {statusError && (
              <p className="text-xs text-rose-500 font-medium">{statusError}</p>
            )}

            <form onSubmit={handlePostThought} className="space-y-3.5">
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br ${selectedTheme.bg} text-white shadow-lg text-center space-y-2`}
              >
                <p className="text-base font-bold min-h-[48px] flex items-center justify-center leading-snug">
                  {thoughtText.trim() ? `"${thoughtText}"` : 'Type your thoughts below...'}
                </p>
              </div>

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
                      className={`h-7 px-2.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${
                        theme.bg
                      } shrink-0 border-2 transition-transform ${
                        selectedTheme.name === theme.name
                          ? 'border-white scale-105 shadow-xs'
                          : 'border-transparent opacity-75'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-1">
                  Your Thought
                </label>
                <textarea
                  rows={3}
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="Share what is happening right now..."
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

      {/* MODAL 4: SPONSORED VENDOR AD */}
      {modalMode === 'sponsored_ad' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-amber-500/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  <span>Publish Sponsored Status Ad</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Broadcast a vendor promotion with click tracking
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

            {statusError && (
              <p className="text-xs text-rose-500 font-medium">{statusError}</p>
            )}

            <form onSubmit={handlePostSponsoredAd} className="space-y-3">
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-500/40 rounded-2xl cursor-pointer hover:border-amber-500 transition-colors">
                {deviceMediaPreview ? (
                  <img
                    src={deviceMediaPreview}
                    alt="Ad Preview"
                    className="max-h-36 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-6 h-6 text-amber-500 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                      Upload Ad Banner (optional)
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

              <input
                type="text"
                value={adBrand}
                onChange={(e) => setAdBrand(e.target.value)}
                placeholder="Brand or Store Name"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <textarea
                rows={2}
                value={adCaption}
                onChange={(e) => setAdCaption(e.target.value)}
                placeholder="Promotional copy (e.g., 20% off Lagos Weekend Drop)"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={adCtaLabel}
                  onChange={(e) => setAdCtaLabel(e.target.value)}
                  placeholder="CTA (e.g. Shop Now)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={adTargetUrl}
                  onChange={(e) => setAdTargetUrl(e.target.value)}
                  placeholder="https://... or #market"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">24h Promotion Fee</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    ₦{sponsoredAdFee.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Debited from your wallet upon submission. Goes live after Admin Approval (full auto-refund if declined).
                </p>
                {!securitySettings.hasPaymentPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('none');
                      setIsSecurityModalOpen(true);
                    }}
                    className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                  >
                    Set Security Questions &amp; Payment PIN in Hub
                  </button>
                ) : (
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={adPaymentPin}
                    onChange={(e) => setAdPaymentPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-digit Payment PIN to confirm"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-black border border-amber-500/40 rounded-xl text-xs font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingAd || !securitySettings.hasPaymentPin}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-violet-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {isSubmittingAd
                  ? 'Processing Payment...'
                  : `Pay ₦${sponsoredAdFee.toLocaleString()} & Submit for Approval`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Story Action Sheet */}
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
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Photo
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddStoryMenu(false);
                  setModalMode('device_video');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Video
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddStoryMenu(false);
                  setModalMode('thought');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-neutral-800 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Thought
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showOutsideModal && (
        <Suspense fallback={null}>
          <OutsideModal
            isOpen={showOutsideModal}
            onClose={() => setShowOutsideModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
