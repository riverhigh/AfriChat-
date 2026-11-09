import React, { useState } from 'react';
import {
  Plus,
  Eye,
  Heart,
  Clock,
  Camera,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserStatus } from '../types';

export const StatusView: React.FC = () => {
  const { statuses, setActiveViewingStatus, addStatus, t } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>(
    '/src/assets/images/african_streetwear_sneakers_1794210826845.jpg'
  );

  const myStatus = statuses.find((s) => s.isMe);
  const otherStatuses = statuses.filter((s) => !s.isMe);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;
    addStatus(newCaption, selectedImage);
    setNewCaption('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col pb-24 bg-white dark:bg-[#11101e] min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Updates
        </h2>
      </div>

      {/* My Status Section */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <div
          onClick={() => {
            if (myStatus) {
              setActiveViewingStatus(myStatus);
            } else {
              setShowAddModal(true);
            }
          }}
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-full p-0.5 border-2 border-indigo-600 dark:border-indigo-400">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt="My status"
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddModal(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white dark:border-[#11101e] shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {t('myStatus')}
              </h3>
              {myStatus ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <Eye className="w-3.5 h-3.5" /> {myStatus.viewsCount} views
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    <Heart className="w-3.5 h-3.5 fill-rose-500" /> {myStatus.likesCount} likes
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('tapToAddStatus')}
                </p>
              )}
            </div>
          </div>

          {myStatus && (
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3" />
              <span>{myStatus.expiresInHours}h left</span>
            </span>
          )}
        </div>
      </div>

      {/* 24-Hour Expiry Explainer Strip */}
      <div className="px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 text-xs flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40">
        <span className="font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Status updates automatically disappear after 24 hours.</span>
        </span>
      </div>

      {/* Recent Updates from African Contacts / Vendors */}
      <div className="p-3 space-y-1">
        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t('recentUpdates')}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {otherStatuses.map((status: UserStatus) => (
            <div
              key={status.id}
              onClick={() => setActiveViewingStatus(status)}
              className="flex items-center justify-between px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Status Avatar Ring */}
                <div className="w-13 h-13 rounded-full p-0.5 border-2 border-indigo-600 dark:border-indigo-400 shrink-0">
                  <img
                    src={status.userAvatar}
                    alt={status.userName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {status.userName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{status.createdAt}</span>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                      Expires in {status.expiresInHours}h
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5 italic">
                    &ldquo;{status.caption}&rdquo;
                  </p>
                </div>
              </div>

              {/* Likes count */}
              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono shrink-0 pl-2">
                <Heart
                  className={`w-4 h-4 ${
                    status.hasLikedByMe ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                  }`}
                />
                <span>{status.likesCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Buttons: Add Status / Text Status */}
      <div className="fixed bottom-20 right-5 flex flex-col gap-2.5 z-20">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-md hover:bg-slate-300 transition-transform active:scale-95"
          aria-label="Add text status"
          title="Add Text Story"
        >
          <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
          aria-label="Add photo status"
          title="Add Photo Story"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Add Status Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a172e] rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                New 24-Hour Status Update
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handlePost} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Choose Photo Attachment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Ankara Textiles', url: '/src/assets/images/african_textiles_wax_1794210824926.jpg' },
                    { label: 'Urban Sneakers', url: '/src/assets/images/african_streetwear_sneakers_1794210826845.jpg' },
                    { label: 'Raw Shea Butter', url: '/src/assets/images/african_shea_butter_skincare_1794210826948.jpg' },
                    { label: 'Alaba Gadgets', url: '/src/assets/images/lagos_tech_smartphones_1794210826603.jpg' },
                  ].map((img) => (
                    <div
                      key={img.url}
                      onClick={() => setSelectedImage(img.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer h-20 border-2 transition-all ${
                        selectedImage === img.url
                          ? 'border-indigo-600 scale-[1.02]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {selectedImage === img.url && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Caption or Status Yarn
                </label>
                <textarea
                  rows={2}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="What's happening in your market or campus today?"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Will automatically expire in 24 hours.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Post Status Update
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
