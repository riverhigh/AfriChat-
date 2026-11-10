import React, { useState } from 'react';
import {
  X,
  Heart,
  Eye,
  Send,
  Clock,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatusViewerModal: React.FC = () => {
  const {
    activeViewingStatus,
    setActiveViewingStatus,
    likeStatus,
    sendMessage,
    setActiveChatId,
  } = useApp();

  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [replyText, setReplyText] = useState('');

  if (!activeViewingStatus) return null;

  const status = activeViewingStatus;
  const isMe = status.isMe;

  const handleLike = () => {
    likeStatus(status.id);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (status.userId) {
      sendMessage(
        status.userId,
        `Replied to status: "${status.caption}": ${replyText}`
      );
      setActiveChatId(status.userId);
      setActiveViewingStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-in fade-in duration-150">
      {/* Top Segmented Story Progress Bar */}
      <div className="p-3 pb-0 z-20 space-y-2">
        <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
          <div className="bg-white h-full w-full animate-in slide-in-from-left duration-500" />
        </div>

        {/* User Info Bar */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={status.userAvatar}
              alt={status.userName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-white/30"
            />
            <div>
              <div className="font-semibold text-sm leading-tight">
                {status.userName}
              </div>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5 font-mono">
                <span>{status.createdAt}</span>
                <span>·</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Expires in {status.expiresInHours}h</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveViewingStatus(null)}
            className="p-1.5 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Status Media & Caption Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {status.statusType === 'thought' ? (
          <div className="w-full max-w-sm flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
            {/* Thought Cloud Bubble */}
            <div
              className={`w-full p-8 rounded-3xl bg-gradient-to-br ${
                status.thoughtBg || 'from-indigo-600 via-purple-600 to-pink-600'
              } text-white shadow-2xl relative border-2 border-white/20`}
            >
              <div className="text-[10px] uppercase font-bold tracking-widest text-white/70 mb-2 font-mono flex items-center gap-1.5">
                <span>💭 AGC THOUGHT</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold leading-relaxed font-display text-center drop-shadow-sm">
                &ldquo;{status.caption}&rdquo;
              </p>
              <div className="mt-4 pt-3 border-t border-white/20 text-center text-xs text-white/80 font-mono">
                Shared by {status.userName} · {status.createdAt}
              </div>
            </div>

            {/* Bubble Tail Dots */}
            <div className="flex flex-col items-center gap-1.5 mt-2 self-start ml-16">
              <div className="w-4 h-4 rounded-full bg-indigo-500/80 shadow-md" />
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500/70 shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500/60" />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center justify-center">
            {status.videoUrl || status.statusType === 'video' ? (
              <div className="relative w-full max-h-[65vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black shadow-2xl">
                <video
                  src={status.videoUrl || status.mediaUrl}
                  poster={status.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  loop
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              </div>
            ) : (
              status.mediaUrl && (
                <img
                  src={status.mediaUrl}
                  alt={status.caption}
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              )
            )}
            <div className="mt-4 px-4 py-3 bg-black/60 backdrop-blur-md text-white rounded-2xl max-w-sm text-center text-sm leading-relaxed border border-white/10">
              {status.caption}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: If Me, show views/likes sheet trigger; if Other, show Like + Reply */}
      <div className="p-4 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
        {isMe ? (
          /* Viewers & Likes Drawer Trigger for My Status */
          <div className="space-y-2">
            <button
              onClick={() => setShowViewersSheet(true)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-3 transition-colors"
            >
              <span className="flex items-center gap-1 text-indigo-300">
                <Eye className="w-4 h-4" /> {status.viewsCount} Views
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-rose-400">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> {status.likesCount} Likes
              </span>
              <ChevronUp className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : (
          /* Reply & Like controls for other statuses */
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendReply} className="flex-1 flex items-center bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${status.userName}...`}
                className="w-full bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
              />
              <button type="submit" className="text-white hover:text-indigo-400 ml-2">
                <Send className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={handleLike}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-125 ${
                status.hasLikedByMe
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/50'
                  : 'bg-white/15 backdrop-blur-md text-white hover:bg-white/25 border border-white/20'
              }`}
              title="Like this 24h status"
            >
              <Heart
                className={`w-5 h-5 ${
                  status.hasLikedByMe ? 'fill-white' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Viewers & Likes Bottom Sheet (for My Status) */}
      {showViewersSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#1a172e] rounded-t-3xl p-5 shadow-2xl max-h-[60vh] flex flex-col border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Status Activity
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                    {status.viewsCount} Views
                  </span>
                  <span>·</span>
                  <span className="text-rose-500 font-semibold font-mono">
                    {status.likesCount} Likes
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowViewersSheet(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-2">
              {status.viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={viewer.avatar}
                      alt={viewer.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {viewer.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Viewed {viewer.timeViewed}
                      </div>
                    </div>
                  </div>

                  {viewer.hasLiked && (
                    <span className="flex items-center gap-1 text-[11px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                      <Heart className="w-3 h-3 fill-rose-500" />
                      <span>Liked</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
