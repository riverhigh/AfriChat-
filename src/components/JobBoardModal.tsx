import React, { useState } from 'react';
import {
  X,
  Briefcase,
  Search,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle2,
  Send,
  Plus,
  Building,
  ShieldCheck,
  Phone,
  Share2,
  Bookmark,
  Sparkles,
  Flame,
  Truck,
  ShoppingBag,
  Laptop,
  Wrench,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JobPosting } from '../types';

export const JobBoardModal: React.FC = () => {
  const {
    isJobBoardModalOpen,
    setIsJobBoardModalOpen,
    jobPostings,
    postNewJob,
    applyForJob,
    wallet,
    formatPrice,
    setActiveTab,
    setActiveChatId,
    chats,
    startCall,
  } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'all' | 'applied'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showPostModal, setShowPostModal] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_applied_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postCompany, setPostCompany] = useState('');
  const [postLocation, setPostLocation] = useState('Lagos, Nigeria');
  const [postType, setPostType] = useState<'Full-time' | 'Remote' | 'Contract' | 'Part-time'>('Full-time');
  const [postSalary, setPostSalary] = useState('₦150,000 - ₦250,000 / month');
  const [postDesc, setPostDesc] = useState('');
  const [postRequirements, setPostRequirements] = useState('');
  const [postPhone, setPostPhone] = useState('+2348030001122');
  const [appliedJobToast, setAppliedJobToast] = useState<string | null>(null);

  if (!isJobBoardModalOpen) return null;

  const categories = [
    { id: 'All', label: 'All Jobs', icon: Briefcase },
    { id: 'Logistics', label: 'Riders & Dispatch', icon: Truck },
    { id: 'Retail', label: 'Retail & Markets', icon: ShoppingBag },
    { id: 'Tech', label: 'Tech & Remote', icon: Laptop },
    { id: 'Repairs', label: 'Hardware & Repairs', icon: Wrench },
  ];

  const filteredJobs = jobPostings.filter((job) => {
    // Mode filter
    if (activeTabMode === 'applied' && !appliedJobIds.includes(job.id)) {
      return false;
    }

    // Search query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Type filter
    if (selectedType !== 'All' && job.type !== selectedType) {
      return false;
    }

    // Category filter
    if (selectedCategory === 'Logistics') {
      return /dispatch|rider|driver|delivery|courier/i.test(job.title + job.description);
    }
    if (selectedCategory === 'Retail') {
      return /store|market|sales|host|cashier|boutique|textiles/i.test(job.title + job.description);
    }
    if (selectedCategory === 'Tech') {
      return /developer|software|react|engineer|designer|remote|frontend/i.test(job.title + job.description);
    }
    if (selectedCategory === 'Repairs') {
      return /technician|hardware|phone|mechanic|repair|screen/i.test(job.title + job.description);
    }

    return true;
  });

  const handleApply = (job: JobPosting) => {
    const res = applyForJob(job);
    if (!res.success) {
      alert(res.message);
      return;
    }

    const updatedApplied = [...appliedJobIds, job.id];
    setAppliedJobIds(updatedApplied);
    try {
      localStorage.setItem('AGC_applied_jobs', JSON.stringify(updatedApplied));
    } catch {}

    // Find or target employer chat
    let targetChat = chats.find(
      (c) => c.phone === job.contactPhone || c.name.toLowerCase().includes(job.company.toLowerCase())
    );
    if (!targetChat && chats.length > 0) {
      targetChat = chats[0];
    }

    setAppliedJobToast(res.message);
    setTimeout(() => {
      setAppliedJobToast(null);
      setIsJobBoardModalOpen(false);
      setActiveTab('chats');
      if (targetChat) setActiveChatId(targetChat.id);
    }, 1600);
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postCompany.trim() || !postDesc.trim()) {
      alert('Please fill out all required fields');
      return;
    }

    const reqs = postRequirements
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const result = postNewJob({
      title: postTitle.trim(),
      company: postCompany.trim(),
      location: postLocation.trim(),
      type: postType,
      salaryRange: postSalary.trim(),
      currency: 'NGN',
      description: postDesc.trim(),
      requirements: reqs.length > 0 ? reqs : ['Honest and reliable', 'Punctual with great attitude'],
      contactPhone: postPhone.trim(),
      employerId: `emp_${Date.now()}`,
      isFeatured: true,
    });

    if (result.success) {
      alert(result.message);
      setShowPostModal(false);
      setPostTitle('');
      setPostCompany('');
      setPostDesc('');
      setPostRequirements('');
    } else {
      alert(result.message);
    }
  };

  const handleShare = (job: JobPosting) => {
    const text = `🔥 Job Opportunity on AfriChat: "${job.title}" at ${job.company} (${job.salaryRange}). Location: ${job.location}. Apply on AGC: https://africhat.app/jobs/${job.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Job link copied! Share with your network or WhatsApp groups.');
    }
  };

  return (
    <div
      onClick={() => setIsJobBoardModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#120a1f] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-500/20 dark:border-purple-900/40"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-purple-900/60 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header - AfriChat Signature Purple Gradient */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-950 to-[#120a1f] border-b border-purple-500/20 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-600/30 text-purple-300 flex items-center justify-center border border-purple-400/30 shadow-inner">
                <Briefcase className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-display">
                    African Hustle & Job Hub
                  </h3>
                  {/* Live pulsing indicator */}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/70">
                  Verified retail, dispatch, tech & skilled African gigs
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsJobBoardModalOpen(false)}
              className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top Mode Tabs: Explore vs My Applications */}
          <div className="flex gap-2 mt-3 p-1 bg-black/25 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTabMode('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTabMode === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              Explore Gigs ({jobPostings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode('applied')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTabMode === 'applied'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              My Applications ({appliedJobIds.length})
            </button>
          </div>
        </div>

        {/* Application Toast */}
        {appliedJobToast && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 z-10">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{appliedJobToast}</span>
          </div>
        )}

        {/* Post a Job Banner & Search */}
        <div className="p-4 space-y-3 border-b border-purple-500/10 dark:border-purple-900/30 shrink-0 bg-slate-50/50 dark:bg-[#150d24]">
          {/* Employer Hiring Banner */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-purple-950/60 p-3.5 rounded-2xl border border-purple-500/30 shadow-xs">
            <div className="pr-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Hiring Staff or Dispatchers?
              </span>
              <span className="text-[10px] text-purple-200/80 block mt-0.5">
                Employers pay ₦400 to reach 10,000+ verified African pros.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition-transform border border-purple-400/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post a Gig</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-purple-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, Lagos, Remote..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-purple-950/40 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-slate-200 dark:border-purple-900/40"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-purple-950/30 text-slate-600 dark:text-purple-200 border border-slate-200 dark:border-purple-900/40 hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Job Type Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {['All', 'Full-time', 'Remote', 'Contract', 'Part-time'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-0.5 text-[11px] rounded-full font-medium transition-colors shrink-0 ${
                  selectedType === t
                    ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-purple-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Post a Job Modal Form */}
        {showPostModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#160d26] rounded-3xl p-5 shadow-2xl space-y-3.5 border border-purple-500/30 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Post Opportunity on AfriChat
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-[11px] text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  Listing Fee: <strong>₦400</strong> auto-debited from your AGC wallet balance upon publishing.
                </span>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-2.5 text-slate-900 dark:text-white">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Island Express Motorbike Dispatcher"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                      Company / Store
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gokada Hub"
                      value={postCompany}
                      onChange={(e) => setPostCompany(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos Island / Remote"
                      value={postLocation}
                      onChange={(e) => setPostLocation(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                      Job Type
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Remote">Remote</option>
                      <option value="Contract">Contract</option>
                      <option value="Part-time">Part-time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                      Salary Range
                    </label>
                    <input
                      type="text"
                      placeholder="₦150,000 / month"
                      value={postSalary}
                      onChange={(e) => setPostSalary(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs font-mono focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Job Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe daily hustle & responsibilities..."
                    value={postDesc}
                    onChange={(e) => setPostDesc(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Requirements (one per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Valid Lagos State Riders Card&#10;Familiar with Lekki shortcuts"
                    value={postRequirements}
                    onChange={(e) => setPostRequirements(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Direct WhatsApp / Phone Contact
                  </label>
                  <input
                    type="text"
                    value={postPhone}
                    onChange={(e) => setPostPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/50 rounded-xl text-xs font-mono focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 active:scale-95 transition-transform"
                >
                  Pay ₦400 & Broadcast to Live Feed
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Job Listings Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 dark:bg-[#0e071a]">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.includes(job.id);

            return (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#160d26] border border-slate-200/80 dark:border-purple-900/30 space-y-3 hover:border-purple-500/50 transition-all shadow-xs relative overflow-hidden group"
              >
                {/* Featured / Escrow Ribbon */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                        {job.title}
                      </h4>
                      <div className="text-[11px] text-slate-500 dark:text-purple-200/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-purple-600 dark:text-purple-400">{job.company}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {job.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold shrink-0 border border-purple-300/40 dark:border-purple-800">
                    {job.type}
                  </span>
                </div>

                {/* Salary Tag + Escrow Guarantee Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                    {job.salaryRange}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-900/40">
                    <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>AGC Escrow Guaranteed</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-purple-900/20 text-[11px]">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide">
                      Key Requirements:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                      {job.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer Actions: Posted Time, Share, Call, Apply */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-purple-900/30">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {job.postedAt}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShare(job)}
                      className="p-1.5 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      title="Share job link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Instant Call Button */}
                    <button
                      type="button"
                      onClick={() => startCall(job.company, job.contactPhone, '', 'voice')}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Call Employer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>

                    {/* Apply Button */}
                    {hasApplied ? (
                      <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Applied</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApply(job)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all border border-purple-500/30"
                      >
                        <Send className="w-3 h-3" />
                        <span>Apply (₦50)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Briefcase className="w-8 h-8 mx-auto text-purple-400/40" />
              <p className="font-semibold text-slate-500">
                {activeTabMode === 'applied'
                  ? "You haven't applied for any jobs yet."
                  : 'No jobs found matching your search or filters.'}
              </p>
              {activeTabMode === 'applied' && (
                <button
                  type="button"
                  onClick={() => setActiveTabMode('all')}
                  className="px-3 py-1 text-xs text-purple-600 font-bold hover:underline"
                >
                  Browse open opportunities →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
