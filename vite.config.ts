import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function agcApiPlugin(): Plugin {
  const usersFile = path.resolve(import.meta.dirname || '.', 'data_users.json');

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

  return {
    name: 'agc-api-plugin',
    apply: 'serve' as const,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/users')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

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
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const user = JSON.parse(body);
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
            } catch (_) {}
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true }));
          });
          return;
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
