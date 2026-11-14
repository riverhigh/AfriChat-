import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Users,
  Lock,
  Radio,
  AlertTriangle,
  Database,
  Search,
  Ban,
  RotateCcw,
  Send,
  RefreshCw,
  Bell,
  Activity,
  Store,
  Crown,
  Truck,
  TrendingUp,
  Cpu,
  Server,
  Zap,
  DollarSign,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ToggleLeft,
  Sliders,
  FileText,
  Megaphone,
  Globe,
  Percent,
  AlertCircle,
  Eye,
  EyeOff,
  ToggleRight,
  Settings,
  Newspaper,
  HelpCircle,
  MessageSquare,
  Image,
  Star,
  PlusCircle,
  Trash2,
  Edit3,
  UserX,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DispatchDeliveryOrder, FeatureFlags, CmsAnnouncement, CmsFaqItem } from '../types';
import dbFallbackUsers from '../../data_users.json';

interface LiveAdminMetrics {
  uptimeSeconds: number;
  serverMemoryMb: number;
  onlineUsersCount: number;
  onlineUsers: Array<{ userId: string; userName: string; avatar?: string }>;
  registeredUsersCount: number;
  registeredUsers: any[];
  communitiesCount: number;
  activeStatusesCount: number;
  dispatch: {
    totalOrdersCount: number;
    activeDeliveriesCount: number;
    completedDeliveriesCount: number;
    totalVolumeNgn: number;
    totalCommissionNgn: number;
    orders: any[];
  };
  systemStatus: string;
}

