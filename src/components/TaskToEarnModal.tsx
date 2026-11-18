import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Coins,
  Search,
  RefreshCw,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Youtube,
  Instagram,
  Music,
  Smartphone,
  Share2,
  Globe,
  ShieldCheck,
  Wallet,
  AlertCircle,
  Image as ImageIcon,
  ZoomIn,
  Undo2,
  Users,
  AtSign,
} from 'lucide-react';
import { useApp, phonesMatch } from '../context/AppContext';
import { TaskBountyCampaign, TaskBountyCategory } from '../types';
import { getSocket } from '../services/socket';
import { compressImageToBudget } from '../utils/imageUtils';

type ModalTab = 'earn' | 'create' | 'activity';
type SplitMode = 'by_payout' | 'by_people' | 'custom';

const CATEGORY_META: Record<
  TaskBountyCategory,
  { label: string; defaultHint: string }
> = {
  youtube: { label: 'YouTube', defaultHint: 'YouTube @handle' },
  instagram: { label: 'Instagram', defaultHint: 'Instagram @username' },
  tiktok: { label: 'TikTok', defaultHint: 'TikTok @handle' },
  twitter: { label: 'X / Twitter', defaultHint: 'X @username' },
  music: { label: 'Music Stream', defaultHint: 'Spotify / Apple Music Name' },
  app: { label: 'App Review', defaultHint: 'App Store / Play Store Name' },
  other: { label: 'Other Task', defaultHint: 'Platform Username' },
};

const QUICK_STAKES = [5000, 10000, 50000, 100000];

const getSafeExternalUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
};

const renderCategoryIcon = (cat: TaskBountyCategory, className = 'w-4 h-4') => {
  switch (cat) {
    case 'youtube':
      return <Youtube className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <Share2 className={className} />;
    case 'twitter':
      return <AtSign className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'app':
      return <Smartphone className={className} />;
    default:
      return <Globe className={className} />;
  }
};

