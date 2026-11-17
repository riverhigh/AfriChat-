import React, { useState, useMemo } from 'react';
import {
  X,
  Flame,
  TrendingUp,
  ShoppingBag,
  Radio,
  Users,
  Sparkles,
  Megaphone,
  ArrowUpRight,
  Crown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

import { Product } from '../types';

type BillboardFilter = 'all' | 'market' | 'town' | 'spaces' | 'promos';

interface BillboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillboardModal: React.FC<BillboardModalProps> = ({ isOpen, onClose }) => {
  const {
    myStoreProducts,
    chats,
    townCommunities,
    audioSpaces,
    creators,
    cmsData,
    setActiveTab,
    setActiveChatId,
    openCheckout,
    joinAudioSpace,
    setIsCreatorModalOpen,
  } = useApp();

  const [filter, setFilter] = useState<BillboardFilter>('all');

  const approvedPromos = useMemo(() => {
    const raw = cmsData?.sponsoredStatuses || [];
    return raw.filter(
      (ad) => ad.active !== false && (ad.approvalStatus === 'approved' || ad.status === 'approved')
    );
  }, [cmsData]);

  const trendingProducts = useMemo(() => {
    const map = new Map<string, Product>();
    (myStoreProducts || []).forEach((p) => {
      if (p?.id) map.set(p.id, p);
    });
    (chats || []).forEach((c) => {
      (c.catalog || []).forEach((p) => {
        if (p?.id && !map.has(p.id)) map.set(p.id, p);
      });
    });
    return Array.from(map.values()).slice(0, 8);
  }, [myStoreProducts, chats]);

  const trendingTown = useMemo(() => {
    return [...(townCommunities || [])]
      .filter((c) => !(c.isPrivate || c.type === 'group') || c.isJoined)
      .sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0))
      .slice(0, 6);
  }, [townCommunities]);

  const liveSpaces = useMemo(() => {
    return [...(audioSpaces || [])]
      .sort((a, b) => (b.listenersCount || 0) - (a.listenersCount || 0))
      .slice(0, 5);
  }, [audioSpaces]);

  const topCreators = useMemo(() => {
    return (creators || []).slice(0, 4);
  }, [creators]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Top Banner */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                AGC Billboard
              </h3>
              <p className="text-[11px] text-purple-100">
                Discovery &amp; Trends across Marketplace, Town, Radio &amp; Promos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Close Billboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-slate-50/70 dark:bg-neutral-900/60">
          {(
            [
              { id: 'all', label: 'All Trends' },
              { id: 'market', label: 'Hot Market' },
              { id: 'town', label: 'Town Trending' },
              { id: 'spaces', label: 'Live Radio' },
              { id: 'promos', label: 'Featured Promos' },
            ] as { id: BillboardFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800 hover:border-purple-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Discovery Feed */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Featured Promos */}
          {(filter === 'all' || filter === 'promos') && approvedPromos.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  Featured Promos
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {approvedPromos.map((ad) => (
                  <div
                    key={ad.id}
                    className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden flex items-center gap-3 p-2.5"
                  >
                    {ad.mediaUrl && (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.brandName}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {ad.brandName}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-neutral-300 line-clamp-2">
                        {ad.caption}
                      </p>
                      {ad.targetUrl && (
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1 hover:underline"
                        >
                          {ad.ctaLabel || 'Explore'}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Live Street Radio / Audio Spaces */}
          {(filter === 'all' || filter === 'spaces') && liveSpaces.length > 0 && (
            <section className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Live Street Radio &amp; Spaces
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {liveSpaces.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      joinAudioSpace(sp);
                      onClose();
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 hover:border-purple-500 text-left flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {sp.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                        Host: {sp.hostName} · {sp.listenersCount || 0} listening
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-[10px] font-bold shrink-0">
                      Tune In
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Hot Marketplace Items */}
          {(filter === 'all' || filter === 'market') && trendingProducts.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Trending in Marketplace
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('market');
                    onClose();
                  }}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Open Market
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {trendingProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      openCheckout(prod);
                      onClose();
                    }}
                    className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden text-left hover:border-purple-500 transition-colors flex flex-col"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">
                        {prod.title}
                      </div>
                      <div className="text-[11px] font-mono font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                        ₦{(prod.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trending Town Communities */}
          {(filter === 'all' || filter === 'town') && trendingTown.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Trending Town Squares
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('town');
                    onClose();
                  }}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Visit Town
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trendingTown.map((comm) => (
                  <button
                    key={comm.id}
                    type="button"
                    onClick={() => {
                      const matchedChat = chats.find(
                        (c) => c.id === comm.id || c.id === `town_comm_${comm.id}`
                      );
                      if (matchedChat) {
                        setActiveChatId(matchedChat.id);
                        setActiveTab('chats');
                      } else {
                        setActiveTab('town');
                      }
                      onClose();
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 hover:border-emerald-500 flex items-center gap-3 text-left transition-colors"
                  >
                    <img
                      src={comm.avatar}
                      alt={comm.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {comm.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3 h-3" />
                        <span>{(comm.membersCount || 0).toLocaleString()} members</span>
                        <span>·</span>
                        <span>{comm.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Active Creators Spotlight */}
          {filter === 'all' && topCreators.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Rising Creators
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsCreatorModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Creator Hub
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {topCreators.map((cr) => (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsCreatorModalOpen(true);
                    }}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 hover:border-fuchsia-500 text-center flex flex-col items-center gap-1.5 transition-colors"
                  >
                    <img
                      src={cr.avatar}
                      alt={cr.name}
                      className="w-10 h-10 rounded-full object-cover border border-fuchsia-400"
                    />
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate w-full">
                      {cr.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 truncate w-full">
                      {cr.category}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
