import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, justReconnected } = useOnlineStatus();
  const [queuedCount, setQueuedCount] = useState<number>(0);

  useEffect(() => {
    const syncCount = () => {
      try {
        const raw = localStorage.getItem('AGC_offline_outbox');
        const list = raw ? JSON.parse(raw) : [];
        setQueuedCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setQueuedCount(0);
      }
    };
    syncCount();
    window.addEventListener('agc-outbox-changed', syncCount);
    window.addEventListener('storage', syncCount);
    return () => {
      window.removeEventListener('agc-outbox-changed', syncCount);
      window.removeEventListener('storage', syncCount);
    };
  }, [isOnline]);

  if (isOnline && !justReconnected && queuedCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[95] pointer-events-none px-3 w-full max-w-md flex justify-center"
    >
      {!isOnline ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/95 border border-amber-500/40 text-amber-200 text-[11px] font-bold shadow-lg backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Offline mode · Cached chats ready
            {queuedCount > 0 ? ` · ${queuedCount} queued` : ''}
          </span>
        </div>
      ) : justReconnected ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold shadow-lg backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Back online · Syncing live chats</span>
        </div>
      ) : queuedCount > 0 ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/95 border border-purple-500/40 text-purple-200 text-[11px] font-bold shadow-lg backdrop-blur-md">
          <CloudUpload className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          <span>Sending {queuedCount} queued message{queuedCount === 1 ? '' : 's'}…</span>
        </div>
      ) : null}
    </div>
  );
};