export const TaskToEarnModal: React.FC = () => {
  const {
    isTaskEarnModalOpen,
    setIsTaskEarnModalOpen,
    currentUser,
    wallet,
    refreshWalletFromServer,
    setIsWalletModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ModalTab>('earn');
  const [tasks, setTasks] = useState<TaskBountyCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskBountyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Proof submission state (per selected task)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [proofUsername, setProofUsername] = useState('');
  const [proofScreenshot, setProofScreenshot] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [compressingImg, setCompressingImg] = useState(false);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Create campaign form state
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState<TaskBountyCategory>('youtube');
  const [createTargetUrl, setCreateTargetUrl] = useState('');
  const [createHandleHint, setCreateHandleHint] = useState(CATEGORY_META.youtube.defaultHint);
  const [createInstructions, setCreateInstructions] = useState('');
  const [createStake, setCreateStake] = useState<string>('100000');
  const [splitMode, setSplitMode] = useState<SplitMode>('by_payout');
  const [payoutInput, setPayoutInput] = useState<string>('100');
  const [peopleInput, setPeopleInput] = useState<string>('100');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Close & refund confirmation state
  const [confirmCloseTaskId, setConfirmCloseTaskId] = useState<string | null>(null);
  const [closingTaskId, setClosingTaskId] = useState<string | null>(null);

  const showNotice = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice({ text, tone });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const phone = encodeURIComponent(currentUser?.phoneNumber || '');
      const res = await fetch(`/api/tasks?viewerPhone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.tasks)) {
          setTasks(data.tasks);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [currentUser?.phoneNumber]);

  useEffect(() => {
    if (!isTaskEarnModalOpen) return;
    fetchTasks();
    const socket = getSocket();
    const onUpdated = () => {
      fetchTasks();
    };
    socket?.on('task_bounties_updated', onUpdated);
    return () => {
      socket?.off('task_bounties_updated', onUpdated);
    };
  }, [isTaskEarnModalOpen, fetchTasks]);

  // Keep handle hint synced when category changes unless customized
  const handleCategoryChange = (nextCat: TaskBountyCategory) => {
    const prevDefault = CATEGORY_META[createCategory]?.defaultHint;
    if (!createHandleHint.trim() || createHandleHint === prevDefault) {
      setCreateHandleHint(CATEGORY_META[nextCat].defaultHint);
    }
    setCreateCategory(nextCat);
  };

  // Live 70/30 economics calculation
  const stakeEconomics = useMemo(() => {
    const totalStake = Math.max(0, Math.round(Number(createStake) || 0));
    const systemFeeBase = Math.round(totalStake * 0.3);
    const rewardPool70 = Math.max(0, totalStake - systemFeeBase);

    let rewardPerTask = 0;
    let maxSlots = 0;

    if (splitMode === 'by_payout') {
      rewardPerTask = Math.max(0, Math.round(Number(payoutInput) || 0));
      maxSlots = rewardPerTask > 0 ? Math.floor(rewardPool70 / rewardPerTask) : 0;
    } else if (splitMode === 'by_people') {
      maxSlots = Math.max(0, Math.round(Number(peopleInput) || 0));
      rewardPerTask = maxSlots > 0 ? Math.floor(rewardPool70 / maxSlots) : 0;
    } else {
      rewardPerTask = Math.max(0, Math.round(Number(payoutInput) || 0));
      maxSlots = Math.max(0, Math.round(Number(peopleInput) || 0));
    }

    const allocatedPool = rewardPerTask * maxSlots;
    const effectiveSystemFee = Math.max(0, totalStake - allocatedPool);
    const isValid =
      totalStake >= 500 &&
      rewardPerTask >= 50 &&
      maxSlots >= 1 &&
      allocatedPool <= rewardPool70;

    return {
      totalStake,
      systemFeeBase,
      rewardPool70,
      rewardPerTask,
      maxSlots,
      allocatedPool,
      effectiveSystemFee,
      isValid,
    };
  }, [createStake, splitMode, payoutInput, peopleInput]);

  const filteredEarnTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.status !== 'active' && !t.mySubmission) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.instructions.toLowerCase().includes(q) ||
        t.creatorName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tasks, categoryFilter, searchQuery]);

  const myCreatedTasks = useMemo(() => {
    if (!currentUser?.phoneNumber) return [];
    return tasks.filter((t) => phonesMatch(t.creatorPhone, currentUser.phoneNumber));
  }, [tasks, currentUser?.phoneNumber]);

  const mySubmittedTasks = useMemo(() => {
    return tasks.filter((t) => Boolean(t.mySubmission));
  }, [tasks]);

  const handleOpenProofForm = (task: TaskBountyCampaign) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    setProofUsername(task.mySubmission?.proofUsername || '');
    setProofScreenshot(task.mySubmission?.proofScreenshot || '');
    setProofNote(task.mySubmission?.note || '');
  };

  const handleScreenshotSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotice('Please select an image screenshot file (PNG, JPG, WebP).', 'err');
      return;
    }
    setCompressingImg(true);
    try {
      const compressed = await compressImageToBudget(file, {
        maxDimension: 900,
        minDimension: 360,
        maxBytes: 110 * 1024,
        initialQuality: 0.76,
        minQuality: 0.35,
      });
      setProofScreenshot(compressed);
    } catch (_) {
      showNotice('Could not read the selected screenshot. Try another image.', 'err');
    } finally {
      setCompressingImg(false);
      e.target.value = '';
    }
  };

  const handleSubmitProof = async (task: TaskBountyCampaign) => {
    if (!currentUser?.phoneNumber) {
      showNotice('Please sign in with your phone number first.', 'err');
      return;
    }
    const cleanHandle = proofUsername.trim();
    if (cleanHandle.length < 2) {
      showNotice(`Enter your ${task.platformHandleHint || 'username'} used on this task.`, 'err');
      return;
    }
    if (!proofScreenshot) {
      showNotice('Please upload a proof screenshot before submitting.', 'err');
      return;
    }

    setSubmittingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerPhone: currentUser.phoneNumber,
          workerName: currentUser.fullName || 'AGC Earner',
          workerAvatar: currentUser.avatarUrl,
          proofUsername: cleanHandle,
          proofScreenshot,
          note: proofNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showNotice(data?.message || 'Unable to submit proof.', 'err');
        return;
      }
      showNotice(data.message || 'Proof submitted for admin verification.', 'ok');
      setExpandedTaskId(null);
      setProofUsername('');
      setProofScreenshot('');
      setProofNote('');
      await fetchTasks();
    } catch (_) {
      showNotice('Network error while submitting proof.', 'err');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.phoneNumber) {
      showNotice('Sign in with your phone number to stake a campaign.', 'err');
      return;
    }
    if (!createTitle.trim() || !createInstructions.trim()) {
      showNotice('Please enter a campaign title and clear task instructions.', 'err');
      return;
    }
    if (!stakeEconomics.isValid) {
      showNotice(
        'Check stake & split: minimum stake ₦500, minimum payout ₦50/person, and payouts must fit inside the 70% worker pool.',
        'err'
      );
      return;
    }
    if (Number(wallet?.availableBalance || 0) < stakeEconomics.totalStake) {
      showNotice(
        `Insufficient wallet balance. Need ₦${stakeEconomics.totalStake.toLocaleString()}, available ₦${Number(wallet?.availableBalance || 0).toLocaleString()}.`,
        'err'
      );
      return;
    }

    setCreatingCampaign(true);
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle.trim(),
          category: createCategory,
          targetUrl: createTargetUrl.trim() || undefined,
          instructions: createInstructions.trim(),
          platformHandleHint: createHandleHint.trim() || CATEGORY_META[createCategory].defaultHint,
          creatorPhone: currentUser.phoneNumber,
          creatorName: currentUser.fullName || 'Creator',
          creatorAvatar: currentUser.avatarUrl,
          totalStake: stakeEconomics.totalStake,
          rewardPerTask: stakeEconomics.rewardPerTask,
          maxSlots: stakeEconomics.maxSlots,
          currency: wallet?.currency || 'NGN',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showNotice(data?.message || 'Failed to launch task campaign.', 'err');
        return;
      }

      showNotice(data.message || 'Campaign funded and live!', 'ok');
      setCreateTitle('');
      setCreateTargetUrl('');
      setCreateInstructions('');
      await Promise.all([fetchTasks(), refreshWalletFromServer()]);
      setActiveTab('activity');
    } catch (_) {
      showNotice('Network error while creating task campaign.', 'err');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleCloseCampaign = async (taskId: string) => {
    if (!currentUser?.phoneNumber) return;
    setClosingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorPhone: currentUser.phoneNumber,
          isAdmin: currentUser.role === 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showNotice(data?.message || 'Unable to close campaign.', 'err');
        return;
      }
      showNotice(data.message || 'Campaign closed and remaining escrow refunded.', 'ok');
      setConfirmCloseTaskId(null);
      await Promise.all([fetchTasks(), refreshWalletFromServer()]);
    } catch (_) {
      showNotice('Network error while closing campaign.', 'err');
    } finally {
      setClosingTaskId(null);
    }
  };

  if (!isTaskEarnModalOpen) return null;

  const availableBal = Number(wallet?.availableBalance || 0);
  const insufficientForStake = availableBal < stakeEconomics.totalStake;

  return (
    <div
      onClick={() => setIsTaskEarnModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#110a1e] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-500/20 dark:border-purple-900/40"
      >
        {/* Mobile drag bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-purple-900/60 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-[#140b24] border-b border-purple-500/20 text-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-white font-display truncate">
                  Task to Earn
                </h3>
                <p className="text-[11px] text-purple-200/75 truncate">
                  70% worker bounty pool · 30% platform escrow · Admin verified payouts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsTaskEarnModalOpen(false);
                  setIsWalletModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono tabular-nums text-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>₦{availableBal.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={fetchTasks}
                disabled={loading}
                aria-label="Refresh tasks"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsTaskEarnModalOpen(false)}
                aria-label="Close Task to Earn"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Primary Segmented Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mt-3.5 p-1 bg-black/30 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('earn')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'earn'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/75 hover:text-white'
              }`}
            >
              Earn ({tasks.filter((t) => t.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'create'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/75 hover:text-white'
              }`}
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'activity'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/75 hover:text-white'
              }`}
            >
              My Activity ({mySubmittedTasks.length + myCreatedTasks.length})
            </button>
          </div>
        </div>

        {/* Inline Feedback Banner */}
        {notice && (
          <div
            className={`mx-4 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shrink-0 ${
              notice.tone === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {notice.tone === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ==================== TAB 1: EARN ==================== */}
          {activeTab === 'earn' && (
            <div className="space-y-4">
              {/* Search & Category Controls */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns, artists, YouTube, IG, TikTok..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-purple-950/30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
                    }`}
                  >
                    All Tasks
                  </button>
                  {(Object.keys(CATEGORY_META) as TaskBountyCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                        categoryFilter === cat
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-purple-950/30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
                      }`}
                    >
                      {renderCategoryIcon(cat, 'w-3.5 h-3.5')}
                      <span>{CATEGORY_META[cat].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign List */}
              {loading && tasks.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-32 rounded-2xl bg-slate-100 dark:bg-purple-950/20 animate-pulse border border-slate-200 dark:border-purple-900/30"
                    />
                  ))}
                </div>
              ) : filteredEarnTasks.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50 dark:bg-purple-950/20 text-center space-y-3">
                  <Coins className="w-8 h-8 text-purple-500 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      No Active Micro-Tasks Found
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Artists and creators stake campaigns here to pay users for real engagement, comments, and reviews.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Stake &amp; Launch First Task</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEarnTasks.map((task) => {
                    const isCreator = phonesMatch(currentUser?.phoneNumber, task.creatorPhone);
                    const claimedSlots = (task.approvedCount || 0) + (task.pendingCount || 0);
                    const openSlots = Math.max(0, (task.maxSlots || 0) - claimedSlots);
                    const progressPct =
                      task.maxSlots > 0
                        ? Math.min(100, Math.round((claimedSlots / task.maxSlots) * 100))
                        : 0;
                    const safeUrl = getSafeExternalUrl(task.targetUrl);
                    const mySub = task.mySubmission;
                    const isExpanded = expandedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#170e29] space-y-3"
                      >
                        {/* Card Top Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {task.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1 font-medium text-purple-600 dark:text-purple-300">
                                {renderCategoryIcon(task.category, 'w-3.5 h-3.5')}
                                {CATEGORY_META[task.category]?.label || task.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>By {task.creatorName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {openSlots} of {task.maxSlots} slots left
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                              +₦{Number(task.rewardPerTask || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                              per verified proof
                            </div>
                          </div>
                        </div>

                        {/* Instructions */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {task.instructions}
                        </p>

                        {/* Slot Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-purple-950/60 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 dark:bg-purple-500 transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            <span>
                              {task.approvedCount} paid · {task.pendingCount} pending review
                            </span>
                            <span>
                              Pool: ₦{Number(task.rewardPool || 0).toLocaleString()} (70%)
                            </span>
                          </div>
                        </div>

                        {/* Worker Submission State OR Action Row */}
                        <div className="pt-2 border-t border-slate-100 dark:border-purple-900/30 flex flex-wrap items-center justify-between gap-2">
                          {safeUrl ? (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-purple-950/50 hover:bg-slate-200 dark:hover:bg-purple-900/60 text-xs font-semibold text-slate-800 dark:text-purple-200 transition-colors whitespace-nowrap shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Task Link</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Required: {task.platformHandleHint}
                            </span>
                          )}

                          {isCreator ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('activity')}
                              className="px-3.5 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 text-xs font-bold whitespace-nowrap shrink-0"
                            >
                              Your Campaign · Manage
                            </button>
                          ) : mySub?.status === 'approved' ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold whitespace-nowrap shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verified &amp; Paid ₦{mySub.payoutAmount.toLocaleString()}</span>
                            </div>
                          ) : mySub?.status === 'pending' ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold whitespace-nowrap shrink-0">
                              <Clock className="w-4 h-4" />
                              <span>Pending Verification (@{mySub.proofUsername.replace(/^@/, '')})</span>
                            </div>
                          ) : openSlots <= 0 || task.status !== 'active' ? (
                            <span className="text-xs font-semibold text-slate-400">
                              All slots filled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenProofForm(task)}
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                            >
                              {isExpanded
                                ? 'Cancel Proof'
                                : mySub?.status === 'rejected'
                                ? 'Resubmit Proof'
                                : 'Complete & Submit Proof'}
                            </button>
                          )}
                        </div>

                        {/* Rejection Feedback Notice */}
                        {mySub?.status === 'rejected' && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Previous proof rejected: </span>
                              <span>{mySub.adminNote || 'Please verify instructions and submit again.'}</span>
                            </div>
                          </div>
                        )}

                        {/* Inline Proof Submission Form */}
                        {isExpanded && !isCreator && openSlots > 0 && (
                          <div className="pt-3 border-t border-slate-200 dark:border-purple-900/40 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  Your {task.platformHandleHint || 'Username'} *
                                </label>
                                <input
                                  type="text"
                                  value={proofUsername}
                                  onChange={(e) => setProofUsername(e.target.value)}
                                  placeholder="e.g. @lagos_vibes"
                                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/40 border border-slate-200 dark:border-purple-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  Note / Comment Snippet (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={proofNote}
                                  onChange={(e) => setProofNote(e.target.value)}
                                  placeholder="e.g. Commented 'Fire track!'"
                                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/40 border border-slate-200 dark:border-purple-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                />
                              </div>
                            </div>

                            {/* Screenshot Upload */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                                Proof Screenshot *
                              </label>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotSelected}
                                className="hidden"
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={compressingImg}
                                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-purple-950/50 hover:bg-slate-200 dark:hover:bg-purple-900/60 border border-slate-200 dark:border-purple-800/60 text-xs font-semibold text-slate-800 dark:text-purple-100 transition-colors whitespace-nowrap shrink-0"
                                >
                                  <Upload className="w-4 h-4" />
                                  <span>
                                    {compressingImg
                                      ? 'Optimizing screenshot...'
                                      : proofScreenshot
                                      ? 'Replace Screenshot'
                                      : 'Upload Proof Screenshot'}
                                  </span>
                                </button>

                                {proofScreenshot && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage(proofScreenshot)}
                                    className="inline-flex items-center gap-2 p-1 pr-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 font-semibold"
                                  >
                                    <img
                                      src={proofScreenshot}
                                      alt="Proof preview"
                                      className="w-9 h-9 rounded-lg object-cover"
                                    />
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>Preview attached</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>Admin verifies &amp; credits ₦{task.rewardPerTask.toLocaleString()}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSubmitProof(task)}
                                disabled={submittingTaskId === task.id || compressingImg}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                              >
                                {submittingTaskId === task.id ? 'Submitting...' : 'Submit Proof'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: CREATE TASK ==================== */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-slate-700 dark:text-purple-100 leading-relaxed">
                Stake your campaign budget from your AGC Wallet. The platform retains{' '}
                <strong className="font-mono">30%</strong> service fee and locks{' '}
                <strong className="font-mono">70%</strong> in escrow to pay earners only after Admin verifies their screenshot and username proof.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Comment on Davido's new YouTube music video"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Platform / Category
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as TaskBountyCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    {(Object.keys(CATEGORY_META) as TaskBountyCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Username Proof Required
                  </label>
                  <input
                    type="text"
                    value={createHandleHint}
                    onChange={(e) => setCreateHandleHint(e.target.value)}
                    placeholder="e.g. YouTube @handle"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Target Link (YouTube, IG, TikTok, App Store URL)
                  </label>
                  <input
                    type="text"
                    value={createTargetUrl}
                    onChange={(e) => setCreateTargetUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Step-by-Step Instructions *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={createInstructions}
                    onChange={(e) => setCreateInstructions(e.target.value)}
                    placeholder="1. Open the video link&#10;2. Leave a genuine comment and like the video&#10;3. Upload a screenshot showing your comment and enter your @handle"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* Stake Budget & 70/30 Micro-task Split Controls */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-purple-900/50 bg-slate-50/70 dark:bg-[#170e29] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Total Campaign Stake (₦)
                  </label>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Wallet: ₦{availableBal.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_STAKES.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreateStake(String(amt))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 ${
                        Number(createStake) === amt
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-purple-950/50 border border-slate-200 dark:border-purple-800/50 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min={500}
                  step={100}
                  value={createStake}
                  onChange={(e) => setCreateStake(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold tabular-nums bg-white dark:bg-purple-950/40 border border-slate-200 dark:border-purple-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />

                {/* Split Mode Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    How to Split 70% Pool (₦{stakeEconomics.rewardPool70.toLocaleString()})
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-black/30">
                    {[
                      { id: 'by_payout' as const, label: 'Per Person ₦' },
                      { id: 'by_people' as const, label: 'People Count' },
                      { id: 'custom' as const, label: 'Custom Cap' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSplitMode(m.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          splitMode === m.id
                            ? 'bg-white dark:bg-purple-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {(splitMode === 'by_payout' || splitMode === 'custom') && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Payout Per Person (min ₦50)
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={payoutInput}
                          onChange={(e) => setPayoutInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold tabular-nums bg-white dark:bg-purple-950/40 border border-slate-200 dark:border-purple-800/50 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}

                    {(splitMode === 'by_people' || splitMode === 'custom') && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Number of People (Slots)
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={peopleInput}
                          onChange={(e) => setPeopleInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold tabular-nums bg-white dark:bg-purple-950/40 border border-slate-200 dark:border-purple-800/50 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdown Summary */}
                <div className="pt-3 border-t border-slate-200 dark:border-purple-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Stake</div>
                    <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      ₦{stakeEconomics.totalStake.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">System Fee (30%)</div>
                    <div className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      ₦{stakeEconomics.effectiveSystemFee.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Worker Pool (70%)</div>
                    <div className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      ₦{stakeEconomics.allocatedPool.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Micro-Tasks</div>
                    <div className="font-mono font-bold tabular-nums text-purple-600 dark:text-purple-300">
                      {stakeEconomics.maxSlots.toLocaleString()} × ₦{stakeEconomics.rewardPerTask.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {insufficientForStake ? (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-rose-700 dark:text-rose-300 font-semibold">
                    Insufficient balance for ₦{stakeEconomics.totalStake.toLocaleString()} stake.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTaskEarnModalOpen(false);
                      setIsWalletModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold whitespace-nowrap shrink-0"
                  >
                    Top Up Wallet
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={creatingCampaign || !stakeEconomics.isValid}
                  className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {creatingCampaign
                      ? 'Locking Escrow & Launching...'
                      : `Stake ₦${stakeEconomics.totalStake.toLocaleString()} & Launch (${stakeEconomics.maxSlots.toLocaleString()} Tasks)`}
                  </span>
                </button>
              )}
            </form>
          )}

          {/* ==================== TAB 3: MY ACTIVITY ==================== */}
          {activeTab === 'activity' && (
            <div className="space-y-5">
              {/* Section A: My Created Campaigns */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>My Staked Campaigns ({myCreatedTasks.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    + New Campaign
                  </button>
                </div>

                {myCreatedTasks.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50 dark:bg-purple-950/20 text-xs text-slate-500 dark:text-slate-400 text-center">
                    You have not staked any bounty campaigns yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myCreatedTasks.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#170e29] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {c.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                              {c.approvedCount}/{c.maxSlots} verified · {c.pendingCount} pending · Status:{' '}
                              <span className="capitalize font-semibold">{c.status}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ₦{c.remainingEscrow.toLocaleString()} left
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Staked ₦{c.totalStake.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {c.status !== 'closed' && c.remainingEscrow > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-purple-900/30 flex items-center justify-end gap-2">
                            {confirmCloseTaskId === c.id ? (
                              <>
                                <span className="text-xs text-amber-600 dark:text-amber-300 font-semibold mr-auto">
                                  Refund ₦{c.remainingEscrow.toLocaleString()} unspent escrow?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCloseTaskId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-purple-950 text-xs font-semibold text-slate-700 dark:text-slate-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={closingTaskId === c.id}
                                  onClick={() => handleCloseCampaign(c.id)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                                >
                                  {closingTaskId === c.id ? 'Refunding...' : 'Confirm Refund'}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCloseTaskId(c.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-purple-950/60 hover:bg-rose-500/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                <span>Close &amp; Refund Unspent Escrow</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section B: My Submitted Proofs */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>My Submitted Task Proofs ({mySubmittedTasks.length})</span>
                </h4>

                {mySubmittedTasks.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50 dark:bg-purple-950/20 text-xs text-slate-500 dark:text-slate-400 text-center">
                    Complete tasks in the Earn tab to see your verification status and earnings here.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mySubmittedTasks.map((t) => {
                      const sub = t.mySubmission!;
                      return (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#170e29] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {sub.proofScreenshot && (
                              <button
                                type="button"
                                onClick={() => setLightboxImage(sub.proofScreenshot)}
                                className="shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-purple-800/60"
                              >
                                <img
                                  src={sub.proofScreenshot}
                                  alt="Submitted proof"
                                  className="w-12 h-12 object-cover"
                                />
                              </button>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {t.title}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                Handle: <span className="font-mono">@{sub.proofUsername.replace(/^@/, '')}</span>
                              </div>
                              {sub.adminNote && sub.status !== 'pending' && (
                                <div className="text-[11px] text-slate-400 truncate">
                                  {sub.adminNote}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-0.5">
                            <div className="text-xs font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                              +₦{sub.payoutAmount.toLocaleString()}
                            </div>
                            <div
                              className={`text-[11px] font-bold capitalize ${
                                sub.status === 'approved'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : sub.status === 'rejected'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {sub.status === 'approved'
                                ? 'Verified & Paid'
                                : sub.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending Admin'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proof Screenshot Lightbox */}
      {lightboxImage && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImage(null);
          }}
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] bg-zinc-950 rounded-2xl border border-zinc-800 p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800"
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage}
              alt="Proof screenshot preview"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
