import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Mic, Plus, UserPlus, X, CalendarClock, Radio } from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  fetchLiveAudioSpaces,
  fetchScheduledAudioSpaces,
  createAudioSpaceInDb,
  updateAudioSpaceInDb,
  mapAudioSpaceRow,
  getActiveSpacesTable,
} from '../services/supabase';
import { useApp } from '../context/AppContext';
import { AudioSpace } from '../types';

interface SpacesDashboardProps {
  onBack?: () => void;
  embedded?: boolean;
  isModal?: boolean;
}

const SPACE_CATEGORIES: AudioSpace['category'][] = [
  'Tech & Hustle',
  'Afrobeats & Music',
  'Football Banter',
  'Market Townhall',
];

export const SpacesDashboard: React.FC<SpacesDashboardProps> = ({
  onBack,
  embedded = false,
  isModal = false,
}) => {
  const {
    audioSpaces,
    joinAudioSpace,
    createAudioSpace,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'events' | 'spaces'>('spaces');
  const [liveRooms, setLiveRooms] = useState<AudioSpace[]>(() =>
    audioSpaces.filter((s) => s.isLive)
  );
  const [scheduledRooms, setScheduledRooms] = useState<AudioSpace[]>([]);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  // Create / Schedule Space Sheet
  const [showStartModal, setShowStartModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<AudioSpace['category']>('Tech & Hustle');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioSpacesRef = React.useRef(audioSpaces);
  React.useEffect(() => {
    audioSpacesRef.current = audioSpaces;
  }, [audioSpaces]);

  const loadSpacesFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLiveRooms(audioSpacesRef.current.filter((s) => s.isLive));
      setLoading(false);
      return;
    }

    try {
      const [liveRes, scheduledRes] = await Promise.all([
        fetchLiveAudioSpaces(60),
        fetchScheduledAudioSpaces(30),
      ]);

      if (!liveRes.error && Array.isArray(liveRes.data)) {
        const mappedLive = liveRes.data.map(mapAudioSpaceRow);
        const dbIds = new Set(mappedLive.map((r) => r.id));
        const dbTitles = new Set(mappedLive.map((r) => r.title.toLowerCase()));
        // Preserve only unsaved local-only rooms (space_*) that aren't in DB yet
        const extraLocal = audioSpacesRef.current.filter(
          (s) => s.isLive && s.id.startsWith('space_') && !dbIds.has(s.id) && !dbTitles.has(s.title.toLowerCase())
        );
        setLiveRooms([...mappedLive, ...extraLocal]);
      }

      if (!scheduledRes.error && Array.isArray(scheduledRes.data)) {
        setScheduledRooms(scheduledRes.data.map(mapAudioSpaceRow));
      }
    } catch (_) {
      // Retain current live rooms on transient network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real rooms from Supabase on mount & listen for live postgres_changes
  useEffect(() => {
    loadSpacesFromSupabase();

    if (!isSupabaseConfigured) return;

    const tableName = getActiveSpacesTable();
    const channel = supabase
      .channel(`public:${tableName}:dashboard`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          loadSpacesFromSupabase();
        }
      )
      .on('broadcast', { event: 'space_started' }, () => {
        loadSpacesFromSupabase();
      })
      .on('broadcast', { event: 'space_ended' }, () => {
        loadSpacesFromSupabase();
      })
      .subscribe();

    return () => {
      Promise.resolve(supabase.removeChannel(channel)).catch(() => {});
    };
  }, [loadSpacesFromSupabase]);

  // Keep in sync immediately when AppContext audioSpaces adds or ends a room locally
  useEffect(() => {
    const contextLive = audioSpaces.filter((s) => s.isLive);
    setLiveRooms(contextLive);
  }, [audioSpaces]);

  const handleCreateOrScheduleSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isScheduled) {
        const targetIso = scheduledTime
          ? new Date(scheduledTime).toISOString()
          : new Date(Date.now() + 3600_000).toISOString();

        const res = await createAudioSpaceInDb({
          title: newTitle.trim(),
          topic: newTopic.trim() || 'Upcoming scheduled space',
          category: newCategory,
          host_id: currentUser?.id,
          host_name: currentUser?.fullName || 'Host',
          host_avatar: currentUser?.avatarUrl,
          is_live: false,
          is_low_bandwidth_mode: true,
          listeners_count: 0,
          started_at: targetIso,
        });

        if (res?.data) {
          setScheduledRooms((prev) => [mapAudioSpaceRow(res.data), ...prev]);
        } else {
          const fallbackScheduled: AudioSpace = {
            id: `sched_${Date.now()}`,
            title: newTitle.trim(),
            topic: newTopic.trim() || 'Upcoming scheduled space',
            category: newCategory,
            hostName: currentUser?.fullName || 'Host',
            hostAvatar: currentUser?.avatarUrl || '',
            listenersCount: 0,
            isLive: false,
            isLowBandwidthMode: true,
            startedAt: new Date(targetIso).getTime(),
            speakers: [],
          };
          setScheduledRooms((prev) => [fallbackScheduled, ...prev]);
        }
        setShowStartModal(false);
        setNewTitle('');
        setNewTopic('');
        setIsScheduled(false);
        setScheduledTime('');
      } else {
        createAudioSpace(newTitle.trim(), newTopic.trim(), newCategory, true);
        setShowStartModal(false);
        setNewTitle('');
        setNewTopic('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStartHere = () => {
    const firstName = (currentUser?.fullName || 'AGC').split(' ')[0];
    createAudioSpace(`${firstName}'s Room`, 'Open live voice room', 'Tech & Hustle', true);
  };

  const handleGoLiveFromScheduled = async (room: AudioSpace) => {
    await updateAudioSpaceInDb(room.id, {
      is_live: true,
      started_at: new Date().toISOString(),
      listeners_count: Math.max(1, room.listenersCount || 0),
    });
    setScheduledRooms((prev) => prev.filter((r) => r.id !== room.id));
    joinAudioSpace({ ...room, isLive: true, startedAt: Date.now() });
  };

  const body = (
    <div
      className={`${
        embedded ? 'rounded-3xl' : 'min-h-screen'
      } bg-zinc-950 text-white p-4 max-w-md mx-auto font-sans pb-20 w-full`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-400 hover:text-white flex items-center gap-1 text-lg font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Live</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsScheduled(false);
            setShowStartModal(true);
          }}
          className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 text-violet-400 hover:bg-zinc-800 transition"
          title="Host a Space"
          aria-label="Host a Space"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`pb-3 flex-1 text-center text-sm font-semibold transition ${
            activeTab === 'events'
              ? 'text-white border-b-2 border-violet-500'
              : 'text-zinc-500'
          }`}
        >
          Events{' '}
          <span className="text-xs font-normal text-zinc-500 ml-1">
            {scheduledRooms.length} live
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('spaces')}
          className={`pb-3 flex-1 text-center text-sm font-semibold transition ${
            activeTab === 'spaces'
              ? 'text-white border-b-2 border-violet-500'
              : 'text-zinc-500'
          }`}
        >
          Spaces{' '}
          <span className="text-xs font-normal text-violet-400 ml-1">
            ● {liveRooms.length} live
          </span>
        </button>
      </div>

      {/* Start a Space CTA Button */}
      <button
        type="button"
        onClick={() => {
          setIsScheduled(false);
          setShowStartModal(true);
        }}
        className="w-full bg-[#7856ff] hover:bg-[#6a45ff] text-white font-bold py-3.5 px-6 rounded-full shadow-lg shadow-[#7856ff]/25 flex items-center justify-center gap-2 mb-8 transition active:scale-[0.99]"
      >
        <Plus className="w-5 h-5" />
        <span>Start a Space</span>
      </button>

      {activeTab === 'spaces' ? (
        <>
          {/* Live Now Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white tracking-wide">Live now</h2>
              <span className="text-xs text-zinc-400 font-medium">
                {liveRooms.length} {liveRooms.length === 1 ? 'room' : 'rooms'}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                Loading live spaces...
              </div>
            ) : liveRooms.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                No active spaces right now. Be the first to start one!
              </div>
            ) : (
              <div className="space-y-3">
                {liveRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => joinAudioSpace(room)}
                    className="bg-gradient-to-br from-[#23144d] via-[#150d2b] to-[#0b0914] border border-violet-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-[#7856ff] transition cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#a88bff]">
                          <span className="w-2 h-2 rounded-full bg-[#7856ff] animate-pulse shrink-0" />
                          <span>LIVE</span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-zinc-300 font-medium normal-case tracking-normal">
                            {room.listenersCount || 1} listening
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full">
                          {room.category}
                        </span>
                      </div>
                      <h3 className="text-white font-extrabold text-base mb-3 line-clamp-2 leading-snug">
                        {room.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-2 overflow-hidden shrink-0">
                          {(room.speakers && room.speakers.length > 0
                            ? room.speakers.slice(0, 3)
                            : [{ id: 'h', name: room.hostName, avatar: room.hostAvatar }]
                          ).map((sp, i) =>
                            sp.avatar ? (
                              <img
                                key={sp.id || i}
                                src={sp.avatar}
                                alt={sp.name}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-[#150d2b] object-cover"
                              />
                            ) : (
                              <div
                                key={sp.id || i}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-[#150d2b] bg-zinc-700 flex items-center justify-center text-[10px] font-bold"
                              >
                                {(sp.name || 'H').charAt(0).toUpperCase()}
                              </div>
                            )
                          )}
                        </div>
                        <span className="text-xs text-zinc-300 font-medium truncate">
                          {room.hostName}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#a88bff] shrink-0">
                        Listen →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Here Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Here</h2>
              <span className="text-xs text-zinc-500">Voice where you are</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-violet-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">This home</h4>
                  <p className="text-xs text-zinc-500">
                    {liveRooms.length > 0 ? `${liveRooms.length} live nearby` : 'Nobody yet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickStartHere}
                className="bg-violet-600/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-violet-600 hover:text-white transition"
              >
                Start +
              </button>
            </div>
          </div>

          {/* Scheduled Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Scheduled</h2>
              <button
                type="button"
                onClick={() => {
                  setIsScheduled(true);
                  setShowStartModal(true);
                }}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
              >
                + Schedule
              </button>
            </div>
            {scheduledRooms.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                No upcoming scheduled spaces right now.
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduledRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-violet-400 font-medium">
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {room.startedAt
                            ? new Date(room.startedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Upcoming'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5">
                        {room.title}
                      </h4>
                      <p className="text-xs text-zinc-500 truncate">
                        Hosted by {room.hostName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGoLiveFromScheduled(room)}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0 transition"
                    >
                      Go Live
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Events Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Upcoming Events</h2>
            <button
              type="button"
              onClick={() => {
                setIsScheduled(true);
                setShowStartModal(true);
              }}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
            >
              + Schedule Event
            </button>
          </div>
          {scheduledRooms.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
              No scheduled audio events yet. Schedule a Space to notify the community!
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledRooms.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                      {ev.category}
                    </span>
                    <h4 className="text-sm font-bold text-white truncate mt-0.5">{ev.title}</h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {ev.hostName} ·{' '}
                      {ev.startedAt
                        ? new Date(ev.startedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Soon'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGoLiveFromScheduled(ev)}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0 transition"
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start / Schedule Space Modal */}
      {showStartModal && (
        <div
          onClick={() => setShowStartModal(false)}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <form
            onSubmit={handleCreateOrScheduleSpace}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">
                  {isScheduled ? 'Schedule a Space' : 'Start a Live Space'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Space Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lagos Afrobeats & Tech Talk"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="What are we discussing?"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as AudioSpace['category'])}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                >
                  {SPACE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <span className="text-xs font-medium text-zinc-300">Schedule for later</span>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="accent-violet-600"
                />
              </label>

              {isScheduled && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Start Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs transition"
            >
              {isSubmitting
                ? 'Saving...'
                : isScheduled
                ? 'Schedule Space'
                : 'Go Live Now'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950 overflow-y-auto animate-in fade-in">
        {body}
      </div>
    );
  }

  return body;
};

export default SpacesDashboard;
