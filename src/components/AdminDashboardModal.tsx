import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Users,
  Lock,
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
  Truck,
  Server,
  Zap,
  DollarSign,
  Copy,
  CheckCircle2,
  Sliders,
  FileText,
  Megaphone,
  HelpCircle,
  MessageSquare,
  PlusCircle,
  Trash2,
  ShieldAlert,
  BadgeCheck,
  LayoutDashboard,
  Scale,
  Wrench,
  Radio,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Download,
  ExternalLink,
  KeyRound,
  ChevronDown,
  FileSearch,
  Eye,
  UserCheck,
  Globe,
  Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FeatureFlags, CmsAnnouncement, CmsFaqItem, EscrowOrder } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getSocket } from '../services/socket';
import { AdminAuditDrawer, AdminAuditEntry, AdminWebhookLog } from './admin/AdminAuditDrawer';
import { DualAdminApprovalModal } from './admin/DualAdminApprovalModal';
import { EscrowDisputeModal } from './admin/EscrowDisputeModal';

type AdminSection = 'overview' | 'finance' | 'stores' | 'users' | 'comms' | 'security';
type FinanceSubTab = 'escrows' | 'disputes' | 'dispatch' | 'webhooks' | 'payouts';
type UsersSubTab = 'directory' | 'kyc' | 'artisans';
type CommsSubTab = 'nodes' | 'broadcast' | 'cms';
type SecuritySubTab = 'waf' | 'audit' | 'features' | 'config' | 'rbac';

interface SecurityEventItem {
  id: string;
  type: 'waf_block' | 'rate_limit' | 'bot_block' | 'banned_attempt' | 'ip_blocked' | 'webhook_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  path: string;
  reason: string;
  timestamp: string;
}

interface BlockedIpItem {
  ip: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
}

interface LiveStoreRecord {
  id: string;
  storeName: string;
  description: string;
  category: string;
  tier: 'starter_30' | 'pro_100' | string;
  itemsLimit: number;
  itemsCount: number;
  ownerName: string;
  ownerPhone: string;
  status: 'active' | 'pending' | 'suspended' | string;
  verified: boolean;
  createdAt: string;
  source: 'supabase' | 'client' | 'directory';
}

interface LiveArtisanRecord {
  id: string;
  stationName: string;
  category: string;
  location: string;
  workshopAddress: string;
  ownerName: string;
  ownerPhone: string;
  isApproved: boolean;
  registrationFeePaid: boolean;
  createdAt: string;
}

interface LiveAdminMetrics {
  uptimeSeconds: number;
  serverMemoryMb: number;
  onlineUsersCount: number;
  onlineUsers: Array<{ userId: string; userName: string; avatar?: string }>;
  registeredUsersCount: number;
  registeredUsers: any[];
  communitiesCount: number;
  communities?: any[];
  activeStatusesCount: number;
  dispatch: {
    totalOrdersCount: number;
    activeDeliveriesCount: number;
    completedDeliveriesCount: number;
    totalVolumeNgn: number;
    totalCommissionNgn: number;
    orders: any[];
  };
  stores?: any[];
  artisans?: any[];
  securityEvents?: SecurityEventItem[];
  blockedIps?: BlockedIpItem[];
  auditTrail?: AdminAuditEntry[];
  webhookLogs?: AdminWebhookLog[];
  systemStatus: string;
}

interface HealthSubsystems {
  supabase: { status: 'healthy' | 'degraded' | 'offline'; httpStatus?: number; latencyMs: number };
  paystack: { status: 'healthy' | 'degraded' | 'offline'; httpStatus?: number; latencyMs: number };
  websocket: { status: 'healthy' | 'degraded' | 'offline'; connectedClients: number; onlineUsersCount: number };
}

const DUAL_ADMIN_THRESHOLD_NGN = 100000;

