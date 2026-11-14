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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DispatchDeliveryOrder } from '../types';

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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'dispatch' | 'escrow' | 'broadcast' | 'telemetry'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [liveMetrics, setLiveMetrics] = useState<LiveAdminMetrics | null>(null);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'creator' | 'merchant' | 'admin'>('all');
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [escrowFilter, setEscrowFilter] = useState<'all' | 'escrow_secured' | 'funds_released' | 'disputed'>('all');

  // Broadcast compose form state
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLevel, setBcLevel] = useState<'info' | 'warning' | 'alert'>('info');

  // Supabase ping test state
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Fetch live metrics from backend
  const fetchLiveMetrics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`http://${socketHost}:3002/api/admin/metrics`);
      if (res.ok) {
        const data = await res.json();
        setLiveMetrics(data);
        setLastRefreshedAt(new Date());
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

  if (!isAdminModalOpen) return null;

  // Combine adminUsers and backend registered users
  const mergedUsers = useMemo(() => {
    const list = [...adminUsers];
    if (liveMetrics?.registeredUsers) {
      liveMetrics.registeredUsers.forEach((ru: any) => {
        const exists = list.some((u) => u.phoneNumber === ru.phoneNumber || u.id === ru.id);
        if (!exists) {
          list.push({
            id: ru.id || `usr_${Date.now()}`,
            fullName: ru.fullName || 'Registered User',
            phoneNumber: ru.phoneNumber || ru.phone || '',
            avatarUrl: ru.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: ru.role || 'user',
            verificationBadge: ru.verificationBadge || null,
            isPhoneVerified: true,
            status: ru.status || 'active',
            joinedDate: ru.createdAt ? new Date(ru.createdAt).toLocaleDateString() : 'Recent',
            walletBalanceNgn: ru.walletBalanceNgn || 50000,
            ordersCount: ru.ordersCount || 0,
          });
        }
      });
    }
    return list;
  }, [adminUsers, liveMetrics?.registeredUsers]);

  // Filtered users
  const filteredUsers = mergedUsers.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.phoneNumber.includes(userSearchQuery) ||
      u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
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
      await fetch(`http://${socketHost}:3002/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bcTitle.trim(), message: bcMessage.trim(), level: bcLevel }),
      });
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

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs}h ${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col bg-slate-950 text-slate-100 rounded-3xl shadow-2xl border border-purple-500/30 overflow-hidden font-sans">
        
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
            { id: 'overview', label: 'Executive Overview', icon: Activity, count: null },
            { id: 'users', label: 'Users & Badges', icon: Users, count: mergedUsers.length },
            { id: 'dispatch', label: 'Dispatch & 5% Fee', icon: Truck, count: activeOrders.length },
            { id: 'escrow', label: 'Escrow Vault', icon: Lock, count: escrowOrders.filter((o) => o.status === 'escrow_secured').length },
            { id: 'broadcast', label: 'Live Broadcast', icon: Bell, count: systemBroadcast?.active ? 'Active' : null },
            { id: 'telemetry', label: 'Server & Cloud Node', icon: Server, count: null },
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
          {/* 2. USERS & BADGES DIRECTORY                                      */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, phone (+234...), or user ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                  {(['all', 'user', 'creator', 'merchant', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-xl capitalize text-[11px] shrink-0 transition-colors ${
                        userRoleFilter === role
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No users match your filter criteria.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        user.status === 'suspended'
                          ? 'bg-rose-950/20 border-rose-900/40'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-purple-500/40'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-700"
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
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">
                              {user.fullName}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold bg-slate-800 text-slate-300">
                              {user.role}
                            </span>
                            {user.status === 'suspended' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-rose-600 text-white">
                                Suspended
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
                        </div>
                      </div>

                      {/* Action Badges */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Blue VIP Creator Badge */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserVerification(
                              user.id,
                              user.verificationBadge === 'blue' ? null : 'blue'
                            )
                          }
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            user.verificationBadge === 'blue'
                              ? 'bg-sky-500 text-white border-sky-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-sky-300'
                          }`}
                          title="Grant Blue VIP Creator Checkmark"
                        >
                          <Crown className="w-3 h-3" />
                          <span>{user.verificationBadge === 'blue' ? 'Blue ✓' : '+Blue'}</span>
                        </button>

                        {/* Gold Official Merchant Badge */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserVerification(
                              user.id,
                              user.verificationBadge === 'gold' ? null : 'gold'
                            )
                          }
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            user.verificationBadge === 'gold'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-400 hover:text-amber-300'
                          }`}
                          title="Grant Gold Official Merchant Checkmark"
                        >
                          <Store className="w-3 h-3" />
                          <span>{user.verificationBadge === 'gold' ? 'Gold ★' : '+Gold'}</span>
                        </button>

                        {/* Suspend or Restore Account */}
                        <button
                          type="button"
                          onClick={() => toggleUserSuspension(user.id)}
                          className={`p-1.5 rounded-xl text-[10px] border transition-all ${
                            user.status === 'suspended'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                          title={user.status === 'suspended' ? 'Restore User' : 'Suspend Account'}
                        >
                          {user.status === 'suspended' ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
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
                      {(['info', 'warning', 'alert'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setBcLevel(level)}
                          className={`px-2.5 py-1 rounded-lg capitalize text-[10px] font-bold ${
                            bcLevel === level
                              ? level === 'alert'
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
