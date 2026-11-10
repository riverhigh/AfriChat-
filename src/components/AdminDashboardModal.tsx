import React, { useState } from 'react';
import {
  ShieldCheck,
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';

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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'escrow' | 'broadcast' | 'supabase'>('overview');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'creator' | 'merchant' | 'admin'>('all');
  const [escrowFilter, setEscrowFilter] = useState<'all' | 'escrow_secured' | 'funds_released' | 'disputed'>('all');

  // Broadcast compose form state
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLevel, setBcLevel] = useState<'info' | 'warning' | 'alert'>('info');

  // Supabase ping test state
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('');

  if (!isAdminModalOpen) return null;

  // Filtered users
  const filteredUsers = adminUsers.filter((u) => {
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

  // Calculated platform stats
  const totalEscrowLockedNgn = escrowOrders
    .filter((o) => o.status === 'escrow_secured')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const activeSpacesCount = audioSpaces.filter((s) => s.isLive).length;
  const verifiedUsersCount = adminUsers.filter((u) => u.verificationBadge).length;

  const handleTestSupabase = async () => {
    setPingStatus('testing');
    setPingMessage('Testing connection to Supabase Auth & REST endpoints...');
    const start = performance.now();
    try {
      // Test Supabase Auth settings endpoint
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
        setPingMessage(`Supabase connection successful! Responded in ${latencyMs}ms. Auth & Project Gateway verified.`);
      } else {
        setPingStatus('error');
        setPingMessage(`Supabase returned HTTP status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      setPingStatus('error');
      setPingMessage(`Supabase connection error: ${err.message || 'Network unreachable'}`);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcMessage.trim()) return;
    createAdminBroadcast(bcTitle.trim(), bcMessage.trim(), bcLevel);
    setBcTitle('');
    setBcMessage('');
    alert('System broadcast successfully dispatched to all AGC clients!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-[#12111d] rounded-3xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden text-slate-900 dark:text-white">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight font-display">
                  AGC Super Admin Console
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Root
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Cloud Node:</span>
                <span className="font-mono text-emerald-300">sejiretcywvqbzbqalbg</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(false)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close Admin Console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-[#161426] overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Badges</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-purple-900/30 text-purple-200 rounded-full font-mono">
              {adminUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escrow')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'escrow'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Escrow Desk</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-500 rounded-full font-mono">
              {escrowOrders.filter((o) => o.status === 'escrow_secured').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'broadcast'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Broadcast</span>
            {systemBroadcast?.active && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'supabase'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Cloud</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Total Users</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black font-display text-slate-900 dark:text-white">
                    {adminUsers.length}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {verifiedUsersCount} Verified Badges
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Escrow Secured</span>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                    {formatPrice(totalEscrowLockedNgn, 'NGN')}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {escrowOrders.filter((o) => o.status === 'escrow_secured').length} active vaults
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Street Radio</span>
                    <Radio className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black font-display text-slate-900 dark:text-white">
                    {activeSpacesCount} Live
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    Real-time audio rooms
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Artisans</span>
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black font-display text-slate-900 dark:text-white">
                    {serviceProviders.length}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    Registered stations
                  </p>
                </div>
              </div>

              {/* Active Broadcast Alert Box */}
              {systemBroadcast && systemBroadcast.active && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                          Live Global Announcement
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{systemBroadcast.createdAt}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {systemBroadcast.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-neutral-300 mt-0.5">
                        {systemBroadcast.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemBroadcast(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white font-medium underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Quick Actions Panel */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Quick Moderation Shortcuts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-purple-500 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Verify Creators</p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">Issue Blue Checkmarks</p>
                    </div>
                    <Crown className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('escrow')}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-amber-500 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Resolve Disputes</p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">Release or Refund Vaults</p>
                    </div>
                    <Lock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('supabase')}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-emerald-500 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Database Health</p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">Supabase Cloud Status</p>
                    </div>
                    <Database className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS & BADGES TAB */}
          {activeTab === 'users' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, or ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
                  {(['all', 'user', 'creator', 'merchant', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-2.5 py-1.5 rounded-lg capitalize text-[11px] shrink-0 transition-colors ${
                        userRoleFilter === role
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">No users match your filter criteria.</p>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        user.status === 'suspended'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                          : user.status === 'flagged'
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                          : 'bg-white dark:bg-neutral-900 border-slate-200/80 dark:border-neutral-800'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-neutral-700"
                          />
                          {user.verificationBadge === 'blue' && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
                              ✓
                            </span>
                          )}
                          {user.verificationBadge === 'gold' && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
                              ★
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {user.fullName}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                              {user.role}
                            </span>
                            {user.status === 'suspended' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-rose-500 text-white">
                                Suspended
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                            {user.phoneNumber}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>Balance: {formatPrice(user.walletBalanceNgn, 'NGN')}</span>
                            <span>•</span>
                            <span>Orders: {user.ordersCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Toggle Blue VIP Badge */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserVerification(
                              user.id,
                              user.verificationBadge === 'blue' ? null : 'blue'
                            )
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                            user.verificationBadge === 'blue'
                              ? 'bg-sky-500 text-white border-sky-600'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                          }`}
                          title="Assign Blue Celebrity / Creator Badge"
                        >
                          <Crown className="w-3 h-3 text-sky-400" />
                          <span>{user.verificationBadge === 'blue' ? 'Blue ✓' : '+Blue'}</span>
                        </button>

                        {/* Toggle Gold Merchant Badge */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserVerification(
                              user.id,
                              user.verificationBadge === 'gold' ? null : 'gold'
                            )
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                            user.verificationBadge === 'gold'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          }`}
                          title="Assign Gold Official Merchant Badge"
                        >
                          <Store className="w-3 h-3 text-amber-400" />
                          <span>{user.verificationBadge === 'gold' ? 'Gold ★' : '+Gold'}</span>
                        </button>

                        {/* Suspend / Restore */}
                        <button
                          type="button"
                          onClick={() => toggleUserSuspension(user.id)}
                          className={`p-1.5 rounded-lg text-[10px] border transition-colors ${
                            user.status === 'suspended'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20'
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

          {/* 3. ESCROW & DISPUTES TAB */}
          {activeTab === 'escrow' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    Escrow Vault Ledger
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Buyer-protected transactions locked until delivery confirmation.
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  {(['all', 'escrow_secured', 'funds_released', 'disputed'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setEscrowFilter(filter)}
                      className={`px-2 py-1 rounded-lg capitalize ${
                        escrowFilter === filter
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      {filter.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredEscrows.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">No escrow orders in this category.</p>
                ) : (
                  filteredEscrows.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={order.product.imageUrl}
                            alt={order.product.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-neutral-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                #{order.id}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-bold px-2 py-0.2 rounded-full font-mono ${
                                  order.status === 'escrow_secured'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
                                    : order.status === 'funds_released'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200 line-clamp-1 mt-0.5">
                              {order.product.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                              Buyer: <strong className="text-slate-700 dark:text-neutral-300">{order.buyerName}</strong> → Seller:{' '}
                              <strong className="text-slate-700 dark:text-neutral-300">{order.sellerName}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {formatPrice(order.totalAmount, order.currency)}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            PIN: {order.escrowPin}
                          </span>
                        </div>
                      </div>

                      {/* Escrow Resolution Actions (Available if locked) */}
                      {order.status === 'escrow_secured' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-500" />
                            Funds held securely in AGC Escrow Vault
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const note = prompt('Reason for admin refund to buyer (optional):') || 'Dispute resolved in buyer favour';
                                adminResolveEscrow(order.id, 'refund_to_buyer', note);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition-colors"
                            >
                              Refund Buyer
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                adminResolveEscrow(order.id, 'release_to_seller', 'Admin manual verification');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                            >
                              Force Release Funds
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. BROADCAST TAB */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2">
                  Dispatch Global System Announcement
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mb-4">
                  Broadcasts a real-time banner notice to all online AGC users across mobile and web clients.
                </p>

                <form onSubmit={handleSendBroadcast} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Banner Headline
                    </label>
                    <input
                      type="text"
                      value={bcTitle}
                      onChange={(e) => setBcTitle(e.target.value)}
                      placeholder="e.g. Scheduled Network Upgrade / New Payment Gateway Active"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Message Details
                    </label>
                    <textarea
                      rows={3}
                      value={bcMessage}
                      onChange={(e) => setBcMessage(e.target.value)}
                      placeholder="Enter detailed instructions or message for users..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Alert Level:</span>
                      {(['info', 'warning', 'alert'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setBcLevel(level)}
                          className={`px-2 py-1 rounded-lg capitalize text-[10px] font-bold ${
                            bcLevel === level
                              ? level === 'alert'
                                ? 'bg-rose-500 text-white'
                                : level === 'warning'
                                ? 'bg-amber-500 text-white'
                                : 'bg-purple-600 text-white'
                              : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={!bcTitle.trim() || !bcMessage.trim()}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to All Users</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Broadcast Status */}
              {systemBroadcast && (
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                      Current Active Broadcast
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {systemBroadcast.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
                      {systemBroadcast.message}
                    </p>
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 block mt-2">
                      Dispatched: {systemBroadcast.createdAt}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSystemBroadcast(null)}
                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-bold"
                  >
                    Remove Banner
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. SUPABASE CLOUD TAB */}
          {activeTab === 'supabase' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Supabase Cloud Instance Status
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                        https://sejiretcywvqbzbqalbg.supabase.co
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={pingStatus === 'testing'}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Ping Supabase</span>
                  </button>
                </div>

                {/* Ping Result Box */}
                {pingStatus !== 'idle' && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
                      pingStatus === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : pingStatus === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p>{pingMessage}</p>
                      {pingLatency !== null && (
                        <p className="text-[10px] font-mono mt-0.5 font-bold">Latency: {pingLatency}ms</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Configuration Specs */}
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-100 dark:border-neutral-800/60">
                    <span className="text-slate-500">Project Endpoint</span>
                    <span className="text-slate-800 dark:text-neutral-200">https://sejiretcywvqbzbqalbg.supabase.co</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-100 dark:border-neutral-800/60">
                    <span className="text-slate-500">Key Type</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">sb_publishable (Standard Client Anon)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-100 dark:border-neutral-800/60">
                    <span className="text-slate-500">Database Engine</span>
                    <span className="text-slate-800 dark:text-neutral-200">PostgreSQL (Real-Time Websockets Enabled)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono py-1">
                    <span className="text-slate-500">Service File</span>
                    <span className="text-purple-600 dark:text-purple-400">src/services/supabase.ts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#161426] border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>AGC Admin Core v2.4</span>
          </span>

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-white font-bold transition-colors"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
