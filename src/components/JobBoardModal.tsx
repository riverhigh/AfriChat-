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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JobPosting } from '../types';

export const JobBoardModal: React.FC = () => {
  const {
    isJobBoardModalOpen,
    setIsJobBoardModalOpen,
    jobPostings,
    postNewJob,
    wallet,
    formatPrice,
    setActiveTab,
    setActiveChatId,
    chats,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showPostModal, setShowPostModal] = useState(false);
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

  const filteredJobs = jobPostings.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedType === 'All') return true;
    return job.type === selectedType;
  });

  const handleApply = (job: JobPosting) => {
    // Look for chat with employer or create one
    let targetChat = chats.find((c) => c.phone === job.contactPhone || c.name.includes(job.company));
    if (!targetChat && chats.length > 0) {
      targetChat = chats[0];
    }

    setAppliedJobToast(`Application sent for "${job.title}"! Employer chat opened.`);
    setTimeout(() => {
      setAppliedJobToast(null);
      setIsJobBoardModalOpen(false);
      setActiveTab('chats');
      if (targetChat) setActiveChatId(targetChat.id);
    }, 1500);
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

  return (
    <div
      onClick={() => setIsJobBoardModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                African Job & Hustle Board
              </h3>
              <p className="text-[10px] text-slate-400">
                Verified retail, logistics, tech & creative opportunities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsJobBoardModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Application Toast */}
        {appliedJobToast && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{appliedJobToast}</span>
          </div>
        )}

        {/* Search & Employer Post Banner */}
        <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 p-3 rounded-2xl border border-blue-500/20">
            <div>
              <span className="text-xs font-bold text-white block">
                Hiring Staff or Dispatch Riders?
              </span>
              <span className="text-[10px] text-blue-200">
                Employers pay ₦15,000 per featured job listing.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post a Job</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, companies or cities..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {['All', 'Full-time', 'Remote', 'Contract', 'Part-time'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors shrink-0 ${
                  selectedType === t
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Post a Job Modal Form */}
        {showPostModal && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#1a172e] rounded-2xl p-4 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Post Featured Job Listing
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                Fee: <strong>₦15,000</strong> auto-deducted from your AfriChat Wallet balance upon publishing.
              </div>

              <form onSubmit={handleCreateJob} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Balogun Dispatch Motorbike Rider"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                      Company / Store
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mama Chidinma Fabrics"
                      value={postCompany}
                      onChange={(e) => setPostCompany(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Job Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe role responsibilities..."
                    value={postDesc}
                    onChange={(e) => setPostDesc(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Requirements (one per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Valid Riders Card&#10;Knowledge of Lagos routes"
                    value={postRequirements}
                    onChange={(e) => setPostRequirements(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Pay ₦15,000 & Publish Featured Job
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Job Listings Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2.5 hover:border-blue-500/50 transition-colors shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                    {job.title}
                  </h4>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                    <span>{job.company}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                  {job.type}
                </span>
              </div>

              <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {job.salaryRange}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {job.description}
              </p>

              {job.requirements && job.requirements.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-500 text-[10px] uppercase">Requirements:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                    {job.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  Posted {job.postedAt}
                </span>

                <button
                  type="button"
                  onClick={() => handleApply(job)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
                >
                  <Send className="w-3 h-3" />
                  <span>Apply via AfriChat</span>
                </button>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No jobs found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
