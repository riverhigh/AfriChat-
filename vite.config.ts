import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function agcApiPlugin(): Plugin {
  const usersFile = path.resolve(import.meta.dirname || '.', 'data_users.json');
  const configFile = path.resolve(import.meta.dirname || '.', 'data_admin_config.json');
  const cmsFile = path.resolve(import.meta.dirname || '.', 'data_admin_cms.json');
  const dispatchFile = path.resolve(import.meta.dirname || '.', 'data_dispatch_orders.json');

  const DEFAULT_SYSTEM_CONFIG = {
    maintenanceMode: false,
    maintenanceMessage: 'AfriChat is undergoing scheduled system upgrades. We will be back shortly.',
    allowNewRegistrations: true,
    requirePhoneOtp: false,
    defaultCurrency: 'NGN',
    dispatchCommissionPercent: 5,
    escrowCommissionPercent: 1.5,
    artisanCommissionPercent: 2,
    creatorCommissionPercent: 5,
    minTransferAmountNgn: 100,
    maxDailyTransferNgn: 5000000,
    delayedSendHoldDurationMins: 15,
    lowBandwidthDefault: false,
    supportContactPhone: '+234800000000',
  };

  const DEFAULT_FEATURE_FLAGS = {
    wallet: true,
    p2pTransfers: true,
    escrow: true,
    delayedSend: true,
    securityPin: true,
    dispatch: true,
    artisan: true,
    healthcare: true,
    legal: true,
    jobs: true,
    petShop: true,
    errands: true,
    creator: true,
    audioSpaces: true,
    writers: true,
    storeTiers: true,
    tutor: true,
    referral: true,
    memeStudio: true,
    scamChecker: true,
    town: true,
    market: true,
    status: true,
    calls: true,
    voiceNotes: true,
    ajo: true,
    payroll: true,
  };

  const DEFAULT_CMS_DATA = {
    announcements: [
      {
        id: 'ann_welcome',
        title: 'Welcome to AfriChat Super-App 2.0!',
        message: 'Experience high-speed chat, verified merchant escrow, and local dispatch across Africa.',
        content: 'Experience high-speed chat, verified merchant escrow, and local dispatch across Africa.',
        level: 'info' as const,
        audience: 'all' as const,
        actionUrl: '',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    marqueeBanner: {
      enabled: true,
      text: '⚡ Welcome to AfriChat! Zero-fee transfers, instant dispatch deliveries, and escrow protection live across Africa.',
      speed: 'normal' as const,
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
    },
    faqArticles: [
      {
        id: 'faq_escrow',
        question: 'How does Balogun Escrow Protection work?',
        answer: 'When you purchase goods or book an artisan, your payment is held securely in an encrypted vault until you confirm satisfactory delivery.',
        category: 'escrow' as const,
        published: true,
      },
      {
        id: 'faq_dispatch',
        question: 'How do PickkR and Gokada dispatch deliveries work?',
        answer: 'Our dispatch system matches nearby verified riders. A 5% platform fee guarantees insurance and GPS parcel tracking.',
        category: 'dispatch' as const,
        published: true,
      },
      {
        id: 'faq_safety',
        question: 'How do I avoid scammers on P2P payments?',
        answer: 'Use the Scam Shield tool in the 3-dot menu before sending funds. Never release escrow funds until you inspect items physically.',
        category: 'security' as const,
        published: true,
      },
    ],
    communityGuidelines: '1. Treat all community members with respect.\n2. No fraudulent listings, phishing links, or unauthorized transactions.\n3. Verified badges are subject to continuous compliance with AfriChat terms.',
    termsOfService: 'AfriChat provides communication, marketplace escrow mediation, and logistical dispatch coordination across African regions.',
    sponsorSpotlight: {
      enabled: true,
      brandName: 'Kente Pay Africa',
      tagline: 'Zero-Fee African Merchant Remittances',
      bannerUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      linkUrl: '',
    },
  };

  const readUsers = (): any[] => {
    try {
      if (fs.existsSync(usersFile)) {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      }
    } catch (_) {}
    return [];
  };

  const writeUsers = (users: any[]) => {
    try {
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
    } catch (_) {}
  };

  const readConfig = () => {
    try {
      if (fs.existsSync(configFile)) {
        const raw = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return {
          config: { ...DEFAULT_SYSTEM_CONFIG, ...(raw.config || {}) },
          featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...(raw.featureFlags || {}) },
        };
      }
    } catch (_) {}
    return { config: DEFAULT_SYSTEM_CONFIG, featureFlags: DEFAULT_FEATURE_FLAGS };
  };

  const writeConfig = (data: { config?: any; featureFlags?: any }) => {
    try {
      const current = readConfig();
      const updated = {
        config: data.config ? { ...current.config, ...data.config } : current.config,
        featureFlags: data.featureFlags ? { ...current.featureFlags, ...data.featureFlags } : current.featureFlags,
      };
      fs.writeFileSync(configFile, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (_) {
      return readConfig();
    }
  };

  const readCms = () => {
    try {
      if (fs.existsSync(cmsFile)) {
        const raw = JSON.parse(fs.readFileSync(cmsFile, 'utf8'));
        return { ...DEFAULT_CMS_DATA, ...(raw || {}) };
      }
    } catch (_) {}
    return DEFAULT_CMS_DATA;
  };

  const writeCms = (data: any) => {
    try {
      const current = readCms();
      const updated = { ...current, ...data };
      fs.writeFileSync(cmsFile, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (_) {
      return readCms();
    }
  };

  const readDispatch = (): any[] => {
    try {
      if (fs.existsSync(dispatchFile)) {
        return JSON.parse(fs.readFileSync(dispatchFile, 'utf8'));
      }
    } catch (_) {}
    return [];
  };

  const readBody = (req: any): Promise<any> => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (_) {
          resolve({});
        }
      });
    });
  };

  return {
    name: 'agc-api-plugin',
    apply: 'serve' as const,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (!req.url.startsWith('/api/users') && !req.url.startsWith('/api/admin') && !req.url.startsWith('/api/dispatch'))) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        // ======================== USER APIS ========================
        // Check phone duplicate
        if (url.pathname === '/api/users/check-phone') {
          const raw = url.searchParams.get('phone') || '';
          const clean = raw.replace(/\D/g, '');
          const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
          const users = readUsers();
          const found = users.find((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            return up === clean || (last9.length >= 7 && up.endsWith(last9));
          });
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify(
              found
                ? { registered: true, name: found.fullName || found.name, avatarUrl: found.avatarUrl }
                : { registered: false }
            )
          );
        }

        // Check username uniqueness
        if (url.pathname === '/api/users/check-username') {
          const uName = (url.searchParams.get('username') || '').toLowerCase().replace(/^@/, '').trim();
          const users = readUsers();
          const found = users.some(
            (u) => (u.fullName || u.name || '').toLowerCase().replace(/^@/, '').trim() === uName
          );
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ taken: found }));
        }

        // Lookup user by phone
        if (url.pathname === '/api/users/lookup') {
          const raw = url.searchParams.get('phone') || '';
          const clean = raw.replace(/\D/g, '');
          const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
          const users = readUsers();
          const found = users.find((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            return up === clean || (last9.length >= 7 && up.endsWith(last9));
          });
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(found ? { found: true, user: found } : { found: false }));
        }

        // List all users
        if (url.pathname === '/api/users' && req.method === 'GET') {
          const users = readUsers();
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ users }));
        }

        // Register user
        if (url.pathname === '/api/users/register' && req.method === 'POST') {
          const user = await readBody(req);
          if (user.phoneNumber) {
            const users = readUsers();
            const clean = user.phoneNumber.replace(/\D/g, '');
            const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
            const filtered = users.filter((u) => {
              const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
              return up !== clean && (!last9 || !up.endsWith(last9));
            });
            filtered.push(user);
            writeUsers(filtered);
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        // ======================== ADMIN APIS ========================
        // 1. Admin Metrics
        if (url.pathname === '/api/admin/metrics' && req.method === 'GET') {
          const rawUsers = readUsers();
          const registeredUsers = rawUsers.map((u: any) => ({
            id: u.id || `usr_${(u.phoneNumber || '').replace(/\D/g, '') || Date.now()}`,
            fullName: u.fullName || u.name || 'User',
            phoneNumber: u.phoneNumber || u.phone || '',
            avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: u.role || 'user',
            verificationBadge: u.verificationBadge || null,
            isPhoneVerified: Boolean(u.isPhoneVerified),
            status: u.status || 'active',
            bannedAt: u.bannedAt,
            banReason: u.banReason,
            joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent',
            walletBalanceNgn: u.walletBalanceNgn ?? 50000,
            ordersCount: u.ordersCount || 0,
            isOnline: u.lastSeen === 'online',
            lastSeen: u.lastSeen || null,
          }));

          const dispatchOrders = readDispatch();
          const activeDeliveries = dispatchOrders.filter((o) => o.status === 'in_transit' || o.status === 'driver_assigned' || o.status === 'requested');
          const completedDeliveries = dispatchOrders.filter((o) => o.status === 'delivered');
          const totalVolumeNgn = completedDeliveries.reduce((acc, o) => acc + (o.deliveryFeeNgn || 0), 0);

          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              uptimeSeconds: Math.floor(process.uptime()),
              serverMemoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
              onlineUsersCount: registeredUsers.filter((u) => u.isOnline).length,
              onlineUsers: registeredUsers.filter((u) => u.isOnline).map((u) => ({ userId: u.id, userName: u.fullName, avatar: u.avatarUrl })),
              registeredUsersCount: registeredUsers.length,
              registeredUsers,
              communitiesCount: 6,
              activeStatusesCount: 0,
              dispatch: {
                totalOrdersCount: dispatchOrders.length,
                activeDeliveriesCount: activeDeliveries.length,
                completedDeliveriesCount: completedDeliveries.length,
                totalVolumeNgn,
                totalCommissionNgn: totalVolumeNgn * 0.05,
                orders: dispatchOrders.slice(0, 50),
              },
              systemStatus: 'healthy',
            })
          );
        }

        // 2. Admin System Config & Features: GET
        if (url.pathname === '/api/admin/config' && req.method === 'GET') {
          const c = readConfig();
          const cms = readCms();
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, config: c.config, featureFlags: c.featureFlags, cms }));
        }

        // 3. Admin System Config: POST
        if (url.pathname === '/api/admin/config' && req.method === 'POST') {
          const body = await readBody(req);
          const updated = writeConfig({ config: body });
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, config: updated.config }));
        }

        // 4. Admin Feature Flags: POST
        if (url.pathname === '/api/admin/features' && req.method === 'POST') {
          const body = await readBody(req);
          const updated = writeConfig({ featureFlags: body });
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, featureFlags: updated.featureFlags }));
        }

        // 5. Admin CMS Content: POST
        if (url.pathname === '/api/admin/cms' && req.method === 'POST') {
          const body = await readBody(req);
          const updated = writeCms(body);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, cms: updated }));
        }

        // 6. Admin Ban User: POST /api/admin/users/:phone/ban
        if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/ban$/) && req.method === 'POST') {
          const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/ban$/);
          const phone = match ? match[1] : '';
          const clean = phone.replace(/\D/g, '');
          const body = await readBody(req);
          const reason = body.reason || 'Violation of AfriChat platform terms and conditions.';
          const bannedAt = new Date().toISOString();

          const users = readUsers();
          let targetUser: any = null;
          users.forEach((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            if (up === clean || (clean && up.endsWith(clean)) || (clean && clean.endsWith(up))) {
              u.status = 'banned';
              u.bannedAt = bannedAt;
              u.banReason = reason;
              u.isOnline = false;
              u.lastSeen = 'Banned';
              targetUser = u;
            }
          });
          writeUsers(users);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, user: targetUser }));
        }

        // 7. Admin Unban User: POST /api/admin/users/:phone/unban
        if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/unban$/) && req.method === 'POST') {
          const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/unban$/);
          const phone = match ? match[1] : '';
          const clean = phone.replace(/\D/g, '');

          const users = readUsers();
          let targetUser: any = null;
          users.forEach((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            if (up === clean || (clean && up.endsWith(clean)) || (clean && clean.endsWith(up))) {
              u.status = 'active';
              delete u.bannedAt;
              delete u.banReason;
              targetUser = u;
            }
          });
          writeUsers(users);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, user: targetUser }));
        }

        // 8. Admin Adjust Wallet: POST /api/admin/users/:phone/adjust-wallet
        if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/adjust-wallet$/) && req.method === 'POST') {
          const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/adjust-wallet$/);
          const phone = match ? match[1] : '';
          const clean = phone.replace(/\D/g, '');
          const body = await readBody(req);

          const users = readUsers();
          let targetUser: any = null;
          users.forEach((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            if (up === clean || (clean && up.endsWith(clean)) || (clean && clean.endsWith(up))) {
              const currentBal = Number(u.walletBalanceNgn ?? 50000);
              const newBalance = body.newBalance !== undefined ? Number(body.newBalance) : Math.max(0, currentBal + Number(body.deltaNgn || 0));
              u.walletBalanceNgn = newBalance;
              targetUser = u;
            }
          });
          writeUsers(users);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, user: targetUser }));
        }

        // 9. Admin User Status & Badge: PATCH
        if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/(badge|status)$/) && req.method === 'PATCH') {
          const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/(badge|status)$/);
          const phone = match ? match[1] : '';
          const clean = phone.replace(/\D/g, '');
          const body = await readBody(req);

          const users = readUsers();
          let targetUser: any = null;
          users.forEach((u) => {
            const up = (u.phoneNumber || u.phone || '').replace(/\D/g, '');
            if (up === clean || (clean && up.endsWith(clean)) || (clean && clean.endsWith(up))) {
              if (body.verificationBadge !== undefined) u.verificationBadge = body.verificationBadge;
              if (body.role !== undefined) u.role = body.role;
              if (body.status !== undefined) u.status = body.status;
              if (body.walletBalanceNgn !== undefined) u.walletBalanceNgn = body.walletBalanceNgn;
              targetUser = u;
            }
          });
          writeUsers(users);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, user: targetUser }));
        }

        // 10. Admin Kick Session: POST
        if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/kick$/) && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        // 11. Admin Broadcast: POST
        if (url.pathname === '/api/admin/broadcast' && req.method === 'POST') {
          const body = await readBody(req);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, broadcast: body }));
        }

        // 12. Dispatch Orders
        if (url.pathname === '/api/dispatch/orders' && req.method === 'GET') {
          const orders = readDispatch();
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(orders));
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), agcApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