export const AdminDashboardModal: React.FC = () => {
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    adminUsers,
    refreshAdminUsers,
    toggleUserVerification,
    escrowOrders,
    adminResolveEscrow,
    systemBroadcast,
    createAdminBroadcast,
    clearAdminBroadcast,
    formatPrice,
    audioSpaces,
    serviceProviders,
    artisanStation,
    storeSubscription,
    chats,
    messages,
    wallet,
    dispatchOrders,
    systemConfig,
    updateSystemConfig,
    updateAdminFeatureFlag,
    featureFlags,
    cmsData,
    updateCmsData,
    setUserStatus,
    setUserRole,
    banUser,
    unbanUser,
    adjustUserWallet,
    kickUserSession,
    currentUser,
    isUserOnline,
  } = useApp();

  // Navigation & Shell State
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [financeTab, setFinanceTab] = useState<FinanceSubTab>('escrows');
  const [usersTab, setUsersTab] = useState<UsersSubTab>('directory');
  const [commsTab, setCommsTab] = useState<CommsSubTab>('nodes');
  const [securityTab, setSecurityTab] = useState<SecuritySubTab>('waf');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [healthPopoverOpen, setHealthPopoverOpen] = useState(false);

  // Global Command Search (Ctrl+K)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Live Telemetry & Backend Data
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [liveMetrics, setLiveMetrics] = useState<LiveAdminMetrics | null>(null);
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<HealthSubsystems | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  // Security & Audit live state
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIpItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AdminAuditEntry[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<AdminWebhookLog[]>([]);
  const [blockIpInput, setBlockIpInput] = useState('');
  const [blockIpReason, setBlockIpReason] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Admin Session Token (RBAC panel)
  const [sessionToken, setSessionToken] = useState(() => `AGC-ADM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  // Drawers & Modals
  const [auditDrawerState, setAuditDrawerState] = useState<{
    isOpen: boolean;
    refId: string | null;
    title?: string;
    amountNgn?: number;
    order?: EscrowOrder | null;
  }>({ isOpen: false, refId: null });

  const [disputeOrder, setDisputeOrder] = useState<EscrowOrder | null>(null);

  const [dualApprovalRequest, setDualApprovalRequest] = useState<{
    isOpen: boolean;
    actionLabel: string;
    targetSummary: string;
    amountNgn: number;
    errorMsg: string | null;
    isSubmitting: boolean;
    payload:
      | { kind: 'escrow'; order: EscrowOrder; action: 'release_to_seller' | 'refund_to_buyer'; note: string }
      | { kind: 'payout'; phoneOrId: string; userName: string; delta: number; note: string }
      | null;
  }>({
    isOpen: false,
    actionLabel: '',
    targetSummary: '',
    amountNgn: 0,
    errorMsg: null,
    isSubmitting: false,
    payload: null,
  });

  // Section Filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'creator' | 'merchant' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned' | 'flagged'>('all');
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [escrowFilter, setEscrowFilter] = useState<'all' | 'escrow_secured' | 'funds_released' | 'disputed'>('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [storeStatusFilter, setStoreStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');

  // Manual Payout Form State
  const [payoutTargetPhone, setPayoutTargetPhone] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutFeedback, setPayoutFeedback] = useState<string | null>(null);

  // Customer Info Dossier Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerBanReason, setCustomerBanReason] = useState('');
  const [customerWalletDelta, setCustomerWalletDelta] = useState('');
  const [customerWalletSuccess, setCustomerWalletSuccess] = useState(false);

  // Broadcast compose form state
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLevel, setBcLevel] = useState<'info' | 'warning' | 'alert' | 'urgent'>('info');
  const [bcNotice, setBcNotice] = useState<string | null>(null);

  // Copy & toast feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

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
  const [configError, setConfigError] = useState<string | null>(null);
  const [featureStatusMsg, setFeatureStatusMsg] = useState<string | null>(null);
  const [badgeStatusMsg, setBadgeStatusMsg] = useState<string | null>(null);

  // CMS form state
  const [cmsNewAnnTitle, setCmsNewAnnTitle] = useState('');
  const [cmsNewAnnMsg, setCmsNewAnnMsg] = useState('');
  const [cmsFaqQuestion, setCmsFaqQuestion] = useState('');
  const [cmsFaqAnswer, setCmsFaqAnswer] = useState('');
  const [cmsMarqueeDraft, setCmsMarqueeDraft] = useState('');
  const [cmsMarqueeSaved, setCmsMarqueeSaved] = useState(false);
  const [cmsGuidelines, setCmsGuidelines] = useState('');
  const [cmsSaved, setCmsSaved] = useState(false);

  const notify = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setActionNotice({ text, tone });
    setTimeout(() => setActionNotice(null), 3200);
  };

  const fetchSupabaseUsers = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.from('agc_phone_registry').select('*');
      if (!error && Array.isArray(data)) {
        setSupabaseUsers(data);
      }
    } catch (_) {}
  };

  const fetchHealthProbe = async () => {
    setHealthChecking(true);
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const data = await res.json();
        if (data?.subsystems) setHealthData(data.subsystems);
      }
    } catch (_) {
    } finally {
      setHealthChecking(false);
    }
  };

  const fetchLiveMetrics = async () => {
    setIsRefreshing(true);
    fetchSupabaseUsers();
    refreshAdminUsers?.();
    try {
      const res = await fetch('/api/admin/metrics').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setLiveMetrics(data);
        if (Array.isArray(data.securityEvents)) setSecurityEvents(data.securityEvents);
        if (Array.isArray(data.blockedIps)) setBlockedIps(data.blockedIps);
        if (Array.isArray(data.auditTrail)) setAuditTrail(data.auditTrail);
        if (Array.isArray(data.webhookLogs)) setWebhookLogs(data.webhookLogs);
        setLastRefreshedAt(new Date());
      } else {
        const uRes = await fetch('/api/users').catch(() => null);
        if (uRes && uRes.ok) {
          const uData = await uRes.json();
          if (Array.isArray(uData.users)) {
            setLiveMetrics((prev) => ({
              uptimeSeconds: prev?.uptimeSeconds || 3600,
              serverMemoryMb: prev?.serverMemoryMb || 48,
              onlineUsersCount: uData.users.filter((u: any) => u.lastSeen === 'online').length,
              onlineUsers: uData.users.filter((u: any) => u.lastSeen === 'online'),
              registeredUsersCount: uData.users.length,
              registeredUsers: uData.users,
              communitiesCount: prev?.communitiesCount || 0,
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
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for Global Search
  useEffect(() => {
    if (!isAdminModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
        setTimeout(() => globalSearchInputRef.current?.focus(), 40);
      } else if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdminModalOpen, globalSearchOpen]);

  // Live metrics + health polling + Supabase realtime + Socket.IO security/audit stream
  useEffect(() => {
    if (!isAdminModalOpen) return;
    fetchLiveMetrics();
    fetchSupabaseUsers();
    fetchHealthProbe();

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('admin_phone_reg_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'agc_phone_registry' }, () => {
            fetchSupabaseUsers();
          })
          .subscribe();
      } catch (_) {}
    }

    const sock = getSocket();
    const onAuditAppended = (payload: any) => {
      if (payload?.auditEntry) {
        setAuditTrail((prev) => [payload.auditEntry, ...prev.filter((a) => a.id !== payload.auditEntry.id)].slice(0, 120));
      }
      if (payload?.webhookLog) {
        setWebhookLogs((prev) => [payload.webhookLog, ...prev.filter((w) => w.id !== payload.webhookLog.id)].slice(0, 80));
      }
    };
    const onSecurityUpdated = (payload: any) => {
      if (Array.isArray(payload?.blockedIps)) setBlockedIps(payload.blockedIps);
      if (payload?.securityEvent) {
        setSecurityEvents((prev) => [payload.securityEvent, ...prev].slice(0, 80));
      }
      if (payload?.auditEntry) {
        setAuditTrail((prev) => [payload.auditEntry, ...prev].slice(0, 120));
      }
      if (payload?.webhookLog) {
        setWebhookLogs((prev) => [payload.webhookLog, ...prev].slice(0, 80));
      }
    };
    const onStoreOrArtisanUpdated = () => {
      fetchLiveMetrics();
    };

    if (sock) {
      sock.on('admin_audit_appended', onAuditAppended);
      sock.on('admin_security_updated', onSecurityUpdated);
      sock.on('admin_store_updated', onStoreOrArtisanUpdated);
      sock.on('admin_artisan_updated', onStoreOrArtisanUpdated);
    }

    const interval = autoRefresh
      ? setInterval(() => {
          fetchLiveMetrics();
          fetchSupabaseUsers();
        }, 6000)
      : null;

    return () => {
      if (interval) clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
      if (sock) {
        sock.off('admin_audit_appended', onAuditAppended);
        sock.off('admin_security_updated', onSecurityUpdated);
        sock.off('admin_store_updated', onStoreOrArtisanUpdated);
        sock.off('admin_artisan_updated', onStoreOrArtisanUpdated);
      }
    };
  }, [isAdminModalOpen, autoRefresh]);

  // Comprehensive Live User Aggregator (Supabase + /api/users + Socket.IO + Current User)
  const mergedUsers = useMemo(() => {
    const map = new Map<string, any>();

    const normalizePhoneKey = (phoneOrId?: string) => {
      const digits = (phoneOrId || '').replace(/\D/g, '');
      if (!digits) return '';
      return digits.length >= 9 ? digits.slice(-9) : digits;
    };

    const addUser = (raw: any, authoritative = true) => {
      if (!raw) return;
      const phone = (raw.phoneNumber || raw.phone || raw.full_phone || '').trim();
      const digits = (phone || raw.phone_digits || raw.id || '').replace(/\D/g, '');
      const id = raw.id || (digits ? `usr_${digits}` : `usr_${Date.now()}`);
      const key = normalizePhoneKey(phone || raw.phone_digits || id) || id;
      if (!key) return;

      const isCurrent = Boolean(
        currentUser?.phoneNumber &&
          ((phone && normalizePhoneKey(currentUser.phoneNumber) === normalizePhoneKey(phone)) ||
            (digits && normalizePhoneKey(currentUser.phoneNumber) === normalizePhoneKey(digits)))
      );
      const online = Boolean(
        isCurrent ||
          raw.isOnline ||
          raw.lastSeen === 'online' ||
          (digits && isUserOnline?.(digits)) ||
          (phone && isUserOnline?.(phone)) ||
          isUserOnline?.(id)
      );

      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          id: existing.id || id,
          fullName: raw.fullName || raw.name || existing.fullName,
          phoneNumber: phone || existing.phoneNumber,
          avatarUrl: raw.avatarUrl || existing.avatarUrl,
          role: authoritative ? raw.role || existing.role || 'user' : existing.role || raw.role || 'user',
          verificationBadge: authoritative
            ? raw.verificationBadge !== undefined
              ? raw.verificationBadge
              : existing.verificationBadge ?? null
            : existing.verificationBadge ?? raw.verificationBadge ?? null,
          isPhoneVerified: raw.isPhoneVerified !== undefined ? Boolean(raw.isPhoneVerified) : existing.isPhoneVerified,
          status: authoritative ? raw.status || existing.status || 'active' : existing.status || raw.status || 'active',
          kycStatus: raw.kycStatus || existing.kycStatus || 'unverified',
          kycType: raw.kycType || existing.kycType || 'BVN',
          bannedAt: authoritative ? raw.bannedAt ?? existing.bannedAt : existing.bannedAt ?? raw.bannedAt,
          banReason: authoritative ? raw.banReason ?? existing.banReason : existing.banReason ?? raw.banReason,
          joinedDate: raw.joinedDate || (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : existing.joinedDate) || 'Recent',
          walletBalanceNgn: authoritative
            ? raw.walletBalanceNgn ?? existing.walletBalanceNgn ?? 50000
            : existing.walletBalanceNgn ?? raw.walletBalanceNgn ?? 50000,
          ordersCount: raw.ordersCount ?? existing.ordersCount ?? 0,
          deviceInfo: raw.deviceInfo || existing.deviceInfo,
          isOnline: existing.isOnline || online,
          lastSeen: online ? 'online' : raw.lastSeen || existing.lastSeen || 'Recently active',
        });
      } else {
        map.set(key, {
          id,
          fullName: raw.fullName || raw.name || (isCurrent ? currentUser.fullName || 'You' : 'Registered User'),
          phoneNumber: phone || (isCurrent ? currentUser.phoneNumber : ''),
          avatarUrl:
            raw.avatarUrl ||
            (isCurrent ? currentUser.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
          role: raw.role || (isCurrent ? currentUser.role || 'user' : 'user'),
          verificationBadge: raw.verificationBadge ?? null,
          isPhoneVerified: raw.isPhoneVerified !== undefined ? Boolean(raw.isPhoneVerified) : true,
          status: raw.status || 'active',
          kycStatus: raw.kycStatus || 'unverified',
          kycType: raw.kycType || 'BVN',
          bannedAt: raw.bannedAt,
          banReason: raw.banReason,
          joinedDate: raw.joinedDate || (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : 'Recent'),
          walletBalanceNgn: raw.walletBalanceNgn ?? 50000,
          ordersCount: raw.ordersCount || 0,
          deviceInfo: raw.deviceInfo,
          isOnline: online,
          lastSeen: online ? 'online' : raw.lastSeen || 'Recently active',
        });
      }
    };

    if (Array.isArray(supabaseUsers) && supabaseUsers.length > 0) {
      supabaseUsers.forEach((row: any) => {
        const phoneStr = row.full_phone || (row.phone_digits ? `+${String(row.phone_digits).replace(/^\+/, '')}` : '');
        const cleanDigits = (row.phone_digits || phoneStr).replace(/\D/g, '');
        addUser(
          {
            id: `usr_${cleanDigits}`,
            fullName: row.username || 'User',
            phoneNumber: phoneStr,
            avatarUrl:
              row.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(row.username || 'user')}`,
            isPhoneVerified: true,
            joinedDate: row.registered_at ? new Date(row.registered_at).toLocaleDateString() : 'Recent',
            isOnline: Boolean(isUserOnline?.(cleanDigits) || isUserOnline?.(phoneStr)),
            lastSeen: row.updated_at || row.registered_at || null,
          },
          false
        );
      });
    }

    if (Array.isArray(adminUsers)) {
      adminUsers.forEach((u) => addUser(u, true));
    }

    if (liveMetrics?.registeredUsers && Array.isArray(liveMetrics.registeredUsers)) {
      liveMetrics.registeredUsers.forEach((u) => addUser(u, true));
    }

    if (currentUser?.phoneNumber) {
      addUser(currentUser, false);
    }

    return Array.from(map.values());
  }, [adminUsers, liveMetrics?.registeredUsers, currentUser, isUserOnline, supabaseUsers]);

  // Merge Live Stores (Supabase store_subscriptions + client active storeSubscription + verified store threads)
  const mergedStores = useMemo<LiveStoreRecord[]>(() => {
    const map = new Map<string, LiveStoreRecord>();

    if (Array.isArray(liveMetrics?.stores)) {
      liveMetrics.stores.forEach((s: any) => {
        map.set(String(s.id), {
          id: String(s.id),
          storeName: s.storeName || 'Merchant Store',
          description: s.description || '',
          category: s.category || 'General',
          tier: s.tier || 'starter_30',
          itemsLimit: s.itemsLimit ?? 30,
          itemsCount: s.itemsCount ?? 0,
          ownerName: s.ownerName || 'Merchant Owner',
          ownerPhone: s.ownerPhone || '',
          status: s.status || 'active',
          verified: Boolean(s.verified),
          createdAt: s.createdAt || new Date().toISOString(),
          source: 'supabase',
        });
      });
    }

    if (storeSubscription?.isRegistered || storeSubscription?.tier !== 'none') {
      const id = `client_store_${currentUser?.id || 'me'}`;
      if (!Array.from(map.values()).some((s) => s.storeName.toLowerCase() === (storeSubscription.storeName || '').toLowerCase())) {
        map.set(id, {
          id,
          storeName: storeSubscription.storeName || 'Active Storefront',
          description: storeSubscription.description || '',
          category: storeSubscription.category || 'General',
          tier: storeSubscription.tier,
          itemsLimit: storeSubscription.itemLimit || storeSubscription.itemsLimit || 30,
          itemsCount: storeSubscription.itemsCount || storeSubscription.itemsUsed || 0,
          ownerName: currentUser?.fullName || 'Store Owner',
          ownerPhone: currentUser?.phoneNumber || '',
          status: storeSubscription.active ? 'active' : 'pending',
          verified: Boolean(storeSubscription.active),
          createdAt: storeSubscription.expiresAt || new Date().toISOString(),
          source: 'client',
        });
      }
    }

    chats
      .filter((c) => c.verifiedStore)
      .forEach((c) => {
        if (!Array.from(map.values()).some((s) => s.storeName.toLowerCase() === c.name.toLowerCase())) {
          map.set(c.id, {
            id: c.id,
            storeName: c.name,
            description: c.description || `${c.storeCategory || 'Verified'} merchant on AGC`,
            category: c.storeCategory || 'Commerce',
            tier: (c.catalog?.length || 0) > 30 ? 'pro_100' : 'starter_30',
            itemsLimit: (c.catalog?.length || 0) > 30 ? 100 : 30,
            itemsCount: c.catalog?.length || 0,
            ownerName: c.name,
            ownerPhone: c.phoneNumber || c.phone || '',
            status: 'active',
            verified: true,
            createdAt: new Date().toISOString(),
            source: 'directory',
          });
        }
      });

    return Array.from(map.values());
  }, [liveMetrics?.stores, storeSubscription, currentUser, chats]);

  // Merge Live Artisans (Supabase artisan_stations + active artisanStation + serviceProviders)
  const mergedArtisans = useMemo<LiveArtisanRecord[]>(() => {
    const map = new Map<string, LiveArtisanRecord>();

    if (Array.isArray(liveMetrics?.artisans)) {
      liveMetrics.artisans.forEach((a: any) => {
        map.set(String(a.id), {
          id: String(a.id),
          stationName: a.stationName || 'Artisan Hub',
          category: a.category || 'General Trade',
          location: a.location || 'Nigeria',
          workshopAddress: a.workshopAddress || '',
          ownerName: a.ownerName || 'Master Artisan',
          ownerPhone: a.ownerPhone || '',
          isApproved: Boolean(a.isApproved),
          registrationFeePaid: Boolean(a.registrationFeePaid),
          createdAt: a.createdAt || new Date().toISOString(),
        });
      });
    }

    if (artisanStation) {
      map.set(artisanStation.id, {
        id: artisanStation.id,
        stationName: artisanStation.stationName,
        category: artisanStation.categoryLabel || artisanStation.category,
        location: artisanStation.location,
        workshopAddress: artisanStation.workshopAddress,
        ownerName: artisanStation.ownerName,
        ownerPhone: artisanStation.ownerPhone,
        isApproved: artisanStation.isApproved,
        registrationFeePaid: artisanStation.registrationFeePaid,
        createdAt: artisanStation.registeredAt,
      });
    }

    serviceProviders.forEach((sp) => {
      if (!map.has(sp.id)) {
        map.set(sp.id, {
          id: sp.id,
          stationName: sp.businessName || sp.name,
          category: sp.categoryLabel || sp.category,
          location: sp.location,
          workshopAddress: sp.location,
          ownerName: sp.name,
          ownerPhone: sp.phone,
          isApproved: sp.isVerified,
          registrationFeePaid: true,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return Array.from(map.values());
  }, [liveMetrics?.artisans, artisanStation, serviceProviders]);

  // Keep config/CMS form mirrors synced
  useEffect(() => {
    if (!isAdminModalOpen || !systemConfig) return;
    setCfgMaintenanceMode(systemConfig.maintenanceMode ?? false);
    setCfgMaintenanceMsg(systemConfig.maintenanceMessage ?? '');
    setCfgAllowReg(systemConfig.allowNewRegistrations ?? true);
    setCfgRequireOtp(systemConfig.requirePhoneOtp ?? false);
    setCfgDispatchComm(systemConfig.dispatchCommissionPercent ?? 5);
    setCfgEscrowComm(systemConfig.escrowCommissionPercent ?? 1.5);
    setCfgArtisanComm(systemConfig.artisanCommissionPercent ?? 2);
    setCfgCreatorComm(systemConfig.creatorCommissionPercent ?? 5);
    setCfgMinTransfer(systemConfig.minTransferAmountNgn ?? 100);
    setCfgMaxDailyTransfer(systemConfig.maxDailyTransferNgn ?? 5000000);
    setCfgDelayMins(systemConfig.delayedSendHoldDurationMins ?? 15);
    setCfgSupportPhone(systemConfig.supportContactPhone ?? '');
  }, [isAdminModalOpen, systemConfig]);

  useEffect(() => {
    if (!isAdminModalOpen || !cmsData) return;
    if (cmsData.communityGuidelines !== undefined) setCmsGuidelines(cmsData.communityGuidelines);
    if (cmsData.marqueeBanner?.text !== undefined) setCmsMarqueeDraft(cmsData.marqueeBanner.text);
  }, [isAdminModalOpen, cmsData]);

  // Synchronize selectedCustomer with live updates
  useEffect(() => {
    if (!selectedCustomer) return;
    const selDigits = (selectedCustomer.phoneNumber || selectedCustomer.id || '').replace(/\D/g, '').slice(-9);
    const updated = mergedUsers.find(
      (u) =>
        u.id === selectedCustomer.id ||
        (selDigits && (u.phoneNumber || u.id || '').replace(/\D/g, '').slice(-9) === selDigits)
    );
    if (
      updated &&
      (updated.verificationBadge !== selectedCustomer.verificationBadge ||
        updated.role !== selectedCustomer.role ||
        updated.status !== selectedCustomer.status ||
        updated.kycStatus !== selectedCustomer.kycStatus ||
        updated.walletBalanceNgn !== selectedCustomer.walletBalanceNgn ||
        updated.isOnline !== selectedCustomer.isOnline)
    ) {
      setSelectedCustomer(updated);
    }
  }, [mergedUsers, selectedCustomer]);

  // Computed Platform Metrics
  const activeOrders = liveMetrics?.dispatch?.orders || dispatchOrders;
  const dispRate = (systemConfig?.dispatchCommissionPercent ?? 5) / 100;
  const totalDispatchCommission = activeOrders.reduce(
    (sum: number, o: any) => sum + (o.platformFee ?? Math.round((o.estimatedFee || 0) * dispRate)),
    0
  );
  const totalDispatchVolume = activeOrders.reduce(
    (sum: number, o: any) => sum + (o.totalFee ?? (o.estimatedFee || 0) + Math.round((o.estimatedFee || 0) * dispRate)),
    0
  );
  const totalEscrowLockedNgn = escrowOrders
    .filter((o) => o.status === 'escrow_secured' || o.status === 'shipped' || o.status === 'disputed')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalEscrowGmvNgn = escrowOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalWalletPoolNgn = mergedUsers.reduce((acc, u) => acc + (Number(u.walletBalanceNgn) || 0), 0);
  const totalPlatformVolumeNgn = totalEscrowGmvNgn + totalDispatchVolume + (wallet?.transactions?.reduce((s, t) => s + Math.abs(t.amount || 0), 0) || 0);

  const pendingDisputesCount =
    escrowOrders.filter((o) => o.status === 'disputed').length +
    mergedUsers.filter((u) => u.status === 'flagged' || u.status === 'suspended').length +
    securityEvents.filter((s) => s.severity === 'high' || s.severity === 'critical').length;

  const filteredUsers = mergedUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.phoneNumber.toLowerCase().includes(q) ||
      (u.id && u.id.toLowerCase().includes(q));
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && (!u.status || u.status === 'active')) ||
      u.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredEscrows = escrowOrders.filter((o) => {
    if (escrowFilter === 'all') return true;
    return o.status === escrowFilter;
  });

  const disputedEscrows = escrowOrders.filter((o) => o.status === 'disputed' || o.status === 'escrow_secured');

  const filteredDispatchOrders = activeOrders.filter((ord: any) => {
    if (dispatchFilter === 'active') return ord.status !== 'delivered';
    if (dispatchFilter === 'delivered') return ord.status === 'delivered';
    return true;
  });

  const filteredStores = mergedStores.filter((s) => {
    const q = storeSearch.toLowerCase();
    const matchesSearch =
      !q ||
      s.storeName.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.ownerPhone.includes(q) ||
      s.category.toLowerCase().includes(q);
    const matchesStatus = storeStatusFilter === 'all' || s.status === storeStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAuditTrail = auditTrail.filter((a) => {
    const q = auditSearch.toLowerCase();
    if (!q) return true;
    return (
      a.refId.toLowerCase().includes(q) ||
      a.actor.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      a.target.toLowerCase().includes(q) ||
      a.details.toLowerCase().includes(q)
    );
  });

  // Live Transactional Activity Stream (60% Overview column)
  const activityStream = useMemo(() => {
    const items: Array<{
      id: string;
      refId: string;
      title: string;
      subtitle: string;
      amountNgn?: number;
      type: 'escrow' | 'dispatch' | 'webhook' | 'audit';
      timestamp: string;
      order?: EscrowOrder;
    }> = [];

    escrowOrders.forEach((o) => {
      items.push({
        id: `act_esc_${o.id}`,
        refId: o.paystackRef || o.id,
        title: `Escrow · ${o.product.title}`,
        subtitle: `${o.buyerName} → ${o.sellerName} (${o.status.replace('_', ' ')})`,
        amountNgn: o.totalAmount,
        type: 'escrow',
        timestamp: o.updatedAt || o.createdAt || new Date().toISOString(),
        order: o,
      });
    });

    activeOrders.forEach((d: any) => {
      items.push({
        id: `act_disp_${d.id}`,
        refId: d.trackingCode || d.id,
        title: `Dispatch · ${String(d.provider || 'courier').toUpperCase()}`,
        subtitle: `${d.packageDescription || 'Parcel'} → ${d.recipientName}`,
        amountNgn: d.totalFee ?? d.estimatedFee ?? 0,
        type: 'dispatch',
        timestamp: d.createdAt || new Date().toISOString(),
      });
    });

    webhookLogs.slice(0, 15).forEach((w) => {
      items.push({
        id: `act_wh_${w.id}`,
        refId: w.reference,
        title: `Paystack · ${w.event}`,
        subtitle: w.payloadSummary,
        amountNgn: w.amountNgn,
        type: 'webhook',
        timestamp: w.timestamp,
      });
    });

    auditTrail.slice(0, 20).forEach((a) => {
      items.push({
        id: `act_aud_${a.id}`,
        refId: a.refId,
        title: a.action,
        subtitle: `${a.target} · ${a.details}`,
        type: 'audit',
        timestamp: a.timestamp,
      });
    });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 24);
  }, [escrowOrders, activeOrders, webhookLogs, auditTrail]);

  // Global Search Results (Ctrl+K)
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { users: [], escrows: [], stores: [], artisans: [], audits: [] };
    return {
      users: mergedUsers
        .filter((u) => u.fullName.toLowerCase().includes(q) || u.phoneNumber.includes(q) || u.id.toLowerCase().includes(q))
        .slice(0, 5),
      escrows: escrowOrders
        .filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            (o.paystackRef && o.paystackRef.toLowerCase().includes(q)) ||
            o.buyerName.toLowerCase().includes(q) ||
            o.sellerName.toLowerCase().includes(q) ||
            o.product.title.toLowerCase().includes(q)
        )
        .slice(0, 4),
      stores: mergedStores
        .filter((s) => s.storeName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q))
        .slice(0, 4),
      artisans: mergedArtisans
        .filter(
          (a) =>
            a.stationName.toLowerCase().includes(q) ||
            a.ownerName.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q)
        )
        .slice(0, 4),
      audits: auditTrail
        .filter((a) => a.refId.toLowerCase().includes(q) || a.target.toLowerCase().includes(q) || a.action.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }, [globalSearchQuery, mergedUsers, escrowOrders, mergedStores, mergedArtisans, auditTrail]);

  // Action Handlers
  const openAuditDrawer = (refId: string, opts?: { title?: string; amountNgn?: number; order?: EscrowOrder | null }) => {
    setAuditDrawerState({
      isOpen: true,
      refId,
      title: opts?.title,
      amountNgn: opts?.amountNgn,
      order: opts?.order || null,
    });
  };

  const executeEscrowServerResolve = async (
    order: EscrowOrder,
    action: 'release_to_seller' | 'refund_to_buyer',
    note: string,
    secondaryAdminName?: string,
    secondaryAdminPin?: string
  ) => {
    const res = await fetch('/api/admin/escrow/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        action,
        note,
        amountNgn: order.totalAmount,
        buyerName: order.buyerName,
        sellerName: order.sellerName,
        paystackRef: order.paystackRef || order.id,
        actorName: currentUser?.fullName || 'Super Admin',
        secondaryAdminName,
        secondaryAdminPin,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Escrow server authorization failed');
    }
    adminResolveEscrow(order.id, action, note);
    setDisputeOrder(null);
    notify(
      action === 'release_to_seller'
        ? `Escrow #${order.id} released to ${order.sellerName}`
        : `Escrow #${order.id} refunded to ${order.buyerName}`
    );
  };

  const requestEscrowResolution = async (
    order: EscrowOrder,
    action: 'release_to_seller' | 'refund_to_buyer',
    note: string
  ) => {
    if (order.totalAmount >= DUAL_ADMIN_THRESHOLD_NGN) {
      setDualApprovalRequest({
        isOpen: true,
        actionLabel: action === 'release_to_seller' ? 'Escrow Force-Release' : 'Escrow Refund Buyer',
        targetSummary: `#${order.id} · ${order.buyerName} → ${order.sellerName}`,
        amountNgn: order.totalAmount,
        errorMsg: null,
        isSubmitting: false,
        payload: { kind: 'escrow', order, action, note },
      });
      return;
    }
    try {
      await executeEscrowServerResolve(order, action, note);
    } catch (e: any) {
      notify(e?.message || 'Escrow resolution failed', 'err');
    }
  };

  const handleDualApprovalConfirm = async (secondaryName: string, secondaryPin: string) => {
    const p = dualApprovalRequest.payload;
    if (!p) return;
    setDualApprovalRequest((prev) => ({ ...prev, isSubmitting: true, errorMsg: null }));
    try {
      if (p.kind === 'escrow') {
        await executeEscrowServerResolve(p.order, p.action, p.note, secondaryName, secondaryPin);
      } else if (p.kind === 'payout') {
        const res = await fetch('/api/admin/escrow/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `PAYOUT_${Date.now()}`,
            action: p.delta >= 0 ? 'release_to_seller' : 'refund_to_buyer',
            note: p.note || 'Manual Treasury Payout',
            amountNgn: Math.abs(p.delta),
            buyerName: 'AGC Treasury',
            sellerName: p.userName,
            paystackRef: `PAY_${p.phoneOrId.replace(/\D/g, '').slice(-6)}_${Date.now()}`,
            actorName: currentUser?.fullName || 'Super Admin',
            secondaryAdminName: secondaryName,
            secondaryAdminPin: secondaryPin,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Dual-Admin PIN rejected');
        await adjustUserWallet(p.phoneOrId, p.delta, false);
        setPayoutAmount('');
        setPayoutNote('');
        setPayoutFeedback(`Disbursed ₦${p.delta.toLocaleString()} to ${p.userName} (Co-signed by ${secondaryName}).`);
      }
      setDualApprovalRequest({
        isOpen: false,
        actionLabel: '',
        targetSummary: '',
        amountNgn: 0,
        errorMsg: null,
        isSubmitting: false,
        payload: null,
      });
    } catch (e: any) {
      setDualApprovalRequest((prev) => ({
        ...prev,
        isSubmitting: false,
        errorMsg: e?.message || 'Secondary Admin PIN invalid.',
      }));
    }
  };

  const handleManualPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutFeedback(null);
    const amountNum = Number(payoutAmount);
    if (!payoutTargetPhone || isNaN(amountNum) || amountNum === 0) return;
    const recipient = mergedUsers.find(
      (u) => u.phoneNumber === payoutTargetPhone || u.id === payoutTargetPhone
    );
    const targetName = recipient?.fullName || payoutTargetPhone;
    const note = payoutNote.trim() || 'Manual Admin Treasury Payout';

    if (Math.abs(amountNum) >= DUAL_ADMIN_THRESHOLD_NGN) {
      setDualApprovalRequest({
        isOpen: true,
        actionLabel: 'Manual Treasury Payout',
        targetSummary: `${targetName} (${payoutTargetPhone})`,
        amountNgn: Math.abs(amountNum),
        errorMsg: null,
        isSubmitting: false,
        payload: { kind: 'payout', phoneOrId: payoutTargetPhone, userName: targetName, delta: amountNum, note },
      });
      return;
    }

    await adjustUserWallet(payoutTargetPhone, amountNum, false);
    setPayoutAmount('');
    setPayoutNote('');
    setPayoutFeedback(`Manual payout of ₦${amountNum.toLocaleString()} applied to ${targetName}.`);
    fetchLiveMetrics();
  };

  const handleStoreMutation = async (store: LiveStoreRecord, patch: { tier?: string; status?: string; verified?: boolean }) => {
    try {
      const res = await fetch(`/api/admin/stores/${encodeURIComponent(store.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store.storeName,
          ownerName: store.ownerName,
          ownerPhone: store.ownerPhone,
          ...patch,
        }),
      });
      if (res.ok) {
        notify(`Updated store "${store.storeName}"`);
        fetchLiveMetrics();
      }
    } catch (_) {
      notify('Failed to update store', 'err');
    }
  };

  const handleExportStoresCsv = () => {
    const headers = ['Store ID', 'Store Name', 'Owner', 'WhatsApp Link', 'Tier', 'Items Count', 'Items Limit', 'Status', 'Verified'];
    const rows = filteredStores.map((s) => {
      const waDigits = (s.ownerPhone || '').replace(/\D/g, '');
      const wa = waDigits ? `https://wa.me/${waDigits}` : '';
      return [s.id, s.storeName, s.ownerName, wa, s.tier, s.itemsCount, s.itemsLimit, s.status, s.verified ? 'Yes' : 'No'];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agc-stores-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${filteredStores.length} stores to CSV`);
  };

  const handleKycUpdate = async (user: any, kycStatus: 'verified' | 'rejected' | 'pending', kycType: 'BVN' | 'NIN') => {
    const identifier = user.phoneNumber || user.id;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(identifier)}/kyc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kycStatus,
          kycType,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        }),
      });
      if (res.ok) {
        notify(`${user.fullName}: ${kycType} marked ${kycStatus.toUpperCase()}`);
        fetchLiveMetrics();
      }
    } catch (_) {
      notify('KYC update failed', 'err');
    }
  };

  const handleArtisanMutation = async (artisan: LiveArtisanRecord, isApproved: boolean) => {
    try {
      const res = await fetch(`/api/admin/artisans/${encodeURIComponent(artisan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved, stationName: artisan.stationName }),
      });
      if (res.ok) {
        notify(`${artisan.stationName} ${isApproved ? 'approved' : 'suspended'}`);
        fetchLiveMetrics();
      }
    } catch (_) {
      notify('Artisan status update failed', 'err');
    }
  };

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpInput.trim()) return;
    try {
      const res = await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: blockIpInput.trim(),
          reason: blockIpReason.trim() || 'Blocked via AGC System Security',
          blockedBy: currentUser?.fullName || 'Super Admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedIps)) setBlockedIps(data.blockedIps);
        setBlockIpInput('');
        setBlockIpReason('');
        notify('IP address added to active blocklist');
      }
    } catch (_) {
      notify('Failed to block IP', 'err');
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await fetch(`/api/admin/security/block-ip/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedIps)) setBlockedIps(data.blockedIps);
        notify(`Removed ${ip} from blocklist`);
      }
    } catch (_) {}
  };

  const handleTestWebhookEvent = async () => {
    try {
      const ref = `PSK_TEST_${Date.now().toString().slice(-6)}`;
      const res = await fetch('/api/webhooks/paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'charge.success',
          data: { reference: ref, amount: 2500000 },
        }),
      });
      if (res.ok) {
        notify(`Ingested Paystack webhook ${ref}`);
        fetchLiveMetrics();
      }
    } catch (_) {}
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcMessage.trim()) return;
    createAdminBroadcast(bcTitle.trim(), bcMessage.trim(), bcLevel);
    setBcTitle('');
    setBcMessage('');
    setBcNotice('Live broadcast pushed across all connected WebSocket clients.');
    setTimeout(() => setBcNotice(null), 3500);
  };

  const handleSaveConfig = async () => {
    setConfigError(null);
    const ok = await updateSystemConfig({
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
    if (ok) {
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } else {
      setConfigError('Failed to save configuration to live server.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
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

  const overallHealthColor = !healthData
    ? 'bg-zinc-500'
    : healthData.supabase.status === 'healthy' &&
      healthData.websocket.status === 'healthy' &&
      healthData.paystack.status === 'healthy'
    ? 'bg-emerald-400'
    : healthData.supabase.status === 'offline' || healthData.websocket.status === 'offline'
    ? 'bg-rose-500'
    : 'bg-amber-400';

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    {
      id: 'finance',
      label: 'Escrow & Finance',
      icon: Scale,
      badge: escrowOrders.filter((o) => o.status === 'escrow_secured' || o.status === 'disputed').length || null,
    },
    { id: 'stores', label: 'Vendors & Stores', icon: Store, badge: mergedStores.length || null },
    { id: 'users', label: 'Users & Artisans', icon: Users, badge: mergedUsers.length || null },
    { id: 'comms', label: 'Comms & Social', icon: Radio, badge: systemBroadcast?.active ? 'LIVE' : null },
    { id: 'security', label: 'System & Security', icon: Shield, badge: securityEvents.length || null },
  ];

  const sectionLabelMap: Record<AdminSection, string> = {
    overview: 'Platform Overview',
    finance: 'Escrow & Finance Center',
    stores: 'Vendor & Store Tiers',
    users: 'User & Artisan Directory',
    comms: 'Communication & Social Logs',
    security: 'System & Security',
  };

  if (!isAdminModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] text-zinc-100 flex overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* LEFT PERSISTENT SIDEBAR                                                  */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl transition-all duration-200 shrink-0 ${
          sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        } ${mobileNavOpen ? 'w-[260px] translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-zinc-800/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-white truncate font-display">
                  AGC Control
                </div>
                <div className="text-[11px] font-mono text-zinc-400 truncate">
                  All Good Connects
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileNavOpen(false);
                }}
                title={item.label}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-violet-600/20 text-white border border-violet-500/40'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-400'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                  <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Telemetry Footer */}
        <div className="p-3 border-t border-zinc-800/90 text-[11px] font-mono text-zinc-400 shrink-0">
          {!sidebarCollapsed ? (
            <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Node</span>
                <span className="text-zinc-200 tabular-nums">:3000 · {liveMetrics?.serverMemoryMb ?? 48} MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Uptime</span>
                <span className="text-emerald-400 tabular-nums">
                  {liveMetrics?.uptimeSeconds ? formatUptime(liveMetrics.uptimeSeconds) : 'Online'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="Node Online">
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
          )}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN COLUMN: TOP UTILITY BAR + DYNAMIC WORKSPACE                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        {/* Top Global Utility Bar */}
        <header className="h-16 px-4 sm:px-6 border-b border-zinc-800/90 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-zinc-500 truncate">/admin/{activeSection}</div>
              <h1 className="text-sm font-semibold text-white truncate font-display">
                {sectionLabelMap[activeSection]}
              </h1>
            </div>
          </div>

          {/* Global Ctrl+K Search Trigger */}
          <button
            type="button"
            onClick={() => {
              setGlobalSearchOpen(true);
              setTimeout(() => globalSearchInputRef.current?.focus(), 40);
            }}
            className="hidden md:flex items-center justify-between gap-4 w-72 lg:w-96 px-3.5 py-2 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">Search users, refs, stores, artisans...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-300 shrink-0">
              Ctrl + K
            </kbd>
          </button>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={() => {
                setGlobalSearchOpen(true);
                setTimeout(() => globalSearchInputRef.current?.focus(), 40);
              }}
              className="md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Live System Health Indicator */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setHealthPopoverOpen((o) => !o);
                  setProfileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-2 whitespace-nowrap transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${overallHealthColor}`} />
                <span className="hidden sm:inline text-zinc-200 font-medium">System Health</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {healthPopoverOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3.5 z-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Live Subsystem Probes</span>
                    <button
                      type="button"
                      onClick={fetchHealthProbe}
                      disabled={healthChecking}
                      className="text-[11px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${healthChecking ? 'animate-spin' : ''}`} />
                      <span>Re-probe</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: 'Supabase DB',
                        status: healthData?.supabase.status || 'healthy',
                        meta: healthData ? `${healthData.supabase.latencyMs}ms` : 'Checking...',
                      },
                      {
                        label: 'Paystack API',
                        status: healthData?.paystack.status || 'healthy',
                        meta: healthData ? `${healthData.paystack.latencyMs}ms` : 'Checking...',
                      },
                      {
                        label: 'WebSocket Server',
                        status: healthData?.websocket.status || 'healthy',
                        meta: `${healthData?.websocket.connectedClients ?? liveMetrics?.onlineUsersCount ?? 1} clients`,
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-zinc-800/70 last:border-0">
                        <span className="flex items-center gap-2 text-zinc-300">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.status === 'healthy'
                                ? 'bg-emerald-400'
                                : row.status === 'degraded'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          {row.label}
                        </span>
                        <span className="font-mono tabular-nums text-zinc-400">{row.meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                fetchLiveMetrics();
                fetchHealthProbe();
              }}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Sync Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-violet-400' : ''}`} />
            </button>

            {/* Admin Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((o) => !o);
                  setHealthPopoverOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-xs whitespace-nowrap transition-colors"
              >
                <div className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {(currentUser?.fullName || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-medium text-zinc-200 max-w-[110px] truncate">
                  {currentUser?.fullName || 'Super Admin'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3.5 z-50 space-y-3 text-xs">
                  <div className="pb-2.5 border-b border-zinc-800">
                    <div className="font-semibold text-white">{currentUser?.fullName || 'Super Admin'}</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Role: Super Admin · Multi-Admin RBAC
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Security Token</span>
                      <button
                        type="button"
                        onClick={() => setSessionToken(`AGC-ADM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)}
                        className="text-violet-400 hover:text-violet-300 font-mono"
                      >
                        Rotate
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(sessionToken)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-200 flex items-center justify-between"
                    >
                      <span>{sessionToken}</span>
                      {copiedText === sessionToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-300">Auto-Sync (6s)</span>
                    <button
                      type="button"
                      onClick={() => setAutoRefresh((v) => !v)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold ${
                        autoRefresh ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {autoRefresh ? 'ON' : 'PAUSED'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium transition-colors"
                  >
                    Exit Control Center
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Close Console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div
            className={`px-6 py-2 text-xs font-medium border-b flex items-center justify-between shrink-0 ${
              actionNotice.tone === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{actionNotice.text}</span>
            <button type="button" onClick={() => setActionNotice(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: OVERVIEW (DASHBOARD)                                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Top Metric Grid (4 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Total Platform Volume</span>
                    <DollarSign className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    ₦{totalPlatformVolumeNgn.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-emerald-400 tabular-nums">
                    +₦{totalDispatchCommission.toLocaleString()} courier fees · {activeOrders.length + escrowOrders.length} txns
                  </div>
                </div>

                <div className="p-5 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Active Escrow Vault</span>
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    ₦{totalEscrowLockedNgn.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-zinc-400 tabular-nums">
                    {escrowOrders.filter((o) => o.status === 'escrow_secured' || o.status === 'disputed').length} orders held in vault
                  </div>
                </div>

                <div className="p-5 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Pending Disputes & Flags</span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    {pendingDisputesCount}
                  </div>
                  <div className="text-xs font-mono text-zinc-400 tabular-nums">
                    {escrowOrders.filter((o) => o.status === 'disputed').length} disputes · {securityEvents.length} security alerts
                  </div>
                </div>

                <div className="p-5 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Concurrent Sockets / Users</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    {liveMetrics?.onlineUsersCount ?? 1}{' '}
                    <span className="text-sm font-normal text-zinc-400">/ {mergedUsers.length}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 tabular-nums">
                    {mergedStores.length} stores · {mergedArtisans.length} artisans
                  </div>
                </div>
              </div>

              {/* Bottom 60% / 40% Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 60% (7 cols): Real-Time Transactional Activity Stream */}
                <div className="lg:col-span-7 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-zinc-800/90 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Real-Time Transaction Stream</h2>
                      <p className="text-xs text-zinc-400">Escrow locks, Paystack webhooks, dispatch fees & audit mutations</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('finance')}
                      className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
                    >
                      Open Ledger →
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-800/70 max-h-[430px] overflow-y-auto">
                    {activityStream.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500">
                        No transactions recorded yet. Escrow checkouts, dispatch orders, and webhook events stream here live.
                      </div>
                    ) : (
                      activityStream.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            openAuditDrawer(item.refId, {
                              title: item.title,
                              amountNgn: item.amountNgn,
                              order: item.order,
                            })
                          }
                          className="w-full px-5 py-3.5 text-left hover:bg-zinc-900/80 transition-colors flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-violet-400 shrink-0">{item.refId}</span>
                              <span className="text-xs font-medium text-white truncate">{item.title}</span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {item.amountNgn !== undefined && (
                              <div className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                                ₦{item.amountNgn.toLocaleString()}
                              </div>
                            )}
                            <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right 40% (5 cols): Security & System Alerts Panel */}
                <div className="lg:col-span-5 rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-zinc-800/90 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Security & System Alerts</h2>
                      <p className="text-xs text-zinc-400">WAF blocks, webhook signatures & blocklist telemetry</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('security');
                        setSecurityTab('waf');
                      }}
                      className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
                    >
                      Security →
                    </button>
                  </div>

                  <div className="p-4 space-y-3 max-h-[430px] overflow-y-auto">
                    {systemBroadcast?.active && (
                      <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-violet-300 flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5" />
                            Active Broadcast: {systemBroadcast.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => clearAdminBroadcast()}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-xs text-zinc-300">{systemBroadcast.message}</p>
                      </div>
                    )}

                    {securityEvents.length === 0 ? (
                      <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-1.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
                        <p className="text-xs font-medium text-zinc-200">Zero Active Threat Alerts</p>
                        <p className="text-[11px] text-zinc-500">
                          WAF, Paystack HMAC verification, and Auth Rate Limiter are monitoring live traffic.
                        </p>
                      </div>
                    ) : (
                      securityEvents.slice(0, 8).map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/90 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-mono font-semibold uppercase text-[11px] ${
                                ev.severity === 'critical' || ev.severity === 'high' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {ev.type.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-zinc-200">{ev.reason}</p>
                          <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                            <span>IP: {ev.ip}</span>
                            <span className="truncate max-w-[150px]">{ev.path}</span>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Quick Platform Wallet Pool Summary */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Aggregated User Wallet Pool</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        ₦{totalWalletPoolNgn.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: ESCROW & FINANCE CENTER                                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'finance' && (
            <div className="space-y-5">
              {/* Sub-tab Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/90 pb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {([
                    { id: 'escrows', label: 'Active Escrows' },
                    { id: 'disputes', label: 'Dispute Resolution' },
                    { id: 'dispatch', label: 'Dispatch (5%)' },
                    { id: 'webhooks', label: 'Paystack Webhook Logs' },
                    { id: 'payouts', label: 'Manual Payouts' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFinanceTab(t.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        financeTab === t.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-zinc-400">
                  Dual-Admin PIN required ≥ ₦{DUAL_ADMIN_THRESHOLD_NGN.toLocaleString()}
                </span>
              </div>

              {/* 2A. Active Escrows Data Table */}
              {financeTab === 'escrows' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      {(['all', 'escrow_secured', 'funds_released', 'disputed'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setEscrowFilter(filter)}
                          className={`px-3 py-1.5 rounded-lg capitalize font-medium whitespace-nowrap ${
                            escrowFilter === filter
                              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                              : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          {filter.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 tabular-nums">
                      Vault Locked: <strong className="text-emerald-400">₦{totalEscrowLockedNgn.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/60">
                          <th className="py-3 px-4">Transaction Ref</th>
                          <th className="py-3 px-4">Buyer</th>
                          <th className="py-3 px-4">Vendor</th>
                          <th className="py-3 px-4 text-right">Amount Held (₦)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredEscrows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-zinc-500">
                              No escrow orders matching filter.
                            </td>
                          </tr>
                        ) : (
                          filteredEscrows.map((order) => (
                            <tr key={order.id} className="hover:bg-zinc-900/70 transition-colors">
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAuditDrawer(order.paystackRef || order.id, {
                                      title: order.product.title,
                                      amountNgn: order.totalAmount,
                                      order,
                                    })
                                  }
                                  className="font-mono font-semibold text-violet-400 hover:text-violet-300 underline-offset-2 hover:underline text-left"
                                >
                                  {order.paystackRef || order.id}
                                </button>
                                <div className="text-[11px] text-zinc-500 truncate max-w-[190px]">{order.product.title}</div>
                              </td>
                              <td className="py-3.5 px-4 text-zinc-200">{order.buyerName}</td>
                              <td className="py-3.5 px-4 text-zinc-200">{order.sellerName}</td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-white tabular-nums">
                                {formatPrice(order.totalAmount, order.currency)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`font-mono text-[11px] uppercase font-semibold ${
                                    order.status === 'funds_released'
                                      ? 'text-emerald-400'
                                      : order.status === 'disputed'
                                      ? 'text-rose-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {order.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAuditDrawer(order.paystackRef || order.id, {
                                        title: order.product.title,
                                        amountNgn: order.totalAmount,
                                        order,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium whitespace-nowrap"
                                  >
                                    Audit Log
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDisputeOrder(order)}
                                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium whitespace-nowrap"
                                  >
                                    Inspect
                                  </button>
                                  {order.status !== 'funds_released' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          requestEscrowResolution(order, 'refund_to_buyer', 'Admin manual refund to buyer')
                                        }
                                        className="px-2.5 py-1 rounded-md bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium whitespace-nowrap"
                                      >
                                        Refund
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          requestEscrowResolution(order, 'release_to_seller', 'Admin manual force-release')
                                        }
                                        className="px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold whitespace-nowrap"
                                      >
                                        Force Release
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2B. Dispute Resolution Queue */}
              {financeTab === 'disputes' && (
                <div className="space-y-3">
                  {disputedEscrows.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
                      No active escrow disputes or locked orders pending arbitration.
                    </div>
                  ) : (
                    disputedEscrows.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={order.product.imageUrl}
                            alt={order.product.title}
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-white">#{order.id}</span>
                              <span className="font-mono text-[11px] text-amber-400 uppercase">{order.status.replace('_', ' ')}</span>
                            </div>
                            <div className="text-sm font-medium text-zinc-100 truncate">{order.product.title}</div>
                            <div className="text-xs text-zinc-400">
                              {order.buyerName} ↔ {order.sellerName} · PIN #{order.escrowPin}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                              {formatPrice(order.totalAmount, order.currency)}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              {order.totalAmount >= DUAL_ADMIN_THRESHOLD_NGN ? 'Dual-Admin Required' : 'Standard'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDisputeOrder(order)}
                            className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            Open Arbitration Desk
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 2C. Dispatch (5% Commission Ledger) */}
              {financeTab === 'dispatch' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                        Platform Commission ({systemConfig?.dispatchCommissionPercent ?? 5}% Fee)
                      </span>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white mt-0.5">
                        ₦{totalDispatchCommission.toLocaleString()} Earned
                      </div>
                      <p className="text-xs text-zinc-400">
                        Total courier volume: ₦{totalDispatchVolume.toLocaleString()} across {activeOrders.length} orders
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {(['all', 'active', 'delivered'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setDispatchFilter(f)}
                          className={`px-3 py-1.5 rounded-lg capitalize font-medium whitespace-nowrap ${
                            dispatchFilter === f
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                          <th className="py-3 px-4">Tracking Code</th>
                          <th className="py-3 px-4">Package / Recipient</th>
                          <th className="py-3 px-4">Rider</th>
                          <th className="py-3 px-4 text-right">Fee (5%)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredDispatchOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-500">
                              No dispatch orders recorded yet.
                            </td>
                          </tr>
                        ) : (
                          filteredDispatchOrders.map((ord: any) => {
                            const comm = ord.platformFee ?? Math.round((ord.estimatedFee || 0) * dispRate);
                            return (
                              <tr key={ord.id} className="hover:bg-zinc-900/70">
                                <td className="py-3 px-4 font-mono text-white">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(ord.trackingCode)}
                                    className="flex items-center gap-1.5 hover:text-violet-400"
                                  >
                                    <span>{ord.trackingCode}</span>
                                    {copiedText === ord.trackingCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-zinc-200 font-medium">{ord.packageDescription}</div>
                                  <div className="text-[11px] text-zinc-500">{ord.recipientName} · {ord.recipientAddress}</div>
                                </td>
                                <td className="py-3 px-4 text-zinc-300">
                                  {ord.riderName || 'Assigning'} {ord.riderPlate ? `(${ord.riderPlate})` : ''}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-400 tabular-nums">
                                  +₦{comm.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 font-mono uppercase text-[11px] text-zinc-300">
                                  {String(ord.status || '').replace('_', ' ')}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openAuditDrawer(ord.trackingCode || ord.id, { title: `Dispatch ${ord.provider}`, amountNgn: comm })}
                                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]"
                                  >
                                    Audit
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2D. Paystack Webhook Logs */}
              {financeTab === 'webhooks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Paystack Webhook Event Stream</h3>
                      <p className="text-xs text-zinc-400">HMAC-SHA512 verified gateway callbacks and escrow settlements</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestWebhookEvent}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-white whitespace-nowrap"
                    >
                      Simulate Signed Webhook
                    </button>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                          <th className="py-3 px-4">Reference</th>
                          <th className="py-3 px-4">Event</th>
                          <th className="py-3 px-4">HMAC</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4">Summary</th>
                          <th className="py-3 px-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {webhookLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-500">
                              No Paystack webhook callbacks logged yet.
                            </td>
                          </tr>
                        ) : (
                          webhookLogs.map((w) => (
                            <tr key={w.id} className="hover:bg-zinc-900/70">
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => openAuditDrawer(w.reference, { title: w.event, amountNgn: w.amountNgn })}
                                  className="font-mono font-semibold text-violet-400 hover:underline"
                                >
                                  {w.reference}
                                </button>
                              </td>
                              <td className="py-3 px-4 font-mono text-zinc-200">{w.event}</td>
                              <td className="py-3 px-4 font-mono">
                                <span className={w.hmacVerified ? 'text-emerald-400' : 'text-rose-400'}>
                                  {w.hmacVerified ? 'VERIFIED' : 'MISMATCH'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-white">
                                ₦{(w.amountNgn || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-zinc-300">{w.payloadSummary}</td>
                              <td className="py-3 px-4 text-right font-mono text-zinc-500 tabular-nums">
                                {new Date(w.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2E. Manual Payouts */}
              {financeTab === 'payouts' && (
                <form
                  onSubmit={handleManualPayout}
                  className="max-w-2xl p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-4 text-xs"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">Manual Treasury Payout / Adjustment</h3>
                    <p className="text-zinc-400 mt-0.5">
                      Disbursements ≥ ₦{DUAL_ADMIN_THRESHOLD_NGN.toLocaleString()} require Secondary Admin PIN verification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-300 font-medium block mb-1.5">Recipient User Account</label>
                      <select
                        value={payoutTargetPhone}
                        onChange={(e) => setPayoutTargetPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                      >
                        <option value="">Select registered user...</option>
                        {mergedUsers.map((u) => (
                          <option key={u.id} value={u.phoneNumber || u.id}>
                            {u.fullName} ({u.phoneNumber || u.id}) — ₦{(u.walletBalanceNgn || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-300 font-medium block mb-1.5">Amount (₦ NGN)</label>
                      <input
                        type="number"
                        required
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        placeholder="e.g. 125000 or -5000"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-medium block mb-1.5">Settlement / Audit Reason</label>
                    <input
                      type="text"
                      value={payoutNote}
                      onChange={(e) => setPayoutNote(e.target.value)}
                      placeholder="e.g. Merchant settlement batch #42"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>

                  {payoutFeedback && (
                    <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                      {payoutFeedback}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold whitespace-nowrap"
                    >
                      Execute Treasury Payout
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: VENDOR & STORE MANAGEMENT                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'stores' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      placeholder="Filter stores by name, owner, category..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-900/70 border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <select
                    value={storeStatusFilter}
                    onChange={(e) => setStoreStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending Verification</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportStoresCsv}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Stores Data Table */}
              <div className="rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/60">
                      <th className="py-3 px-4">Store Name</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">WhatsApp Link (wa.me)</th>
                      <th className="py-3 px-4">Store Tier</th>
                      <th className="py-3 px-4 text-right">Products Count</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {filteredStores.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-zinc-500">
                          No vendor stores found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredStores.map((store) => {
                        const waDigits = (store.ownerPhone || '').replace(/\D/g, '');
                        return (
                          <tr key={store.id} className="hover:bg-zinc-900/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{store.storeName}</span>
                                {store.verified && <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              </div>
                              <div className="text-[11px] text-zinc-500">{store.category}</div>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-200">{store.ownerName}</td>
                            <td className="py-3.5 px-4 font-mono">
                              {waDigits ? (
                                <a
                                  href={`https://wa.me/${waDigits}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>wa.me/{waDigits}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-zinc-500">Not linked</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={store.tier}
                                onChange={(e) => handleStoreMutation(store, { tier: e.target.value })}
                                className="px-2 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
                              >
                                <option value="starter_30">Basic (30)</option>
                                <option value="pro_100">Pro (100)</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-zinc-200">
                              {store.itemsCount} / {store.itemsLimit}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`font-mono text-[11px] uppercase font-semibold ${
                                  store.status === 'active'
                                    ? 'text-emerald-400'
                                    : store.status === 'suspended'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {store.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStoreMutation(store, { verified: !store.verified })}
                                  className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] whitespace-nowrap"
                                >
                                  {store.verified ? 'Unverify' : 'Verify'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStoreMutation(store, {
                                      status: store.status === 'active' ? 'suspended' : 'active',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                                    store.status === 'active'
                                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                                  }`}
                                >
                                  {store.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 4: USER & ARTISAN DIRECTORY                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/90 pb-3">
                <div className="flex items-center gap-1.5">
                  {([
                    { id: 'directory', label: `Registered Users (${mergedUsers.length})` },
                    { id: 'kyc', label: 'KYC (BVN/NIN) & Bans' },
                    { id: 'artisans', label: `Artisan Hub (${mergedArtisans.length})` },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setUsersTab(t.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        usersTab === t.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {badgeStatusMsg && (
                  <span className="text-xs font-mono text-emerald-400">{badgeStatusMsg}</span>
                )}
              </div>

              {/* Search & Filters (shared by directory & kyc) */}
              {(usersTab === 'directory' || usersTab === 'kyc') && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search by full name, phone, or user ID..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-900/70 border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="merchant">Merchant</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
              )}

              {/* 4A. Registered Users & Badges Table */}
              {usersTab === 'directory' && (
                <div className="rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/60">
                        <th className="py-3 px-4">User & Phone</th>
                        <th className="py-3 px-4">Role / Status</th>
                        <th className="py-3 px-4 text-right">Wallet (₦)</th>
                        <th className="py-3 px-4">Presence</th>
                        <th className="py-3 px-4">Verification Badge</th>
                        <th className="py-3 px-4 text-right">Dossier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-900/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="w-8 h-8 rounded-lg object-cover border border-zinc-800 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate">{user.fullName}</div>
                                <div className="text-[11px] font-mono text-zinc-400">{user.phoneNumber || user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono uppercase text-[11px] text-zinc-200">{user.role || 'user'}</div>
                            <div
                              className={`text-[11px] font-mono uppercase ${
                                user.status === 'banned'
                                  ? 'text-rose-400'
                                  : user.status === 'suspended'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {user.status || 'active'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-white font-semibold">
                            ₦{(user.walletBalanceNgn || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className={user.isOnline ? 'text-emerald-400' : 'text-zinc-500'}>
                              {user.isOnline ? 'ONLINE' : formatLastSeen(user.lastSeen)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {([
                                { id: 'blue', label: 'Blue', activeCls: 'bg-sky-600 text-white' },
                                { id: 'gold', label: 'Gold', activeCls: 'bg-amber-500 text-zinc-950 font-bold' },
                                { id: 'creator_plus', label: 'C+', activeCls: 'bg-violet-600 text-white' },
                                { id: null, label: 'None', activeCls: 'bg-zinc-700 text-white' },
                              ] as const).map((b) => {
                                const isActive = (user.verificationBadge || null) === b.id;
                                return (
                                  <button
                                    key={String(b.id)}
                                    type="button"
                                    onClick={async () => {
                                      const ok = await toggleUserVerification(user.phoneNumber || user.id, b.id, {
                                        phoneNumber: user.phoneNumber,
                                        fullName: user.fullName,
                                        avatarUrl: user.avatarUrl,
                                      });
                                      setBadgeStatusMsg(
                                        ok ? `${user.fullName}: ${b.label} badge synced live` : 'Failed to sync badge'
                                      );
                                      setTimeout(() => setBadgeStatusMsg(null), 2600);
                                    }}
                                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                                      isActive ? b.activeCls : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                    }`}
                                  >
                                    {b.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(user)}
                              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium whitespace-nowrap"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4B. KYC (BVN/NIN) & Account Bans */}
              {usersTab === 'kyc' && (
                <div className="rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/60">
                        <th className="py-3 px-4">Account</th>
                        <th className="py-3 px-4">KYC Tier & Status</th>
                        <th className="py-3 px-4">Account State</th>
                        <th className="py-3 px-4 text-right">KYC Verification</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-900/70">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{user.fullName}</div>
                            <div className="text-[11px] font-mono text-zinc-400">{user.phoneNumber || user.id}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className="text-zinc-300">{user.kycType || 'BVN'} · </span>
                            <span
                              className={
                                user.kycStatus === 'verified'
                                  ? 'text-emerald-400 font-semibold'
                                  : user.kycStatus === 'rejected'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }
                            >
                              {(user.kycStatus || 'unverified').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] uppercase">
                            <span className={user.status === 'banned' ? 'text-rose-400' : 'text-emerald-400'}>
                              {user.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleKycUpdate(user, 'verified', 'BVN')}
                                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] whitespace-nowrap"
                              >
                                Verify BVN
                              </button>
                              <button
                                type="button"
                                onClick={() => handleKycUpdate(user, 'verified', 'NIN')}
                                className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] whitespace-nowrap"
                              >
                                Verify NIN
                              </button>
                              <button
                                type="button"
                                onClick={() => handleKycUpdate(user, 'rejected', user.kycType || 'BVN')}
                                className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {user.status === 'banned' ? (
                              <button
                                type="button"
                                onClick={() => unbanUser(user.phoneNumber || user.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium whitespace-nowrap"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => banUser(user.phoneNumber || user.id, 'Banned from KYC compliance desk')}
                                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium whitespace-nowrap"
                              >
                                Ban Account
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4C. Artisan Hub Service Listings */}
              {usersTab === 'artisans' && (
                <div className="rounded-2xl backdrop-blur-md bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-950/60">
                        <th className="py-3 px-4">Artisan Station</th>
                        <th className="py-3 px-4">Trade / Category</th>
                        <th className="py-3 px-4">Owner & Contact</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Approval</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {mergedArtisans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-zinc-500">
                            No artisan stations registered yet.
                          </td>
                        </tr>
                      ) : (
                        mergedArtisans.map((art) => (
                          <tr key={art.id} className="hover:bg-zinc-900/70">
                            <td className="py-3.5 px-4 font-semibold text-white">{art.stationName}</td>
                            <td className="py-3.5 px-4 text-zinc-300">{art.category}</td>
                            <td className="py-3.5 px-4">
                              <div className="text-zinc-200">{art.ownerName}</div>
                              <div className="text-[11px] font-mono text-zinc-500">{art.ownerPhone}</div>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-400">{art.location}</td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              <span className={art.isApproved ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                                {art.isApproved ? 'APPROVED' : 'PENDING'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleArtisanMutation(art, !art.isApproved)}
                                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                                  art.isApproved
                                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                                }`}
                              >
                                {art.isApproved ? 'Suspend' : 'Approve Hub'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 5: COMMUNICATION & SOCIAL LOGS                             */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'comms' && (
            <div className="space-y-5">
              <div className="flex items-center gap-1.5 border-b border-zinc-800/90 pb-3">
                {([
                  { id: 'nodes', label: 'Node & Socket Stats' },
                  { id: 'broadcast', label: 'Global Broadcasts' },
                  { id: 'cms', label: 'CMS & Content' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCommsTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      commsTab === t.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 5A. Node & Socket Stats */}
              {commsTab === 'nodes' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90">
                      <span className="text-xs text-zinc-400">Active WebSocket Clients</span>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                        {healthData?.websocket.connectedClients ?? liveMetrics?.onlineUsersCount ?? 1}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90">
                      <span className="text-xs text-zinc-400">Town Communities</span>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                        {liveMetrics?.communitiesCount ?? 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90">
                      <span className="text-xs text-zinc-400">24h Status Updates</span>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                        {liveMetrics?.activeStatusesCount ?? 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/90">
                      <span className="text-xs text-zinc-400">Live Audio Spaces</span>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                        {audioSpaces.filter((s) => s.isLive).length}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3 text-xs">
                    <h3 className="text-sm font-semibold text-white">Currently Connected Socket Peers</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {(liveMetrics?.onlineUsers || []).length === 0 ? (
                        <p className="text-zinc-500 col-span-full">No remote WebSocket sessions listed in snapshot.</p>
                      ) : (
                        (liveMetrics?.onlineUsers || []).map((ou, idx) => (
                          <div
                            key={`${ou.userId}_${idx}`}
                            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center gap-3"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-white truncate">{ou.userName}</div>
                              <div className="text-[11px] font-mono text-zinc-500 truncate">{ou.userId}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 5B. Global Broadcasts */}
              {commsTab === 'broadcast' && (
                <div className="space-y-4 max-w-3xl">
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Dispatch Global System Announcement</h3>
                      <p className="text-xs text-zinc-400">Pushes a live banner across all connected devices via Socket.IO.</p>
                    </div>
                    <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
                      <div>
                        <label className="text-zinc-300 font-medium block mb-1">Banner Headline</label>
                        <input
                          type="text"
                          value={bcTitle}
                          onChange={(e) => setBcTitle(e.target.value)}
                          placeholder="e.g. Scheduled Network Maintenance"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-300 font-medium block mb-1">Message Body</label>
                        <textarea
                          rows={3}
                          value={bcMessage}
                          onChange={(e) => setBcMessage(e.target.value)}
                          placeholder="Enter broadcast details..."
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      {bcNotice && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                          {bcNotice}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          {(['info', 'warning', 'alert', 'urgent'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setBcLevel(lvl)}
                              className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-semibold ${
                                bcLevel === lvl ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={!bcTitle.trim() || !bcMessage.trim()}
                          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Push Live</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {systemBroadcast && (
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[11px] font-mono text-zinc-400 uppercase">Active Banner</span>
                        <h4 className="font-semibold text-white mt-0.5">{systemBroadcast.title}</h4>
                        <p className="text-zinc-300 mt-1">{systemBroadcast.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearAdminBroadcast()}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 font-medium whitespace-nowrap"
                      >
                        Remove Banner
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 5C. CMS & Content */}
              {commsTab === 'cms' && (
                <div className="space-y-5 max-w-4xl">
                  {/* Marquee Ticker */}
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-violet-400" />
                        Global Marquee Banner Ticker
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCmsData({
                            marqueeBanner: {
                              ...(cmsData?.marqueeBanner || { text: '', enabled: false, speed: 'normal', backgroundColor: '#7c3aed', textColor: '#ffffff' }),
                              enabled: !cmsData?.marqueeBanner?.enabled,
                            },
                          })
                        }
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          cmsData?.marqueeBanner?.enabled ? 'bg-violet-600' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            cmsData?.marqueeBanner?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cmsMarqueeDraft}
                        onChange={(e) => setCmsMarqueeDraft(e.target.value)}
                        placeholder="Enter scrolling ticker message..."
                        className="flex-1 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await updateCmsData({
                            marqueeBanner: {
                              ...(cmsData?.marqueeBanner || { enabled: true, speed: 'normal', backgroundColor: '#7c3aed', textColor: '#ffffff' }),
                              text: cmsMarqueeDraft,
                            },
                          });
                          if (ok) {
                            setCmsMarqueeSaved(true);
                            setTimeout(() => setCmsMarqueeSaved(false), 2500);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold whitespace-nowrap"
                      >
                        {cmsMarqueeSaved ? 'Saved!' : 'Save Banner'}
                      </button>
                    </div>
                  </div>

                  {/* Announcements */}
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Official Announcements</span>
                      <span className="font-mono text-zinc-400">{(cmsData?.announcements || []).length} items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cmsNewAnnTitle}
                        onChange={(e) => setCmsNewAnnTitle(e.target.value)}
                        placeholder="Announcement title..."
                        className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cmsNewAnnMsg}
                          onChange={(e) => setCmsNewAnnMsg(e.target.value)}
                          placeholder="Announcement details..."
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                        />
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
                          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold whitespace-nowrap flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Post</span>
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-800/70">
                      {(cmsData?.announcements || []).map((ann, idx) => (
                        <div key={ann.id || idx} className="py-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-white">{ann.title}</div>
                            <p className="text-zinc-400 mt-0.5">{ann.content}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(cmsData?.announcements || [])];
                                updated[idx] = { ...updated[idx], active: !updated[idx].active };
                                updateCmsData({ announcements: updated });
                              }}
                              className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-[11px]"
                            >
                              {ann.active ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateCmsData({
                                  announcements: (cmsData?.announcements || []).filter((_, i) => i !== idx),
                                })
                              }
                              className="p-1 text-rose-400 hover:bg-rose-950/40 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ & Community Guidelines */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-violet-400" />
                        Help Center FAQ
                      </span>
                      <input
                        type="text"
                        value={cmsFaqQuestion}
                        onChange={(e) => setCmsFaqQuestion(e.target.value)}
                        placeholder="Question..."
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                      />
                      <textarea
                        rows={2}
                        value={cmsFaqAnswer}
                        onChange={(e) => setCmsFaqAnswer(e.target.value)}
                        placeholder="Answer..."
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                      />
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
                        className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold disabled:opacity-50"
                      >
                        Add FAQ Article
                      </button>
                      <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                        {(cmsData?.faqArticles || []).map((f, idx) => (
                          <div key={f.id || idx} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between gap-2">
                            <div>
                              <div className="font-semibold text-zinc-200">{f.question}</div>
                              <div className="text-zinc-400 mt-0.5">{f.answer}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateCmsData({ faqArticles: (cmsData?.faqArticles || []).filter((_, i) => i !== idx) })
                              }
                              className="text-rose-400 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-violet-400" />
                        Community Rules & Guidelines
                      </span>
                      <textarea
                        rows={7}
                        value={cmsGuidelines}
                        onChange={(e) => setCmsGuidelines(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await updateCmsData({ communityGuidelines: cmsGuidelines });
                          setCmsSaved(true);
                          setTimeout(() => setCmsSaved(false), 2500);
                        }}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold"
                      >
                        {cmsSaved ? 'Guidelines Saved!' : 'Save Community Rules'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 6: SYSTEM & SECURITY                                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeSection === 'security' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800/90 pb-3 overflow-x-auto">
                {([
                  { id: 'waf', label: 'Rate Limits & IP Blocklist' },
                  { id: 'audit', label: 'Immutable Audit Trail' },
                  { id: 'features', label: 'Feature Toggles' },
                  { id: 'config', label: 'System Config' },
                  { id: 'rbac', label: 'Multi-Admin RBAC' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSecurityTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      securityTab === t.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 6A. Rate Limits, WAF & IP Blocklist */}
              {securityTab === 'waf' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                  {/* Left: IP Blocklist Manager */}
                  <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Active IP Blocklist</h3>
                      <p className="text-zinc-400 mt-0.5">Immediately blocks API requests from listed client IPs.</p>
                    </div>

                    <form onSubmit={handleBlockIp} className="space-y-2.5">
                      <input
                        type="text"
                        required
                        value={blockIpInput}
                        onChange={(e) => setBlockIpInput(e.target.value)}
                        placeholder="IP address (e.g. 197.210.84.12)"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={blockIpReason}
                          onChange={(e) => setBlockIpReason(e.target.value)}
                          placeholder="Reason (rate limit abuse, SQLi probe...)"
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap"
                        >
                          Block IP
                        </button>
                      </div>
                    </form>

                    <div className="divide-y divide-zinc-800/70 max-h-72 overflow-y-auto">
                      {blockedIps.length === 0 ? (
                        <p className="py-4 text-center text-zinc-500">No IPs currently blocked.</p>
                      ) : (
                        blockedIps.map((b) => (
                          <div key={b.ip} className="py-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono font-semibold text-rose-400">{b.ip}</div>
                              <div className="text-zinc-400 truncate">{b.reason}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnblockIp(b.ip)}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] shrink-0"
                            >
                              Unblock
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Live Security / Rate-Limit Events */}
                  <div className="lg:col-span-7 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                    <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">WAF, Bot & Rate-Limit Logs</span>
                      <span className="font-mono text-zinc-400">{securityEvents.length} events</span>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4">IP</th>
                          <th className="py-2.5 px-4">Reason</th>
                          <th className="py-2.5 px-4 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {securityEvents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-500">
                              No rate-limit or WAF violations triggered.
                            </td>
                          </tr>
                        ) : (
                          securityEvents.map((ev) => (
                            <tr key={ev.id} className="hover:bg-zinc-900/70">
                              <td className="py-2.5 px-4 font-mono uppercase text-[11px] text-rose-400">{ev.type}</td>
                              <td className="py-2.5 px-4 font-mono text-zinc-200">{ev.ip}</td>
                              <td className="py-2.5 px-4 text-zinc-300">{ev.reason}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-zinc-500 tabular-nums">
                                {new Date(ev.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6B. Immutable Audit Trail */}
              {securityTab === 'audit' && (
                <div className="space-y-4 text-xs">
                  <div className="relative max-w-md">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Filter audit trail by Ref ID, actor, or target..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/90 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Ref ID</th>
                          <th className="py-3 px-4">Actor</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Target & Details</th>
                          <th className="py-3 px-4">Co-Signer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredAuditTrail.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-zinc-500">
                              No audit events matching query.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditTrail.map((a) => (
                            <tr
                              key={a.id}
                              onClick={() => openAuditDrawer(a.refId, { title: `${a.action} · ${a.target}` })}
                              className="hover:bg-zinc-900/80 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4 font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                                {new Date(a.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-violet-400 whitespace-nowrap">{a.refId}</td>
                              <td className="py-3 px-4 text-zinc-200 whitespace-nowrap">{a.actor}</td>
                              <td className="py-3 px-4 font-medium text-white whitespace-nowrap">{a.action}</td>
                              <td className="py-3 px-4 text-zinc-300">
                                <span className="font-medium text-zinc-200">{a.target}</span> — {a.details}
                              </td>
                              <td className="py-3 px-4 font-mono text-emerald-400 whitespace-nowrap">
                                {a.dualApprovedBy || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6C. Live Feature Toggles */}
              {securityTab === 'features' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">
                      Toggle platform capabilities live across all connected devices. Wallet acts as the financial master switch.
                    </p>
                    {featureStatusMsg && <span className="text-xs font-mono text-emerald-400">{featureStatusMsg}</span>}
                  </div>
                  {([
                    {
                      group: 'Core Finance & Vaults',
                      flags: [
                        { key: 'wallet', label: 'Wallet (Master Switch)', desc: 'Paystack topup, balances & all monetary operations' },
                        { key: 'p2pTransfers', label: 'P2P Transfers', desc: 'Direct phone-to-phone transfers' },
                        { key: 'escrow', label: 'Escrow Vault', desc: 'Buyer-protected marketplace payments' },
                        { key: 'ajo', label: 'Ajo / Thrift Circle', desc: 'Rotating communal savings' },
                        { key: 'payroll', label: 'Payroll & Bulk Disbursements', desc: 'Scheduled salary payouts' },
                        { key: 'delayedSend', label: 'Delayed Send (Anti-Fraud)', desc: 'Reversible hold window on transfers' },
                        { key: 'securityPin', label: 'Security PIN', desc: 'Mandatory PIN for transactions' },
                      ],
                    },
                    {
                      group: 'Services & Dispatch (3-dot Menu)',
                      flags: [
                        { key: 'dispatch', label: 'Courier Dispatch (PickkR / Gokada)', desc: 'Doorstep courier bookings' },
                        { key: 'artisan', label: 'Artisan Hub', desc: 'Verified trade & craft bookings' },
                        { key: 'healthcare', label: 'AfriHealth Telehealth', desc: 'Clinic queues & tele-consults' },
                        { key: 'legal', label: 'AfriLaw Legal Services', desc: 'Smart contracts & attorneys' },
                        { key: 'jobs', label: 'Job Board & Gig Marketplace', desc: 'Jobs & freelance hiring' },
                        { key: 'petShop', label: 'Pet Shop & Veterinary Forum', desc: 'Pet marketplace & vet Q&A' },
                        { key: 'errands', label: 'Errands & Runner Network', desc: 'Market runs & grocery pickups' },
                      ],
                    },
                    {
                      group: 'Creator Economy, Nav & Comms',
                      flags: [
                        { key: 'creator', label: 'Creator Hub', desc: 'VIP calls, tips & exclusive drops' },
                        { key: 'audioSpaces', label: 'Audio Spaces', desc: 'Live street radio stages' },
                        { key: 'writers', label: 'Writers Guild', desc: 'AfriBooks serialized publishing' },
                        { key: 'storeTiers', label: 'Merchant Store Tiers', desc: 'Basic / Pro vendor subscriptions' },
                        { key: 'tutor', label: 'Tutors & Skill Academy', desc: 'Online courses & tutoring' },
                        { key: 'referral', label: 'Invite & Earn', desc: 'Referral bonus rewards' },
                        { key: 'memeStudio', label: 'Meme & Sticker Studio', desc: 'Culture sticker generator' },
                        { key: 'scamChecker', label: 'Scam Checker', desc: 'Phone & bank verification lookup' },
                        { key: 'town', label: 'Town Square', desc: 'Public communities & channels' },
                        { key: 'market', label: 'Marketplace Directory', desc: 'Catalogues & vendor listings' },
                        { key: 'status', label: '24h Stories / Status', desc: 'Disappearing media updates' },
                        { key: 'calls', label: 'Voice & Video Calls', desc: 'WebRTC real-time calling' },
                        { key: 'voiceNotes', label: 'Voice Notes', desc: 'Audio messages in chats' },
                      ],
                    },
                  ] as { group: string; flags: { key: keyof FeatureFlags; label: string; desc: string }[] }[]).map(
                    ({ group, flags }) => (
                      <div key={group} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{group}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {flags.map(({ key, label, desc }) => {
                            const flagKey = key as keyof FeatureFlags;
                            const enabled = featureFlags[flagKey] !== false;
                            const isWalletDependent = ['p2pTransfers', 'escrow', 'ajo', 'payroll', 'delayedSend', 'securityPin'].includes(
                              key as string
                            );
                            const isLocked = !featureFlags.wallet && isWalletDependent;
                            return (
                              <div
                                key={key as string}
                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                                  isLocked ? 'bg-zinc-950/30 border-zinc-800/40 opacity-50' : 'bg-zinc-950/70 border-zinc-800'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-white truncate">{label}</div>
                                  <div className="text-[11px] text-zinc-500 truncate">{desc}</div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={async () => {
                                    const ok = await updateAdminFeatureFlag(flagKey);
                                    setFeatureStatusMsg(ok ? `${label}: Saved Live` : `${label}: Sync error`);
                                    setTimeout(() => setFeatureStatusMsg(null), 2200);
                                  }}
                                  className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                                    enabled && !isLocked ? 'bg-violet-600' : 'bg-zinc-700'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                                      enabled && !isLocked ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 6D. System Configuration */}
              {securityTab === 'config' && (
                <div className="space-y-4 max-w-4xl text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-zinc-400">Live platform rules persisted to backend disk and pushed over Socket.IO.</p>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                        configSaved ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {configSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{configSaved ? 'Config Saved!' : 'Save & Apply Settings'}</span>
                    </button>
                  </div>
                  {configError && (
                    <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300">{configError}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">Maintenance Mode</div>
                        <div className="text-[11px] text-zinc-400">Lock non-admin clients</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCfgMaintenanceMode(!cfgMaintenanceMode)}
                        className={`w-11 h-6 rounded-full relative ${cfgMaintenanceMode ? 'bg-rose-600' : 'bg-zinc-700'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${cfgMaintenanceMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">Allow Registrations</div>
                        <div className="text-[11px] text-zinc-400">Accept new phone signups</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCfgAllowReg(!cfgAllowReg)}
                        className={`w-11 h-6 rounded-full relative ${cfgAllowReg ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${cfgAllowReg ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">Require Phone OTP</div>
                        <div className="text-[11px] text-zinc-400">Mandatory verification</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCfgRequireOtp(!cfgRequireOtp)}
                        className={`w-11 h-6 rounded-full relative ${cfgRequireOtp ? 'bg-violet-600' : 'bg-zinc-700'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${cfgRequireOtp ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {cfgMaintenanceMode && (
                    <textarea
                      rows={2}
                      value={cfgMaintenanceMsg}
                      onChange={(e) => setCfgMaintenanceMsg(e.target.value)}
                      placeholder="Maintenance banner text..."
                      className="w-full px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-950/20 text-white"
                    />
                  )}

                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">Dispatch Fee (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={cfgDispatchComm}
                        onChange={(e) => setCfgDispatchComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Escrow Fee (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={cfgEscrowComm}
                        onChange={(e) => setCfgEscrowComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Artisan Fee (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={cfgArtisanComm}
                        onChange={(e) => setCfgArtisanComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Creator Fee (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={cfgCreatorComm}
                        onChange={(e) => setCfgCreatorComm(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Min Transfer (₦)</label>
                      <input
                        type="number"
                        value={cfgMinTransfer}
                        onChange={(e) => setCfgMinTransfer(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Max Daily (₦)</label>
                      <input
                        type="number"
                        value={cfgMaxDailyTransfer}
                        onChange={(e) => setCfgMaxDailyTransfer(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Hold Window (Mins)</label>
                      <input
                        type="number"
                        value={cfgDelayMins}
                        onChange={(e) => setCfgDelayMins(parseInt(e.target.value, 10) || 10)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Support Phone</label>
                      <input
                        type="text"
                        value={cfgSupportPhone}
                        onChange={(e) => setCfgSupportPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6E. Multi-Admin RBAC */}
              {securityTab === 'rbac' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Authorized Admin Operators</h3>
                    <div className="divide-y divide-zinc-800/70">
                      {mergedUsers.filter((u) => u.role === 'admin' || u.phoneNumber === currentUser?.phoneNumber).map((adm) => (
                        <div key={adm.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{adm.fullName}</div>
                            <div className="font-mono text-[11px] text-zinc-400">{adm.phoneNumber}</div>
                          </div>
                          <span className="font-mono text-[11px] uppercase text-violet-400">{adm.role || 'admin'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Dual-Admin & RBAC Guardrails</h3>
                    <div className="space-y-2 text-zinc-300">
                      <div className="flex justify-between py-1.5 border-b border-zinc-800/70">
                        <span className="text-zinc-400">Dual-Sign-Off Threshold</span>
                        <span className="font-mono text-amber-400 font-semibold">₦{DUAL_ADMIN_THRESHOLD_NGN.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800/70">
                        <span className="text-zinc-400">Active Session Token</span>
                        <span className="font-mono text-zinc-200">{sessionToken}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-zinc-400">Audit Storage Mode</span>
                        <span className="font-mono text-emerald-400">Append-Only Immutable</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Executive Footer */}
        <footer className="px-6 py-2.5 bg-zinc-950 border-t border-zinc-800/90 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <span>Last synced: {lastRefreshedAt.toLocaleTimeString()}</span>
          <span>AGC Control Center · Port 3000</span>
        </footer>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL COMMAND SEARCH MODAL (CTRL + K)                                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {globalSearchOpen && (
        <div
          className="fixed inset-0 z-[125] flex items-start justify-center pt-16 p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setGlobalSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-violet-400 shrink-0" />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search users, transaction hashes, store names, or artisan IDs..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">ESC</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 space-y-3">
              {!globalSearchQuery.trim() ? (
                <div className="p-6 text-center text-zinc-500">
                  Start typing to jump to any user dossier, escrow transaction audit trail, store, or artisan hub.
                </div>
              ) : (
                <>
                  {globalSearchResults.users.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase text-zinc-500">Users</div>
                      {globalSearchResults.users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setActiveSection('users');
                            setUsersTab('directory');
                            setSelectedCustomer(u);
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-white">{u.fullName}</span>
                          <span className="font-mono text-zinc-400">{u.phoneNumber || u.id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.escrows.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase text-zinc-500">Escrow Transactions</div>
                      {globalSearchResults.escrows.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setActiveSection('finance');
                            setFinanceTab('escrows');
                            openAuditDrawer(o.paystackRef || o.id, { title: o.product.title, amountNgn: o.totalAmount, order: o });
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left"
                        >
                          <span className="font-mono text-violet-400">{o.paystackRef || o.id} · {o.product.title}</span>
                          <span className="font-mono text-emerald-400">₦{o.totalAmount.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.stores.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase text-zinc-500">Stores</div>
                      {globalSearchResults.stores.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setActiveSection('stores');
                            setStoreSearch(s.storeName);
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-white">{s.storeName}</span>
                          <span className="font-mono text-zinc-400">{s.ownerName}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.artisans.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase text-zinc-500">Artisans</div>
                      {globalSearchResults.artisans.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setActiveSection('users');
                            setUsersTab('artisans');
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-white">{a.stationName}</span>
                          <span className="font-mono text-zinc-400">{a.id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.audits.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase text-zinc-500">Audit Refs</div>
                      {globalSearchResults.audits.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            openAuditDrawer(a.refId, { title: a.action });
                            setGlobalSearchOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left"
                        >
                          <span className="font-mono text-violet-400">{a.refId}</span>
                          <span className="text-zinc-300 truncate max-w-[260px]">{a.action}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.users.length === 0 &&
                    globalSearchResults.escrows.length === 0 &&
                    globalSearchResults.stores.length === 0 &&
                    globalSearchResults.artisans.length === 0 &&
                    globalSearchResults.audits.length === 0 && (
                      <div className="p-6 text-center text-zinc-500">No matching records across the platform.</div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* CUSTOMER INFO DOSSIER MODAL                                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedCustomer.avatarUrl}
                  alt={selectedCustomer.fullName}
                  className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{selectedCustomer.fullName}</h3>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {selectedCustomer.phoneNumber || selectedCustomer.id} · KYC {(selectedCustomer.kycStatus || 'unverified').toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <label className="text-[11px] text-zinc-400 block mb-1">Account Role</label>
                  <select
                    value={selectedCustomer.role || 'user'}
                    onChange={async (e) => {
                      const nextRole = e.target.value as any;
                      await setUserRole(selectedCustomer.phoneNumber || selectedCustomer.id, nextRole);
                      setSelectedCustomer({ ...selectedCustomer, role: nextRole });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono"
                  >
                    <option value="user">user</option>
                    <option value="creator">creator</option>
                    <option value="merchant">merchant</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <label className="text-[11px] text-zinc-400 block mb-1">Verification Badge</label>
                  <div className="flex items-center gap-1">
                    {(['blue', 'gold', 'creator_plus', null] as const).map((b) => (
                      <button
                        key={String(b)}
                        type="button"
                        onClick={async () => {
                          await toggleUserVerification(selectedCustomer.phoneNumber || selectedCustomer.id, b, {
                            phoneNumber: selectedCustomer.phoneNumber,
                            fullName: selectedCustomer.fullName,
                            avatarUrl: selectedCustomer.avatarUrl,
                          });
                          setSelectedCustomer({ ...selectedCustomer, verificationBadge: b });
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium ${
                          (selectedCustomer.verificationBadge || null) === b
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {b === 'creator_plus' ? 'C+' : b || 'None'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wallet Adjuster */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Wallet Balance</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    ₦{(selectedCustomer.walletBalanceNgn || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customerWalletDelta}
                    onChange={(e) => setCustomerWalletDelta(e.target.value)}
                    placeholder="Credit/debit delta (e.g. 5000 or -1000)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-white"
                  />
                  <button
                    type="button"
                    disabled={!customerWalletDelta || isNaN(Number(customerWalletDelta))}
                    onClick={async () => {
                      const delta = Number(customerWalletDelta);
                      await adjustUserWallet(selectedCustomer.phoneNumber || selectedCustomer.id, delta, false);
                      setSelectedCustomer({
                        ...selectedCustomer,
                        walletBalanceNgn: Math.max(0, (selectedCustomer.walletBalanceNgn || 0) + delta),
                      });
                      setCustomerWalletDelta('');
                      setCustomerWalletSuccess(true);
                      setTimeout(() => setCustomerWalletSuccess(false), 2400);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold"
                  >
                    Apply Live
                  </button>
                </div>
                {customerWalletSuccess && <div className="text-emerald-400">Wallet updated on server.</div>}
              </div>

              {/* Ban & Session Controls */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <div className="font-semibold text-rose-400">Security & Session Controls</div>
                {selectedCustomer.status !== 'banned' ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={customerBanReason}
                      onChange={(e) => setCustomerBanReason(e.target.value)}
                      placeholder="Permanent ban reason..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const reason = customerBanReason.trim() || 'Policy violation';
                          await banUser(selectedCustomer.phoneNumber || selectedCustomer.id, reason);
                          setSelectedCustomer({ ...selectedCustomer, status: 'banned', banReason: reason });
                          setCustomerBanReason('');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                      >
                        Permanently Ban
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserStatus(selectedCustomer.phoneNumber || selectedCustomer.id, 'suspended');
                          setSelectedCustomer({ ...selectedCustomer, status: 'suspended' });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await kickUserSession(selectedCustomer.phoneNumber || selectedCustomer.id);
                          notify(`Terminated socket session for ${selectedCustomer.fullName}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      >
                        Force Logout / Kick
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-rose-300">Banned: {selectedCustomer.banReason || 'Permanent block'}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await unbanUser(selectedCustomer.phoneNumber || selectedCustomer.id);
                        setSelectedCustomer({ ...selectedCustomer, status: 'active' });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                    >
                      Restore Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ARBITRATION DISPUTE MODAL, DUAL-ADMIN SIGN-OFF & AUDIT DRAWER            */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <EscrowDisputeModal
        order={disputeOrder}
        onClose={() => setDisputeOrder(null)}
        onInspectAudit={(refId) => openAuditDrawer(refId, { title: disputeOrder?.product.title, order: disputeOrder })}
        onResolveRequest={requestEscrowResolution}
        messages={messages}
        formatPrice={formatPrice}
      />

      <DualAdminApprovalModal
        isOpen={dualApprovalRequest.isOpen}
        onClose={() =>
          setDualApprovalRequest((prev) => ({ ...prev, isOpen: false, isSubmitting: false, errorMsg: null }))
        }
        onConfirm={handleDualApprovalConfirm}
        actionLabel={dualApprovalRequest.actionLabel}
        targetSummary={dualApprovalRequest.targetSummary}
        amountNgn={dualApprovalRequest.amountNgn}
        thresholdNgn={DUAL_ADMIN_THRESHOLD_NGN}
        errorMsg={dualApprovalRequest.errorMsg}
        isSubmitting={dualApprovalRequest.isSubmitting}
      />

      <AdminAuditDrawer
        isOpen={auditDrawerState.isOpen}
        onClose={() => setAuditDrawerState({ isOpen: false, refId: null })}
        refId={auditDrawerState.refId}
        title={auditDrawerState.title}
        amountNgn={auditDrawerState.amountNgn}
        order={auditDrawerState.order}
        auditEntries={auditTrail}
        webhookLogs={webhookLogs}
      />
    </div>
  );
};
