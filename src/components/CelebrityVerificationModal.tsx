import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Star,
  CheckCircle2,
  Award,
  Upload,
  Crown,
  Instagram,
  Twitter,
  Music,
  Video,
  ExternalLink,
  BadgeCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CelebrityVerificationApplication } from '../types';

export const CelebrityVerificationModal: React.FC = () => {
  const {
    isCelebrityModalOpen,
    setIsCelebrityModalOpen,
    currentUser,
    applyForCelebrityVerification,
    toggleCelebrityStatus,
  } = useApp();

  const [stageName, setStageName] = useState(currentUser.celebrityStageName || currentUser.fullName || '');
  const [category, setCategory] = useState<CelebrityVerificationApplication['category']>(
    (currentUser.celebrityCategory as any) || 'Musician'
  );
  const [socialHandle, setSocialHandle] = useState('@');
  const [proofNote, setProofNote] = useState('Official Instagram / Twitter link or management agency rep');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isCelebrityModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      alert('Please enter your celebrity stage or public name.');
      return;
    }
    if (!socialHandle.trim() || socialHandle === '@') {
      alert('Please enter your official public social handle.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const res = applyForCelebrityVerification({
        stageName: stageName.trim(),
        category,
        socialHandle: socialHandle.trim(),
        proofDocumentUrl: proofNote.trim(),
      });
      setSuccessToast(res.message);
      setTimeout(() => {
        setSuccessToast(null);
        setIsCelebrityModalOpen(false);
      }, 2500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#120f24] text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-purple-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-purple-900/40 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-purple-600 text-black flex items-center justify-center shadow-lg">
              <Star className="w-5 h-5 fill-amber-300 text-amber-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold font-display leading-tight">
                  Celebrity Identity Verification
                </h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-bold px-1.5 py-0.2 rounded-full">
                  VIP Check
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                Official verified badge for African artists, actors, creators & public icons
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCelebrityModalOpen(false)}
            className="p-1.5 text-purple-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {successToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Verification Badge Status Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-purple-600/10 to-indigo-950/40 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={currentUser.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                  />
                  {currentUser.isCelebrityVerified && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-md border-2 border-white dark:border-black">
                      <Star className="w-3 h-3 fill-white text-amber-900" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {currentUser.celebrityStageName || currentUser.fullName}
                    </span>
                    {currentUser.isCelebrityVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-xs">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Celebrity Verified</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        Not Yet Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {currentUser.celebrityCategory || 'Apply below to unlock celebrity checkmark across AGC'}
                  </p>
                </div>
              </div>

              {currentUser.isCelebrityVerified && (
                <button
                  type="button"
                  onClick={toggleCelebrityStatus}
                  className="px-2.5 py-1 text-[11px] rounded-xl border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Toggle
                </button>
              )}
            </div>

            {/* Privileges List */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-500/20 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Golden Star Checkmark</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>VIP 1-on-1 Calls / Minute</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Upload & Sell Any File</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Anti-Impersonation Guard</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Celebrity / Public Stage Name
              </label>
              <input
                type="text"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="e.g. Burna Boy, Asake, Tiwa Savage, Broda Shaggi"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="Musician">Musician & Singer (Afrobeats / Highlife / Amapiano)</option>
                <option value="Actor / Film">Actor / Actress / Filmmaker (Nollywood)</option>
                <option value="Comedian">Comedian / Skit Creator</option>
                <option value="Athlete">Athlete / Football Star</option>
                <option value="Creator & Influencer">Top Digital Creator & Influencer</option>
                <option value="Public Figure">Public Figure / Industry Icon</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Verified Social Media Handle
              </label>
              <input
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder="@yourhandle (Instagram, Twitter / X, TikTok)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Identity Proof / Management Agency Contact
              </label>
              <textarea
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                rows={2}
                placeholder="Paste management email, agency website, or passport verification link"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-amber-300 text-amber-900" />
              <span>{isSubmitting ? 'Verifying Identity...' : 'Submit & Activate Celebrity Verified Badge'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