export const AdminDashboardModal: React.FC = () => {
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    adminUsers,
    toggleUserVerification,
    toggleUserSuspension,
    escrowOrders,
    adminResolveEscrow,
    systemBroadcast,
    setSystemBroadcast,
    createAdminBroadcast,
    formatPrice,
    audioSpaces,
    serviceProviders,
    dispatchOrders,
    systemConfig,
    updateSystemConfig,
    updateAdminFeatureFlag,
    featureFlags,
    cmsData,
    updateCmsData,
    setUserStatus,
    banUser,
    unbanUser,
    adjustUserWallet,
    kickUserSession,
    currentUser,
    isUserOnline,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'dispatch' | 'escrow' | 'broadcast' | 'config' | 'features' | 'cms' | 'telemetry'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [liveMetrics, setLiveMetrics] = useState<LiveAdminMetrics | null>(null);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'creator' | 'merchant' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned' | 'flagged'>('all');
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [escrowFilter, setEscrowFilter] = useState<'all' | 'escrow_secured' | 'funds_released' | 'disputed'>('all');

  // Customer Info Dossier Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerBanReason, setCustomerBanReason] = useState('');
  const [customerWalletDelta, setCustomerWalletDelta] = useState('');
  const [customerWalletSuccess, setCustomerWalletSuccess] = useState(false);

  // Broadcast compose form state
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLevel, setBcLevel] = useState<'info' | 'warning' | 'alert' | 'urgent'>('info');

  // Supabase ping test state
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Config form local state (mirrors systemConfig)
  const [cfgMaintenanceMode, setCfgMaintenanceMode] = useState(false);
  const [cfgMaintenanceMsg, setCfgMaintenanceMsg] = useState('');
  const [cfgAllowReg, setCfgAllowReg] = useState(true);
  const [cfgRequireOtp, setCfgRequireOtp] = useState(true);
  const [cfgDispatchComm, setCfgDispatchComm] = useState(5);
  const [cfgEscrowComm, setCfgEscrowComm] = useState(2.5);
  const [cfgArtisanComm, setCfgArtisanComm] = useState(10);
  const [cfgCreatorComm, setCfgCreatorComm] = useState(15);
  const [cfgMinTransfer, setCfgMinTransfer] = useState(100);
  const [cfgMaxDailyTransfer, setCfgMaxDailyTransfer] = useState(500000);
  const [cfgDelayMins, setCfgDelayMins] = useState(10);
  const [cfgSupportPhone, setCfgSupportPhone] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  // CMS form state
  const [cmsNewAnnTitle, setCmsNewAnnTitle] = useState('');
  const [cmsNewAnnMsg, setCmsNewAnnMsg] = useState('');
  const [cmsFaqQuestion, setCmsFaqQuestion] = useState('');
  const [cmsFaqAnswer, setCmsFaqAnswer] = useState('');
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsGuidelines, setCmsGuidelines] = useState('');
  const [cmsSaved, setCmsSaved] = useState(false);

  const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Fetch live metrics from backend (relative first via Vite/proxy, then port 3002)
  const fetchLiveMetrics = async () => {
    setIsRefreshing(true);
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/admin/metrics');
      } catch (_) {}
      if (!res || !res.ok) {
        try {
          res = await fetch(`http://${socketHost}:3002/api/admin/metrics`);
        } catch (_) {}
      }

      if (res && res.ok) {
        const data = await res.json();
        setLiveMetrics(data);
        setLastRefreshedAt(new Date());
      } else {
        // Fallback: fetch /api/users directly from database
        const uRes = await fetch('/api/users').catch(() => null);
        if (uRes && uRes.ok) {
          const uData = await uRes.json();
          if (uData.users && Array.isArray(uData.users)) {
            setLiveMetrics((prev) => ({
              uptimeSeconds: prev?.uptimeSeconds || 3600,
              serverMemoryMb: prev?.serverMemoryMb || 48,
              onlineUsersCount: uData.users.filter((u: any) => u.lastSeen === 'online').length,
              onlineUsers: uData.users.filter((u: any) => u.lastSeen === 'online'),
              registeredUsersCount: uData.users.length,
              registeredUsers: uData.users,
              communitiesCount: prev?.communitiesCount || 6,
              activeStatusesCount: prev?.activeStatusesCount || 0,
              dispatch: prev?.dispatch || {
                totalOrdersCount: 0,
                activeDeliveriesCount: 0,
                completedDeliveriesCount: 0,
                totalVolumeNgn: 0,
                totalCommissionNgn: 0,
                orders: [],
              },
              systemStatus: 'healthy',
            }));
            setLastRefreshedAt(new Date());
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live admin metrics:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdminModalOpen) return;
    fetchLiveMetrics();

    if (!autoRefresh) return;
    const interval = setInterval(fetchLiveMetrics, 6000);
    return () => clearInterval(interval);
  }, [isAdminModalOpen, autoRefresh]);

  useEffect(() => {
    if (!isAdminModalOpen || !systemConfig) return;
    setCfgMaintenanceMode(systemConfig.maintenanceMode ?? false);
    setCfgMaintenanceMsg(systemConfig.maintenanceMessage ?? '');
    setCfgAllowReg(systemConfig.allowNewRegistrations ?? true);
    setCfgRequireOtp(systemConfig.requirePhoneOtp ?? true);
    setCfgDispatchComm(systemConfig.dispatchCommissionPercent ?? 5);
    setCfgEscrowComm(systemConfig.escrowCommissionPercent ?? 2.5);
    setCfgArtisanComm(systemConfig.artisanCommissionPercent ?? 10);
    setCfgCreatorComm(systemConfig.creatorCommissionPercent ?? 15);
    setCfgMinTransfer(systemConfig.minTransferAmountNgn ?? 100);
    setCfgMaxDailyTransfer(systemConfig.maxDailyTransferNgn ?? 500000);
    setCfgDelayMins(systemConfig.delayedSendHoldDurationMins ?? 10);
    setCfgSupportPhone(systemConfig.supportContactPhone ?? '');
  }, [isAdminModalOpen, systemConfig]);

  if (!isAdminModalOpen) return null;

  // Comprehensive Customer Aggregator:
  // Combines (1) AppContext adminUsers, (2) live backend metrics/users, (3) data_users.json file, (4) localStorage registries, (5) active currentUser
  const mergedUsers = useMemo(() => {
    const map = new Map<string, any>();

    const addUser = (raw: any) => {
      if (!raw) return;
      const phone = (raw.phoneNumber || raw.phone || '').trim();
      const id = raw.id || (phone ? `usr_${phone.replace(/\D/g, '')}` : `usr_${Date.now()}`);
      const cleanPhone = phone.replace(/\D/g, '');
      const key = cleanPhone || id;
      if (!key) return;

      const isCurrent = currentUser?.phoneNumber && (currentUser.phoneNumber === phone || (cleanPhone && currentUser.phoneNumber.replace(/\D/g, '') === cleanPhone));
      const online = Boolean(
        isCurrent ||
        raw.isOnline ||
        raw.lastSeen === 'online' ||
        (cleanPhone && isUserOnline?.(cleanPhone)) ||
        (isUserOnline?.(id))
      );

      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          ...raw,
          fullName: raw.fullName || raw.name || existing.fullName,
          avatarUrl: raw.avatarUrl || existing.avatarUrl,
          status: raw.status || existing.status || 'active',
          isOnline: existing.isOnline || online,
          lastSeen: online ? 'online' : (raw.lastSeen || existing.lastSeen || 'Recently active'),
          walletBalanceNgn: raw.walletBalanceNgn ?? existing.walletBalanceNgn ?? 50000,
        });
      } else {
        map.set(key, {
          id,
          fullName: raw.fullName || raw.name || (isCurrent ? (currentUser.fullName || 'You') : 'Registered User'),
          phoneNumber: phone || (isCurrent ? currentUser.phoneNumber : ''),
          avatarUrl: raw.avatarUrl || (isCurrent ? currentUser.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
          role: raw.role || (isCurrent ? (currentUser.role || 'user') : 'user'),
          verificationBadge: raw.verificationBadge || null,
          isPhoneVerified: raw.isPhoneVerified !== undefined ? Boolean(raw.isPhoneVerified) : true,
          status: raw.status || 'active',
          bannedAt: raw.bannedAt,
          banReason: raw.banReason,
          joinedDate: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : 'Recent',
          walletBalanceNgn: raw.walletBalanceNgn ?? 50000,
          ordersCount: raw.ordersCount || 0,
          isOnline: online,
          lastSeen: online ? 'online' : (raw.lastSeen || 'Recently active'),
        });
      }
    };

    // 1. Seed from data_users.json database file
    if (Array.isArray(dbFallbackUsers)) {
      dbFallbackUsers.forEach(addUser);
    }

    // 2. Check localStorage accounts
    try {
      const allRaw = localStorage.getItem('AGC_all_registered_users');
      if (allRaw) {
        const parsed = JSON.parse(allRaw);
        if (Array.isArray(parsed)) parsed.forEach(addUser);
      }
    } catch (_) {}

    try {
      const regMapRaw = localStorage.getItem('AGC_registered_phones');
      if (regMapRaw) {
        const parsed = JSON.parse(regMapRaw);
        if (parsed && typeof parsed === 'object') {
          Object.values(parsed).forEach(addUser);
        }
      }
    } catch (_) {}

    try {
      const pRaw = localStorage.getItem('AGC_user_profile_v2');
      if (pRaw) {
        const parsed = JSON.parse(pRaw);
        if (parsed?.phoneNumber) addUser(parsed);
      }
    } catch (_) {}

    // 3. Logged in currentUser
    if (currentUser?.phoneNumber) {
      addUser(currentUser);
    }

    // 4. AppContext adminUsers state
    if (Array.isArray(adminUsers)) {
      adminUsers.forEach(addUser);
    }

    // 5. Backend live metrics
    if (liveMetrics?.registeredUsers && Array.isArray(liveMetrics.registeredUsers)) {
      liveMetrics.registeredUsers.forEach(addUser);
    }

    return Array.from(map.values());
  }, [adminUsers, liveMetrics?.registeredUsers, currentUser, isUserOnline]);

  // Filtered users by search, role, and status
  const filteredUsers = mergedUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.phoneNumber.includes(q) ||
      (u.id && u.id.toLowerCase().includes(q));
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && (!u.status || u.status === 'active')) ||
      u.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered escrows
  const filteredEscrows = escrowOrders.filter((o) => {
    if (escrowFilter === 'all') return true;
    return o.status === escrowFilter;
  });

  // Real-time dispatch stats
  const activeOrders = liveMetrics?.dispatch?.orders || dispatchOrders;
  const filteredDispatchOrders = activeOrders.filter((ord: any) => {
    if (dispatchFilter === 'active') return ord.status !== 'delivered';
    if (dispatchFilter === 'delivered') return ord.status === 'delivered';
    return true;
  });

  const totalDispatchCommission = activeOrders.reduce(
    (sum: number, o: any) => sum + (o.platformFee ?? Math.round((o.estimatedFee || 0) * 0.05)),
    0
  );
  const totalDispatchVolume = activeOrders.reduce(
    (sum: number, o: any) => sum + (o.totalFee ?? ((o.estimatedFee || 0) + Math.round((o.estimatedFee || 0) * 0.05))),
    0
  );

  const totalEscrowLockedNgn = escrowOrders
    .filter((o) => o.status === 'escrow_secured')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const activeSpacesCount = audioSpaces.filter((s) => s.isLive).length;
  const verifiedUsersCount = mergedUsers.filter((u) => u.verificationBadge).length;

  const handleTestSupabase = async () => {
    setPingStatus('testing');
    setPingMessage('Testing connection to Supabase Auth & REST endpoints...');
    const start = performance.now();
    try {
      const res = await fetch('https://sejiretcywvqbzbqalbg.supabase.co/auth/v1/settings', {
        headers: {
          apikey: 'sb_publishable_Ja5dvS5_c3JjrpsTI_hq_w_L7birCR1',
        },
      });
      const end = performance.now();
      const latencyMs = Math.round(end - start);
      setPingLatency(latencyMs);

      if (res.ok) {
        setPingStatus('success');
        setPingMessage(`Supabase connection verified! Responded in ${latencyMs}ms. Auth & Project Gateway online.`);
      } else {
        setPingStatus('error');
        setPingMessage(`Supabase returned HTTP status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      setPingStatus('error');
      setPingMessage(`Supabase connection error: ${err.message || 'Network unreachable'}`);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcMessage.trim()) return;

    try {
      let r = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bcTitle.trim(), message: bcMessage.trim(), level: bcLevel }),
      }).catch(() => null);
      if (!r || !r.ok) {
        await fetch(`http://${socketHost}:3002/api/admin/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: bcTitle.trim(), message: bcMessage.trim(), level: bcLevel }),
        }).catch(() => null);
      }
    } catch (_) {}

    createAdminBroadcast(bcTitle.trim(), bcMessage.trim(), bcLevel);
    setBcTitle('');
    setBcMessage('');
    alert('Live broadcast successfully dispatched across all connected clients!');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  useEffect(() => {
    if (!isAdminModalOpen || !systemConfig) return;
    setCfgMaintenanceMode(systemConfig.maintenanceMode ?? false);
    setCfgMaintenanceMsg(systemConfig.maintenanceMessage ?? '');
    setCfgAllowReg(systemConfig.allowNewRegistrations ?? true);
    setCfgRequireOtp(systemConfig.requirePhoneOtp ?? true);
    setCfgDispatchComm(systemConfig.dispatchCommissionPercent ?? 5);
    setCfgEscrowComm(systemConfig.escrowCommissionPercent ?? 2.5);
    setCfgArtisanComm(systemConfig.artisanCommissionPercent ?? 10);
    setCfgCreatorComm(systemConfig.creatorCommissionPercent ?? 15);
    setCfgMinTransfer(systemConfig.minTransferAmountNgn ?? 100);
    setCfgMaxDailyTransfer(systemConfig.maxDailyTransferNgn ?? 500000);
    setCfgDelayMins(systemConfig.delayedSendHoldDurationMins ?? 10);
    setCfgSupportPhone(systemConfig.supportContactPhone ?? '');
    if (cmsData?.communityGuidelines) {
      setCmsGuidelines(cmsData.communityGuidelines);
    }
  }, [isAdminModalOpen, systemConfig, cmsData]);

  const handleSaveConfig = async () => {
    await updateSystemConfig({
      maintenanceMode: cfgMaintenanceMode,
      maintenanceMessage: cfgMaintenanceMsg,
      allowNewRegistrations: cfgAllowReg,
      requirePhoneOtp: cfgRequireOtp,
      dispatchCommissionPercent: cfgDispatchComm,
      escrowCommissionPercent: cfgEscrowComm,
      artisanCommissionPercent: cfgArtisanComm,
      creatorCommissionPercent: cfgCreatorComm,
      minTransferAmountNgn: cfgMinTransfer,
      maxDailyTransferNgn: cfgMaxDailyTransfer,
      delayedSendHoldDurationMins: cfgDelayMins,
      supportContactPhone: cfgSupportPhone,
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const formatLastSeen = (iso?: string): string => {
    if (!iso) return 'Unknown';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs}h ${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col bg-slate-950 text-slate-100 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-purple-500/30 overflow-hidden font-sans">
        
        {/* Top Executive Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 border border-white/20">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight font-display text-white">
                  AfriChat Command Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Super Admin
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-purple-200/70 font-mono mt-0.5 flex items-center gap-2">
                <span>Node: <strong className="text-purple-300">port 3002</strong></span>
                <span>•</span>
                <span>Supabase: <strong className="text-emerald-300 font-mono">sejiretcywvqbzbqalbg</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Auto-Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Live 6s Auto-Sync"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 fill-emerald-400/30' : 'text-slate-500'}`} />
              <span>{autoRefresh ? 'Auto-Sync ON' : 'Paused'}</span>
            </button>

            {/* Manual Sync Button */}
            <button
              type="button"
              onClick={fetchLiveMetrics}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 transition-all hover:scale-105 active:scale-95"
              title="Refresh Live Data Now"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Close Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-purple-500/15 bg-slate-900/60 overflow-x-auto text-xs font-semibold scrollbar-none shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: Activity, count: null },
            { id: 'users', label: 'Users & Badges', icon: Users, count: mergedUsers.length },
            { id: 'dispatch', label: 'Dispatch (5%)', icon: Truck, count: activeOrders.length },
            { id: 'escrow', label: 'Escrow Vault', icon: Lock, count: escrowOrders.filter((o) => o.status === 'escrow_secured').length },
            { id: 'features', label: 'Feature Toggles', icon: ToggleRight, count: Object.keys(featureFlags).length },
            { id: 'config', label: 'System Config', icon: Sliders, count: null },
            { id: 'cms', label: 'CMS & Content', icon: FileText, count: null },
            { id: 'broadcast', label: 'Broadcast', icon: Bell, count: systemBroadcast?.active ? 'Active' : null },
            { id: 'telemetry', label: 'Telemetry', icon: Server, count: null },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0 transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{t.label}</span>
                {t.count !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-purple-800 text-purple-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-slate-950 via-[#0d0c18] to-slate-950">
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 1. EXECUTIVE OVERVIEW TAB                                        */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Primary KPI Highlights */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* 5% Platform Revenue */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-500/60 transition-all">
                  <div className="flex items-center justify-between text-emerald-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">5% Dispatch Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    ₦{totalDispatchCommission.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 mt-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>5% fee on ₦{totalDispatchVolume.toLocaleString()} total volume</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                </div>

                {/* Live Online Sockets */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 relative overflow-hidden group hover:border-indigo-500/60 transition-all">
                  <div className="flex items-center justify-between text-indigo-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Online Presence</span>
                    <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white flex items-baseline gap-2">
                    <span>{liveMetrics?.onlineUsersCount ?? 1}</span>
                    <span className="text-xs font-normal text-indigo-300">Active Sockets</span>
                  </div>
                  <div className="text-[11px] text-indigo-200/70 mt-1">
                    {mergedUsers.length} total registered accounts
                  </div>
                </div>

                {/* Locked Escrow Protection */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30 relative overflow-hidden group hover:border-amber-500/60 transition-all">
                  <div className="flex items-center justify-between text-amber-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Escrow Vault</span>
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {formatPrice(totalEscrowLockedNgn, 'NGN')}
                  </div>
                  <div className="text-[11px] text-amber-200/70 mt-1">
                    {escrowOrders.filter((o) => o.status === 'escrow_secured').length} active vaults secured
                  </div>
                </div>

                {/* Server Uptime & Health */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30 relative overflow-hidden group hover:border-purple-500/60 transition-all">
                  <div className="flex items-center justify-between text-purple-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Gateway Uptime</span>
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {liveMetrics?.uptimeSeconds ? formatUptime(liveMetrics.uptimeSeconds) : 'Live Ready'}
                  </div>
                  <div className="text-[11px] text-purple-200/70 mt-1">
                    RAM: {liveMetrics?.serverMemoryMb ?? 48} MB • Node 20.x
                  </div>
                </div>

              </div>

              {/* Active Broadcast Alert Banner if broadcast is active */}
              {systemBroadcast && systemBroadcast.active && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                          Live Global Announcement Active
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{systemBroadcast.createdAt}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {systemBroadcast.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {systemBroadcast.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemBroadcast(null)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold underline shrink-0"
                  >
                    Dismiss Notice
                  </button>
                </div>
              )}

              {/* Real-time Subsystem Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Dispatch Stream */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Live Couriers & 5% Commission
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dispatch')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                    >
                      <span>View All ({activeOrders.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeOrders.slice(0, 3).map((ord: any) => {
                      const comm = ord.platformFee ?? Math.round(ord.estimatedFee * 0.05);
                      return (
                        <div
                          key={ord.id}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-white">{ord.trackingCode}</span>
                              <span
                                className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                  ord.status === 'delivered'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {ord.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                              To: {ord.recipientName} ({ord.recipientAddress})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-emerald-400 font-bold block">
                              +₦{comm.toLocaleString()} (5%)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Base: ₦{ord.estimatedFee.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Moderation Shortcuts */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Quick Moderation Actions
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
                    >
                      <Crown className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-white">Assign Badges</div>
                      <div className="text-[10px] text-slate-400">Issue Blue or Gold Check</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('escrow')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                    >
                      <Lock className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-white">Release Escrow</div>
                      <div className="text-[10px] text-slate-400">Authorize seller payout</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('broadcast')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
                    >
                      <Bell className="w-4 h-4 text-rose-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-white">Push Alert</div>
                      <div className="text-[10px] text-slate-400">Global emergency notice</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('telemetry')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
                    >
                      <Database className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="font-bold text-white">Cloud Node</div>
                      <div className="text-[10px] text-slate-400">Supabase & WebSockets</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 2. CUSTOMER INFO DASHBOARD & PERMANENT BAN DESK                  */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Header KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Platform Users</span>
                  <div className="text-xl font-black font-mono text-white mt-0.5">{mergedUsers.length} Registered</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Live Online Sockets</span>
                  <div className="text-xl font-black font-mono text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{liveMetrics?.onlineUsersCount || mergedUsers.filter((u) => u.isOnline).length} Active</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Permanently Banned</span>
                  <div className="text-xl font-black font-mono text-rose-300 mt-0.5">
                    {mergedUsers.filter((u) => u.status === 'banned').length} Accounts
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Verified Badges</span>
                  <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                    {mergedUsers.filter((u) => u.verificationBadge).length} Checked
                  </div>
                </div>
              </div>

              {/* Search & Multi-Filter Bar */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search live users by name, phone (+234...), or customer ID..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold pb-1 sm:pb-0">
                    {(['all', 'active', 'banned', 'suspended', 'flagged'] as const).map((st) => {
                      const count = st === 'all'
                        ? mergedUsers.length
                        : st === 'active'
                        ? mergedUsers.filter((u) => !u.status || u.status === 'active').length
                        : mergedUsers.filter((u) => u.status === st).length;

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setUserStatusFilter(st)}
                          className={`px-2.5 py-1.5 rounded-xl capitalize text-[11px] shrink-0 font-mono transition-all flex items-center gap-1 ${
                            userStatusFilter === st
                              ? st === 'banned'
                                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                                : st === 'active'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-purple-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span>{st}</span>
                          <span className="text-[9px] opacity-75">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Role Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                  <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider mr-1">Role:</span>
                  {(['all', 'user', 'creator', 'merchant', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-2 py-1 rounded-lg capitalize shrink-0 transition-colors ${
                        userRoleFilter === role
                          ? 'bg-slate-700 text-white font-bold'
                          : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/60">
                    No customers match your search criteria.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isBanned = user.status === 'banned';
                    const isSuspended = user.status === 'suspended';

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isBanned
                            ? 'bg-rose-950/30 border-rose-900/60 hover:border-rose-600/60'
                            : isSuspended
                            ? 'bg-amber-950/20 border-amber-900/40'
                            : 'bg-slate-900/70 border-slate-800/80 hover:border-purple-500/40'
                        }`}
                      >
                        {/* User Identity Column */}
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => setSelectedCustomer(user)}
                          title="Click to view full customer dossier"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              className={`w-12 h-12 rounded-full object-cover border ${
                                isBanned ? 'border-rose-500 grayscale' : 'border-slate-700'
                              }`}
                            />
                            {user.verificationBadge === 'blue' && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
                                ✓
                              </span>
                            )}
                            {user.verificationBadge === 'gold' && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
                                ★
                              </span>
                            )}
                            {isBanned && (
                              <span className="absolute -top-1 -left-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                                🚫
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-white hover:text-purple-300 transition-colors truncate">
                                {user.fullName}
                              </h4>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold bg-slate-800 text-slate-300">
                                {user.role}
                              </span>

                              {isBanned ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                                  <span>🚫 BANNED</span>
                                </span>
                              ) : isSuspended ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-600 text-white">
                                  Suspended
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                              <span>{user.phoneNumber}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">
                                {formatPrice(user.walletBalanceNgn, 'NGN')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                <span className={user.isOnline ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                  {user.isOnline ? 'Online now' : `Last seen: ${formatLastSeen(user.lastSeen)}`}
                                </span>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500 truncate">{user.deviceInfo || 'Mobile'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Column */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Inspect Dossier Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(user)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 flex items-center gap-1 transition-all"
                            title="Open full customer info dossier & controls"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Dossier</span>
                          </button>

                          {/* Permanent Ban / Unban Direct Action */}
                          {isBanned ? (
                            <button
                              type="button"
                              onClick={() => unbanUser(user.phoneNumber || user.id)}
                              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 flex items-center gap-1 transition-all"
                              title="Unban and restore customer access"
                            >
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Unban</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt(
                                  `PERMANENTLY BAN ${user.fullName} (${user.phoneNumber})?\n\nThis will disconnect all active sessions and block the phone permanently.\n\nEnter reason:`,
                                  'Violation of platform terms and fraudulent activity'
                                );
                                if (reason !== null && reason.trim()) {
                                  banUser(user.phoneNumber || user.id, reason.trim());
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1 transition-all"
                              title="Permanently block and ban user from platform"
                            >
                              <Ban className="w-3 h-3 text-rose-400" />
                              <span>Ban</span>
                            </button>
                          )}

                          {/* Blue Checkmark */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleUserVerification(
                                user.id,
                                user.verificationBadge === 'blue' ? null : 'blue'
                              )
                            }
                            className={`p-1.5 rounded-xl text-[10px] border transition-all ${
                              user.verificationBadge === 'blue'
                                ? 'bg-sky-500 text-white border-sky-400'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-sky-300'
                            }`}
                            title="Toggle Blue VIP Check"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          {/* Gold Merchant Checkmark */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleUserVerification(
                                user.id,
                                user.verificationBadge === 'gold' ? null : 'gold'
                              )
                            }
                            className={`p-1.5 rounded-xl text-[10px] border transition-all ${
                              user.verificationBadge === 'gold'
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300'
                            }`}
                            title="Toggle Gold Merchant Check"
                          >
                            <Store className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* CUSTOMER INFO DOSSIER & BAN MODAL (OVERLAY)                       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {selectedCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
              <div className="w-full max-w-2xl bg-slate-950 border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Dossier Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={selectedCustomer.avatarUrl}
                        alt={selectedCustomer.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-md"
                      />
                      {selectedCustomer.status === 'banned' && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                          🚫
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white truncate font-display">
                          {selectedCustomer.fullName}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                          selectedCustomer.status === 'banned'
                            ? 'bg-rose-600 text-white'
                            : selectedCustomer.status === 'suspended'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {selectedCustomer.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {selectedCustomer.phoneNumber} • ID: <span className="text-purple-300">{selectedCustomer.id}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerBanReason('');
                      setCustomerWalletDelta('');
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Dossier Body */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Banned Alert Banner if account is currently blocked */}
                  {selectedCustomer.status === 'banned' && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-600/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                          <span>🚫 ACCOUNT PERMANENTLY BANNED</span>
                        </span>
                        {selectedCustomer.bannedAt && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Banned: {new Date(selectedCustomer.bannedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-rose-200">
                        Reason: <strong>{selectedCustomer.banReason || 'Policy violation and network abuse'}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await unbanUser(selectedCustomer.phoneNumber || selectedCustomer.id);
                          setSelectedCustomer({ ...selectedCustomer, status: 'active', bannedAt: undefined, banReason: undefined });
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30"
                      >
                        <Check className="w-4 h-4" />
                        <span>Reactivate & Restore Account Access</span>
                      </button>
                    </div>
                  )}

                  {/* 1. Identity & Device Info Grid */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                      <span>Customer Identity & Connection Info</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Status:</span>
                        <span className="font-bold text-white capitalize">{selectedCustomer.status || 'Active'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Role:</span>
                        <select
                          value={selectedCustomer.role || 'user'}
                          onChange={(e) => {
                            const newRole = e.target.value as any;
                            setUserStatus(selectedCustomer.id || selectedCustomer.phoneNumber, selectedCustomer.status);
                            setSelectedCustomer({ ...selectedCustomer, role: newRole });
                          }}
                          className="bg-transparent font-bold text-purple-400 focus:outline-none cursor-pointer"
                        >
                          <option value="user" className="bg-slate-900 text-white">User</option>
                          <option value="creator" className="bg-slate-900 text-white">Creator</option>
                          <option value="merchant" className="bg-slate-900 text-white">Merchant</option>
                          <option value="admin" className="bg-slate-900 text-white">Admin</option>
                        </select>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Joined Date:</span>
                        <span className="font-bold text-white">{selectedCustomer.joinedDate || 'Recent'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Presence:</span>
                        <span className={selectedCustomer.isOnline ? 'font-bold text-emerald-400' : 'text-slate-400'}>
                          {selectedCustomer.isOnline ? '🟢 Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Platform / Device:</span>
                        <span className="font-bold text-slate-300 truncate block">{selectedCustomer.deviceInfo || 'AfriChat Web / PWA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Wallet & Balance Ledger (Live in DB) */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Live Wallet Ledger (Persisted in DB)</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Available: {formatPrice(selectedCustomer.walletBalanceNgn || 0, 'NGN')}
                      </span>
                    </div>

                    {/* Direct Admin Balance Adjuster */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 block">
                        Direct Balance Credit / Debit Adjustment:
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-sm">₦</span>
                        <input
                          type="number"
                          value={customerWalletDelta}
                          onChange={(e) => setCustomerWalletDelta(e.target.value)}
                          placeholder="e.g. 5000 or -2000"
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={!customerWalletDelta || isNaN(Number(customerWalletDelta))}
                          onClick={async () => {
                            const delta = Number(customerWalletDelta);
                            await adjustUserWallet(selectedCustomer.phoneNumber || selectedCustomer.id, delta, false);
                            const updatedBal = Math.max(0, (selectedCustomer.walletBalanceNgn || 0) + delta);
                            setSelectedCustomer({ ...selectedCustomer, walletBalanceNgn: updatedBal });
                            setCustomerWalletDelta('');
                            setCustomerWalletSuccess(true);
                            setTimeout(() => setCustomerWalletSuccess(false), 2500);
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply Live</span>
                        </button>
                      </div>
                      {customerWalletSuccess && (
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Wallet balance updated and synced to server DB!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Permanent Ban & Account Moderation Desk */}
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Security & Permanent Account Ban Desk</span>
                    </h4>

                    {selectedCustomer.status !== 'banned' ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Permanent Ban Reason Note:
                          </label>
                          <input
                            type="text"
                            value={customerBanReason}
                            onChange={(e) => setCustomerBanReason(e.target.value)}
                            placeholder="e.g. Confirmed scam report, chargeback fraud, terms violation..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-rose-900/60 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = customerBanReason.trim() || 'Account permanently banned for policy violation.';
                              if (confirm(`Permanently ban and block ${selectedCustomer.fullName} (${selectedCustomer.phoneNumber})?\n\nThis will disconnect all open sockets and lock them out permanently.`)) {
                                await banUser(selectedCustomer.phoneNumber || selectedCustomer.id, reason);
                                setSelectedCustomer({
                                  ...selectedCustomer,
                                  status: 'banned',
                                  bannedAt: new Date().toISOString(),
                                  banReason: reason,
                                });
                                setCustomerBanReason('');
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Permanently Ban Account</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserStatus(selectedCustomer.phoneNumber || selectedCustomer.id, 'suspended');
                              setSelectedCustomer({ ...selectedCustomer, status: 'suspended' });
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 transition-colors"
                          >
                            <span>Suspend 24 Hours</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await kickUserSession(selectedCustomer.phoneNumber || selectedCustomer.id);
                              alert(`Active session for ${selectedCustomer.phoneNumber} terminated.`);
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <span>Force Logout / Kick Session</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-300">
                        This customer is currently permanently banned from accessing the AfriChat super-app platform. Use the Reactivate button above to remove the block.
                      </p>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 3. DISPATCH & 5% COMMISSION LEDGER                               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'dispatch' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Financial Summary Strip */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Platform Commission (5% Fixed Fee)
                  </span>
                  <div className="text-2xl font-black font-mono text-white mt-0.5">
                    ₦{totalDispatchCommission.toLocaleString()} Earned
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Total delivery volume: <strong>₦{totalDispatchVolume.toLocaleString()}</strong> across {activeOrders.length} courier orders
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDispatchFilter('all')}
                    className={`px-3 py-1.5 rounded-xl ${
                      dispatchFilter === 'all'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    All ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchFilter('active')}
                    className={`px-3 py-1.5 rounded-xl ${
                      dispatchFilter === 'active'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Active Couriers
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchFilter('delivered')}
                    className={`px-3 py-1.5 rounded-xl ${
                      dispatchFilter === 'delivered'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Delivered
                  </button>
                </div>
              </div>

              {/* Order Cards */}
              <div className="space-y-2.5">
                {filteredDispatchOrders.map((ord: any) => {
                  const comm = ord.platformFee ?? Math.round(ord.estimatedFee * 0.05);
                  const total = ord.totalFee ?? (ord.estimatedFee + comm);

                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(ord.trackingCode)}
                            className="font-mono text-xs font-bold text-white hover:text-emerald-400 flex items-center gap-1"
                            title="Copy Tracking Code"
                          >
                            <span>{ord.trackingCode}</span>
                            {copiedText === ord.trackingCode ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60" />
                            )}
                          </button>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300">
                            {ord.provider}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ord.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="text-slate-300">
                          <div>Item: <strong className="text-white">{ord.packageDescription}</strong></div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            To: {ord.recipientName} ({ord.recipientAddress})
                          </div>
                        </div>

                        <div className="text-slate-300 sm:text-right">
                          <div className="text-emerald-400 font-mono font-bold">
                            5% Platform Fee: +₦{comm.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Base: ₦{ord.estimatedFee.toLocaleString()} • Total: ₦{total.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {ord.riderName && (
                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Rider: <strong className="text-slate-200">{ord.riderName}</strong> ({ord.riderPlate})</span>
                          <span className="font-mono">{ord.riderPhone}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 4. ESCROW VAULT & DISPUTES                                       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'escrow' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Escrow Vault Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Buyer-protected marketplace transactions locked until delivery confirmation.
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  {(['all', 'escrow_secured', 'funds_released', 'disputed'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setEscrowFilter(filter)}
                      className={`px-2.5 py-1 rounded-xl capitalize font-medium ${
                        escrowFilter === filter
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {filter.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredEscrows.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={order.product.imageUrl}
                          alt={order.product.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">
                              #{order.id}
                            </span>
                            <span
                              className={`text-[9px] uppercase font-bold px-2 py-0.2 rounded-full font-mono ${
                                order.status === 'escrow_secured'
                                  ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mt-0.5">
                            {order.product.title}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Buyer: <strong className="text-slate-300">{order.buyerName}</strong> → Seller:{' '}
                            <strong className="text-slate-300">{order.sellerName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black font-mono text-white">
                          {formatPrice(order.totalAmount, order.currency)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          PIN: {order.escrowPin}
                        </span>
                      </div>
                    </div>

                    {order.status === 'escrow_secured' && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Held securely in AGC Escrow Vault
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const note = prompt('Reason for admin refund to buyer:') || 'Admin refund';
                              adminResolveEscrow(order.id, 'refund_to_buyer', note);
                            }}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                          >
                            Refund Buyer
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              adminResolveEscrow(order.id, 'release_to_seller', 'Admin manual verification');
                            }}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                          >
                            Release Funds
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 5. SYSTEM BROADCAST                                              */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Dispatch Global System Announcement
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Pushes a real-time banner notice to every online phone and web client via WebSockets.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Banner Headline
                    </label>
                    <input
                      type="text"
                      value={bcTitle}
                      onChange={(e) => setBcTitle(e.target.value)}
                      placeholder="e.g. Scheduled Network Upgrade / New Payment Gateway Active"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Message Details
                    </label>
                    <textarea
                      rows={3}
                      value={bcMessage}
                      onChange={(e) => setBcMessage(e.target.value)}
                      placeholder="Enter detailed message or emergency instructions..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">Severity:</span>
                      {(['info', 'warning', 'alert', 'urgent'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setBcLevel(level)}
                          className={`px-2.5 py-1 rounded-lg capitalize text-[10px] font-bold ${
                            bcLevel === level
                              ? level === 'urgent'
                                ? 'bg-red-700 text-white animate-pulse'
                                : level === 'alert'
                                ? 'bg-rose-500 text-white'
                                : level === 'warning'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={!bcTitle.trim() || !bcMessage.trim()}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-600/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Push Live to All Devices</span>
                    </button>
                  </div>
                </form>
              </div>

              {systemBroadcast && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                      Currently Active Broadcast
                    </span>
                    <h4 className="text-xs font-bold text-white">
                      {systemBroadcast.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {systemBroadcast.message}
                    </p>
                    <span className="text-[10px] font-mono text-purple-400 block mt-2">
                      Dispatched: {systemBroadcast.createdAt}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSystemBroadcast(null)}
                    className="p-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors font-bold"
                  >
                    Remove Banner
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 7. FEATURE TOGGLES                                               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'features' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <ToggleRight className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Feature Toggles</h3>
                  <p className="text-[11px] text-slate-400">Enable or disable any subsystem across all connected clients in real time.</p>
                </div>
              </div>

              {([
                {
                  group: '💳 Core Finance & Vaults',
                  desc: 'Wallet is the master switch. Disabling it automatically hides and removes all wallet UI, transfers, vaults, and financial tools across the entire system.',
                  flags: [
                    { key: 'wallet', label: 'Wallet (Master Switch)', desc: 'Paystack topup, balances & all monetary operations' },
                    { key: 'p2pTransfers', label: 'P2P Transfers', desc: 'Direct phone-to-phone or account money transfers' },
                    { key: 'escrow', label: 'Escrow Vault', desc: 'Buyer-protected marketplace payments & release mechanisms' },
                    { key: 'ajo', label: 'Ajo / Thrift Circle', desc: 'Rotating communal savings and pot distributions' },
                    { key: 'payroll', label: 'Payroll & Bulk Disbursements', desc: 'Business scheduled salary payments' },
                    { key: 'delayedSend', label: 'Delayed Send (Anti-Fraud)', desc: 'Reversible hold window on transfers' },
                    { key: 'securityPin', label: 'Security PIN', desc: 'Mandatory PIN authentication for transactions' },
                  ],
                },
                {
                  group: '🔧 Services & Dispatch (3-dot Menu)',
                  desc: 'Public on-demand services available in the application menu.',
                  flags: [
                    { key: 'dispatch', label: 'Courier Dispatch (PickkR / Gokada)', desc: 'Doorstep pickup, tracking & delivery bookings' },
                    { key: 'artisan', label: 'Artisan Hub', desc: 'Carpenters, plumbers, electricians & craft bookings' },
                    { key: 'healthcare', label: 'AfriHealth Telehealth', desc: 'Digital clinic queues, consults & prescriptions' },
                    { key: 'legal', label: 'AfriLaw Legal Services', desc: 'Verified African attorneys & contract drafting' },
                    { key: 'jobs', label: 'Job Board & Gig Marketplace', desc: 'Freelance work, gigs & full-time hiring' },
                    { key: 'petShop', label: 'Pet Shop & Veterinary Forum', desc: 'Breeder listings, pet adoption & health questions' },
                    { key: 'errands', label: 'Errands & Runner Network', desc: 'Market runs and grocery pick-up errands' },
                  ],
                },
                {
                  group: '🎨 Creator Economy & Tools',
                  desc: 'Creator tools, learning spaces, and community monetization.',
                  flags: [
                    { key: 'creator', label: 'Creator Hub', desc: 'VIP video calls, tips & exclusive content drops' },
                    { key: 'audioSpaces', label: 'Audio Spaces', desc: 'Live drop-in audio stages with speaker queues' },
                    { key: 'writers', label: 'Writers Guild', desc: 'Serialized book chapters, co-writing & feedback' },
                    { key: 'storeTiers', label: 'Merchant Store Tiers', desc: '₦3k / ₦7k monthly verified merchant stores' },
                    { key: 'tutor', label: 'Tutors & Skill Academy', desc: '1-on-1 tutoring sessions and video courses' },
                    { key: 'referral', label: 'Invite & Earn (Referral)', desc: '₦500 bonus per verified friend invited' },
                    { key: 'memeStudio', label: 'Meme & Sticker Studio', desc: 'African culture sticker creator' },
                    { key: 'scamChecker', label: 'Scam Checker & Fraud Watch', desc: 'Phone number & bank account verification tool' },
                  ],
                },
                {
                  group: '🗺️ Navigation & Communication',
                  desc: 'Core communication primitives and community feeds.',
                  flags: [
                    { key: 'town', label: 'Town Square Feed', desc: 'Public broadcast feed and trending topics' },
                    { key: 'market', label: 'Marketplace Directory', desc: 'Product catalogues and physical vendor listings' },
                    { key: 'status', label: '24h Stories / Status Updates', desc: 'Disappearing photo/video updates' },
                    { key: 'calls', label: 'Voice & Video Calls', desc: 'Real-time WebRTC audio/video call system' },
                    { key: 'voiceNotes', label: 'Voice Notes', desc: 'Audio recording in direct and group messaging' },
                  ],
                },
              ] as { group: string; desc: string; flags: { key: keyof FeatureFlags; label: string; desc: string }[] }[]).map(({ group, desc, flags }) => (
                <div key={group} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">{group}</h4>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                  <div className="space-y-2">
                    {flags.map(({ key, label, desc: flagDesc }) => {
                      const flagKey = key as keyof FeatureFlags;
                      const enabled = featureFlags[flagKey] !== false;
                      const isWalletDependent = ['p2pTransfers', 'escrow', 'ajo', 'payroll', 'delayedSend', 'securityPin'].includes(key as string);
                      const isLockedByWallet = !featureFlags.wallet && isWalletDependent;

                      return (
                        <div
                          key={key as string}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                            isLockedByWallet
                              ? 'bg-slate-950/40 border-slate-800/40 opacity-50'
                              : 'bg-slate-950 border-slate-800/80 hover:border-purple-500/40'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{label}</span>
                              {isLockedByWallet && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-900/40 text-rose-400 border border-rose-800/40 font-bold">
                                  LOCKED (WALLET OFF)
                                </span>
                              )}
                              {key === 'wallet' && !enabled && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-900/40 text-amber-400 border border-amber-800/40 font-bold">
                                  ALL FINANCE DISABLED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{flagDesc}</p>
                          </div>

                          <button
                            type="button"
                            disabled={isLockedByWallet}
                            onClick={() => updateAdminFeatureFlag(flagKey)}
                            className={`shrink-0 w-12 h-6 rounded-full relative transition-colors ${
                              enabled && !isLockedByWallet ? 'bg-purple-600' : 'bg-slate-700'
                            }`}
                            title={enabled ? 'Click to toggle OFF' : 'Click to toggle ON'}
                          >
                            <span
                              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                enabled && !isLockedByWallet ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 8. SYSTEM CONFIG                                                 */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'config' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Configuration</h3>
                    <p className="text-[11px] text-slate-400">Platform-wide parameters persisted to disk and broadcast to all users.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    configSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {configSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Config Saved & Synced!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Save & Apply Platform Settings</span>
                    </>
                  )}
                </button>
              </div>

              {/* Maintenance & Registrations */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Platform Availability & Auth</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Maintenance Mode</div>
                      <div className="text-[10px] text-slate-400">Lock app for non-admins</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCfgMaintenanceMode(!cfgMaintenanceMode)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${cfgMaintenanceMode ? 'bg-rose-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfgMaintenanceMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Allow Registrations</div>
                      <div className="text-[10px] text-slate-400">Accept new accounts</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCfgAllowReg(!cfgAllowReg)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${cfgAllowReg ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfgAllowReg ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Require Phone OTP</div>
                      <div className="text-[10px] text-slate-400">Mandatory SMS code</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCfgRequireOtp(!cfgRequireOtp)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${cfgRequireOtp ? 'bg-purple-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfgRequireOtp ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>

                {cfgMaintenanceMode && (
                  <div className="mt-2">
                    <label className="text-[11px] font-bold text-rose-300 block mb-1">Maintenance Banner Message for Users</label>
                    <textarea
                      rows={2}
                      value={cfgMaintenanceMsg}
                      onChange={(e) => setCfgMaintenanceMsg(e.target.value)}
                      placeholder="e.g. AfriChat is undergoing scheduled system upgrades. Service will resume shortly."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-rose-900/60 bg-rose-950/20 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Commission Percentages */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Commission Percentages (%)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-emerald-400 block">Dispatch Fee (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={cfgDispatchComm}
                        onChange={(e) => setCfgDispatchComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm font-mono font-bold text-white rounded-lg bg-slate-900 border border-slate-700"
                      />
                      <span className="text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-amber-400 block">Escrow Fee (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={cfgEscrowComm}
                        onChange={(e) => setCfgEscrowComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm font-mono font-bold text-white rounded-lg bg-slate-900 border border-slate-700"
                      />
                      <span className="text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-sky-400 block">Artisan Fee (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={cfgArtisanComm}
                        onChange={(e) => setCfgArtisanComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm font-mono font-bold text-white rounded-lg bg-slate-900 border border-slate-700"
                      />
                      <span className="text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-purple-400 block">Creator Fee (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={cfgCreatorComm}
                        onChange={(e) => setCfgCreatorComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm font-mono font-bold text-white rounded-lg bg-slate-900 border border-slate-700"
                      />
                      <span className="text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Limits and Timeouts */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Financial & Fraud Limits</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Min Transfer (₦)</label>
                    <input
                      type="number"
                      min={0}
                      value={cfgMinTransfer}
                      onChange={(e) => setCfgMinTransfer(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs font-mono text-white rounded-lg bg-slate-900 border border-slate-700"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Max Daily Transfer (₦)</label>
                    <input
                      type="number"
                      min={0}
                      value={cfgMaxDailyTransfer}
                      onChange={(e) => setCfgMaxDailyTransfer(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs font-mono text-white rounded-lg bg-slate-900 border border-slate-700"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Delayed Send Hold (Mins)</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={cfgDelayMins}
                      onChange={(e) => setCfgDelayMins(parseInt(e.target.value) || 10)}
                      className="w-full px-2 py-1 text-xs font-mono text-white rounded-lg bg-slate-900 border border-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Official Support Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={cfgSupportPhone}
                    onChange={(e) => setCfgSupportPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 9. CMS & CONTENT                                                 */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'cms' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">CMS & Platform Content</h3>
                    <p className="text-[11px] text-slate-400">Manage marquee tickers, official announcements, help center FAQ, and community guidelines.</p>
                  </div>
                </div>
              </div>

              {/* Marquee Ticker */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">Global Marquee Banner Ticker</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateCmsData({
                        marqueeBanner: {
                          ...(cmsData?.marqueeBanner || { text: '', enabled: false, speedSeconds: 20 }),
                          enabled: !cmsData?.marqueeBanner?.enabled,
                        },
                      })
                    }
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      cmsData?.marqueeBanner?.enabled ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        cmsData?.marqueeBanner?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={cmsData?.marqueeBanner?.text || ''}
                    onChange={(e) =>
                      updateCmsData({
                        marqueeBanner: {
                          ...(cmsData?.marqueeBanner || { enabled: true, speedSeconds: 20 }),
                          text: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter ticker message scrolling at top of app..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Preview status: <strong className={cmsData?.marqueeBanner?.enabled ? 'text-cyan-400' : 'text-slate-500'}>{cmsData?.marqueeBanner?.enabled ? 'Active on all screens' : 'Disabled'}</strong></span>
                    <span>Speed: 20s loop</span>
                  </div>
                </div>
              </div>

              {/* Official Announcements */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white">Official Announcements</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{(cmsData?.announcements || []).length} items</span>
                </div>

                {/* Create New Announcement */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={cmsNewAnnTitle}
                    onChange={(e) => setCmsNewAnnTitle(e.target.value)}
                    placeholder="Announcement Title (e.g. Welcome to AfriChat 2.0)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <textarea
                    rows={2}
                    value={cmsNewAnnMsg}
                    onChange={(e) => setCmsNewAnnMsg(e.target.value)}
                    placeholder="Announcement body content..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!cmsNewAnnTitle.trim() || !cmsNewAnnMsg.trim()}
                      onClick={() => {
                        const newAnn: CmsAnnouncement = {
                          id: `ann_${Date.now()}`,
                          title: cmsNewAnnTitle.trim(),
                          content: cmsNewAnnMsg.trim(),
                          level: 'info',
                          audience: 'all',
                          active: true,
                          createdAt: new Date().toISOString(),
                        };
                        updateCmsData({ announcements: [newAnn, ...(cmsData?.announcements || [])] });
                        setCmsNewAnnTitle('');
                        setCmsNewAnnMsg('');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Post Announcement</span>
                    </button>
                  </div>
                </div>

                {/* Announcement List */}
                <div className="space-y-2">
                  {(cmsData?.announcements || []).map((ann, idx) => (
                    <div
                      key={ann.id || idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-white truncate">{ann.title}</h5>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              ann.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {ann.active ? 'LIVE' : 'HIDDEN'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{ann.content || (ann as any).message}</p>
                        <span className="text-[9px] text-slate-500 font-mono block mt-1">{ann.createdAt ? new Date(ann.createdAt).toLocaleString() : 'Just now'}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(cmsData?.announcements || [])];
                            updated[idx] = { ...updated[idx], active: !updated[idx].active };
                            updateCmsData({ announcements: updated });
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            ann.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {ann.active ? 'Active' : 'Hidden'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (cmsData?.announcements || []).filter((_, i) => i !== idx);
                            updateCmsData({ announcements: updated });
                          }}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!cmsData?.announcements || cmsData.announcements.length === 0) && (
                    <div className="text-center py-4 text-xs text-slate-500">No announcements posted yet.</div>
                  )}
                </div>
              </div>

              {/* FAQ Management */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white">Help Center FAQ Articles</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{(cmsData?.faqArticles || []).length} articles</span>
                </div>

                {/* Add FAQ */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={cmsFaqQuestion}
                    onChange={(e) => setCmsFaqQuestion(e.target.value)}
                    placeholder="Question (e.g. How does Escrow protection work?)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <textarea
                    rows={2}
                    value={cmsFaqAnswer}
                    onChange={(e) => setCmsFaqAnswer(e.target.value)}
                    placeholder="Detailed explanation..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!cmsFaqQuestion.trim() || !cmsFaqAnswer.trim()}
                      onClick={() => {
                        const newFaq: CmsFaqItem = {
                          id: `faq_${Date.now()}`,
                          question: cmsFaqQuestion.trim(),
                          answer: cmsFaqAnswer.trim(),
                          category: 'general',
                          published: true,
                        };
                        updateCmsData({ faqArticles: [...(cmsData?.faqArticles || []), newFaq] });
                        setCmsFaqQuestion('');
                        setCmsFaqAnswer('');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Article</span>
                    </button>
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-2">
                  {(cmsData?.faqArticles || []).map((item: CmsFaqItem, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-purple-300">Q: {item.question}</h5>
                        <p className="text-[11px] text-slate-300 mt-1">A: {item.answer}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (cmsData?.faqArticles || []).filter((_, i) => i !== idx);
                          updateCmsData({ faqArticles: updated });
                        }}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!cmsData?.faqArticles || cmsData.faqArticles.length === 0) && (
                    <div className="text-center py-4 text-xs text-slate-500">No FAQ articles published.</div>
                  )}
                </div>
              </div>

              {/* Community Guidelines */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">Community Rules & Guidelines</h4>
                </div>
                <textarea
                  rows={4}
                  value={cmsGuidelines}
                  onChange={(e) => setCmsGuidelines(e.target.value)}
                  placeholder="Enter community conduct rules, escrow safety advice, and marketplace terms..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">Displayed in settings and new user onboarding</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateCmsData({ communityGuidelines: cmsGuidelines });
                      setCmsSaved(true);
                      setTimeout(() => setCmsSaved(false), 2500);
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      cmsSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {cmsSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{cmsSaved ? 'Guidelines Saved!' : 'Save Community Rules'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 6. TELEMETRY & CLOUD NODE                                        */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        Supabase Cloud Cluster
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        https://sejiretcywvqbzbqalbg.supabase.co
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={pingStatus === 'testing'}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Ping Supabase</span>
                  </button>
                </div>

                {pingStatus !== 'idle' && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
                      pingStatus === 'success'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                        : pingStatus === 'error'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                        : 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p>{pingMessage}</p>
                      {pingLatency !== null && (
                        <p className="text-[10px] font-mono mt-0.5 font-bold">Roundtrip Latency: {pingLatency}ms</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Node Metrics Specs */}
                <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Gateway Port</span>
                    <span className="text-slate-200">http://{socketHost}:3002</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Process Memory</span>
                    <span className="text-emerald-400 font-bold">{liveMetrics?.serverMemoryMb ?? 48} MB Used</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Server Uptime</span>
                    <span className="text-slate-200 font-bold">{liveMetrics?.uptimeSeconds ? formatUptime(liveMetrics.uptimeSeconds) : 'Online'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1">
                    <span className="text-slate-400">Active Communities</span>
                    <span className="text-purple-400 font-bold">{liveMetrics?.communitiesCount ?? 6} Town Groups</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Executive Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Last polled: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-md shadow-purple-600/30"
          >
            Close Console
          </button>
        </div>

      </div>
    </div>
  );
};
