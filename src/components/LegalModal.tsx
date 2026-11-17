import React, { useState, useMemo } from 'react';
import {
  Scale,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
  X,
  Plus,
  Send,
  PenTool,
  Gavel,
  Sparkles,
  BadgeCheck,
  Search,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LawyerProfile, LegalContractTemplate, GeneratedLegalContract } from '../types';

const LEGAL_SPECIALTIES = [
  'Corporate Law',
  'Tech & IP',
  'Real Estate',
  'Litigation',
  'Dispute Resolution',
  'Family & Probate',
  'Tax & Compliance',
];

export const LegalModal: React.FC = () => {
  const {
    isLegalModalOpen,
    setIsLegalModalOpen,
    lawyers,
    contractTemplates,
    generatedContracts,
    generateLegalContract,
    triggerEmergencyLegalSos,
    registerLawyer,
    bookLawyerConsultation,
    formatPrice,
    currentUser,
    chats,
    setActiveChatId,
    sendMessage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'lawyers' | 'contracts' | 'disputes' | 'cac'>('lawyers');
  const [selectedTemplate, setSelectedTemplate] = useState<LegalContractTemplate | null>(null);

  // Contract Generator Questionnaire form state
  const [partyAName, setPartyAName] = useState(currentUser.fullName || 'Citizen User');
  const [partyBName, setPartyBName] = useState('');
  const [contractValue, setContractValue] = useState('₦50,000');
  const [contractDuration, setContractDuration] = useState('14 days from signing');
  const [specificTerms, setSpecificTerms] = useState('');
  const [governingState, setGoverningState] = useState('Lagos State, Nigeria');
  const [legalIntermediaryConsent, setLegalIntermediaryConsent] = useState(true);

  const [sosActiveMessage, setSosActiveMessage] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  // Lawyer Marketplace state
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('All');
  const [aiQuery, setAiQuery] = useState('');
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [bookingLawyerId, setBookingLawyerId] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);

  // Register as Lawyer drawer state
  const [showRegisterLawyer, setShowRegisterLawyer] = useState(false);
  const [regName, setRegName] = useState(currentUser.fullName || '');
  const [regScn, setRegScn] = useState('');
  const [regFirm, setRegFirm] = useState('');
  const [regSpecializations, setRegSpecializations] = useState<string[]>(['Corporate Law']);
  const [regYears, setRegYears] = useState<number>(5);
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Lagos');
  const [regFee, setRegFee] = useState<number>(15000);
  const [regBio, setRegBio] = useState('');
  const [regBusy, setRegBusy] = useState(false);

  const showToast = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToastBanner({ text, tone });
    setTimeout(() => setToastBanner(null), 4500);
  };

  const filteredLawyers = useMemo(() => {
    const base = lawyers.filter((l) => {
      if (specialtyFilter === 'All') return true;
      const specs = [l.specialty, ...(l.specializations || [])].join(' ').toLowerCase();
      return specs.includes(specialtyFilter.toLowerCase());
    });
    if (aiRecommendedIds.length === 0) return base;
    return [...base].sort((a, b) => {
      const aMatch = aiRecommendedIds.includes(a.id) ? 1 : 0;
      const bMatch = aiRecommendedIds.includes(b.id) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [lawyers, specialtyFilter, aiRecommendedIds]);

  if (!isLegalModalOpen) return null;

  const handleLegalSos = () => {
    const res = triggerEmergencyLegalSos();
    setSosActiveMessage(res.message);
    setTimeout(() => setSosActiveMessage(null), 6000);
  };

  const handleAiLawyerMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiMatchLoading(true);
    setAiAdvice(null);
    try {
      const res = await fetch('/api/ai/match-lawyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setAiRecommendedIds(Array.isArray(data.recommendedIds) ? data.recommendedIds : []);
        setAiAdvice(data.advice || 'Matched verified legal counsel based on your issue.');
      } else {
        showToast(data?.error || 'Could not match lawyers right now.', 'err');
      }
    } catch (_) {
      showToast('Network error contacting AI Legal Matcher.', 'err');
    } finally {
      setAiMatchLoading(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setRegSpecializations((prev) =>
      prev.includes(spec) ? (prev.length > 1 ? prev.filter((s) => s !== spec) : prev) : [...prev, spec]
    );
  };

  const handleRegisterLawyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regScn.trim() || !regAddress.trim()) {
      showToast('Full name, Supreme Court Number (SCN), and office address are required.', 'err');
      return;
    }
    setRegBusy(true);
    try {
      const res = await registerLawyer({
        name: regName.trim(),
        supremeCourtNumber: regScn.trim().toUpperCase(),
        firmName: regFirm.trim() || `${regName.trim()} Chambers`,
        specializations: regSpecializations,
        yearsExperience: Number(regYears) || 1,
        officeAddress: regAddress.trim(),
        city: regCity.trim() || 'Lagos',
        consultationFee: Number(regFee) || 10000,
        bio: regBio.trim(),
      });
      showToast(res.message, res.success ? 'ok' : 'err');
      if (res.success) {
        setShowRegisterLawyer(false);
        setRegScn('');
        setRegFirm('');
        setRegAddress('');
        setRegBio('');
      }
    } finally {
      setRegBusy(false);
    }
  };

  const handleBookConsultation = async (lawyer: LawyerProfile) => {
    setBookingBusy(true);
    try {
      const res = await bookLawyerConsultation(lawyer.id, bookingNotes.trim() || `Legal consultation on ${lawyer.specialty}`);
      showToast(res.message, res.success ? 'ok' : 'err');
      if (res.success) {
        setBookingLawyerId(null);
        setBookingNotes('');
      }
    } finally {
      setBookingBusy(false);
    }
  };

  const handleGenerateContract = () => {
    if (!legalIntermediaryConsent) {
      showToast('Please check the intermediary acknowledgment box before generating this contract.', 'err');
      return;
    }
    if (!partyBName.trim() || !selectedTemplate) {
      showToast('Please enter the second party name and select a template.', 'err');
      return;
    }

    const created = generateLegalContract({
      templateTitle: selectedTemplate.title,
      partyAName,
      partyBName,
      amountOrValue: contractValue,
      durationOrDate: contractDuration,
      governingLaw: `Laws of ${governingState}`,
      specificTerms:
        specificTerms ||
        'All deliverables must meet standard merchantability. Escrow release contingent upon mutual written approval in AGC.',
    });

    setSelectedTemplate(null);
    showToast(`Contract "${created.templateTitle}" created & e-signed! Ready to attach to ${partyBName}.`);
  };

  const handleDownloadContractCopy = (cntr: GeneratedLegalContract) => {
    const content = [
      `ALL GOOD CONNECTS (AGC) — SMART LEGAL DEED`,
      `Contract ID: ${cntr.id}`,
      `Agreement: ${cntr.templateTitle}`,
      `First Party (Party A): ${cntr.partyAName}`,
      `Second Party (Party B): ${cntr.partyBName}`,
      `Value / Consideration: ${cntr.amountOrValue}`,
      `Duration: ${cntr.durationOrDate}`,
      `Governing Law: ${cntr.governingLaw}`,
      `Terms:\n${cntr.specificTerms}`,
      `Digital Signature A: ${cntr.signatureA}`,
      `Status: ${cntr.status.toUpperCase()}`,
      `Created At: ${cntr.createdAt}`,
    ].join('\n\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cntr.templateTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${cntr.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Certified electronic copy of "${cntr.templateTitle}" downloaded.`);
  };

  const handleSendContractToChat = (contract: GeneratedLegalContract) => {
    const firstChat = chats[0];
    if (firstChat) {
      sendMessage(
        firstChat.id,
        `📜 [AGC LEGAL CONTRACT ATTACHED]\nAgreement: ${contract.templateTitle}\nParty A: ${contract.partyAName}\nParty B: ${contract.partyBName}\nValue: ${contract.amountOrValue}\nStatus: ${contract.status.toUpperCase()}\nSignature: ${contract.signatureA}`
      );
      setIsLegalModalOpen(false);
      setActiveChatId(firstChat.id);
    } else {
      showToast('Open or start a chat thread first to attach this contract.', 'err');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header with Legal SOS */}
        <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-black border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                  AfriLaw & Verified Counsel
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Book SCN-Verified Lawyers, Smart Contracts & Escrow Arbitration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLegalModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleLegalSos}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-transform active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>⚖️ Emergency Legal SOS (Roadside Harassment / Unlawful Detention)</span>
            </button>
          </div>

          {sosActiveMessage && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{sosActiveMessage}</span>
            </div>
          )}

          {toastBanner && (
            <div
              className={`mt-2 p-2.5 rounded-xl text-white text-xs font-bold animate-in slide-in-from-top-2 ${
                toastBanner.tone === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {toastBanner.text}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('lawyers')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'lawyers'
                ? 'bg-white dark:bg-black text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Lawyers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'contracts'
                ? 'bg-white dark:bg-black text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Contracts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'disputes'
                ? 'bg-white dark:bg-black text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Arbitration</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cac')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'cac'
                ? 'bg-white dark:bg-black text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>CAC & Tax</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: VERIFIED LAWYERS MARKETPLACE + AI MATCH + REGISTRATION */}
          {activeTab === 'lawyers' && (
            <div className="space-y-3">
              {/* Register CTA */}
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 flex items-center justify-between gap-2">
                <div className="text-[11px] text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold block">Licensed Attorney / Solicitor?</span>
                  <span className="opacity-80">Submit your SCN number for verification & escrow bookings.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterLawyer((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showRegisterLawyer ? 'Close Form' : 'Register Lawyer'}</span>
                </button>
              </div>

              {/* Registration Form */}
              {showRegisterLawyer && (
                <form
                  onSubmit={handleRegisterLawyerSubmit}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-indigo-500/30 space-y-2.5 animate-in zoom-in-95"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-indigo-500" />
                      <span>AfriLaw Practitioner Onboarding</span>
                    </h4>
                    <span className="text-[10px] text-amber-500 font-semibold">Admin SCN Check</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Enter lawyer full name"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Supreme Court No. (SCN)</label>
                      <input
                        type="text"
                        required
                        value={regScn}
                        onChange={(e) => setRegScn(e.target.value)}
                        placeholder="SCN/098412"
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Law Firm Name</label>
                      <input
                        type="text"
                        value={regFirm}
                        onChange={(e) => setRegFirm(e.target.value)}
                        placeholder="Okafor & Partners LP"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                      <input
                        type="text"
                        required
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        placeholder="Lagos"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Office Address</label>
                    <input
                      type="text"
                      required
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="18 Adeola Odeku St, Victoria Island"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Experience (Years)</label>
                      <input
                        type="number"
                        min={1}
                        value={regYears}
                        onChange={(e) => setRegYears(Number(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Consult Fee (₦)</label>
                      <input
                        type="number"
                        min={1000}
                        value={regFee}
                        onChange={(e) => setRegFee(Number(e.target.value) || 5000)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Specializations (Select one or more)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {LEGAL_SPECIALTIES.map((spec) => {
                        const active = regSpecializations.includes(spec);
                        return (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialization(spec)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-white dark:bg-black text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                            }`}
                          >
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Practice Bio</label>
                    <textarea
                      rows={2}
                      value={regBio}
                      onChange={(e) => setRegBio(e.target.value)}
                      placeholder="Brief summary of practice focus, corporate filings, litigation wins..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regBusy}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
                  >
                    {regBusy ? 'Submitting Credentials...' : 'Submit for SCN Verification'}
                  </button>
                </form>
              )}

              {/* AI Legal Matcher */}
              <form onSubmit={handleAiLawyerMatch} className="space-y-2">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Describe your legal issue (e.g. landlord dispute, CAC, IP)..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={aiMatchLoading || !aiQuery.trim()}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiMatchLoading ? 'Matching...' : 'AI Match'}</span>
                  </button>
                </div>
                {aiAdvice && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <span>{aiAdvice}</span>
                  </div>
                )}
              </form>

              {/* Specialization Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {['All', ...LEGAL_SPECIALTIES].map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecialtyFilter(spec)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      specialtyFilter === spec
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              {/* Directory List */}
              <div className="space-y-3">
                {filteredLawyers.length === 0 ? (
                  <div className="py-10 px-4 text-center rounded-2xl bg-white dark:bg-neutral-950 border border-dashed border-indigo-200 dark:border-indigo-900/40">
                    <Scale className="w-8 h-8 text-indigo-500/60 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white font-display">No Attorneys Match Filter</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Switch specialty filters or register an NBA / SCN verified practitioner above.
                    </p>
                  </div>
                ) : (
                  filteredLawyers.map((lawyer) => {
                    const isVerified = Boolean(lawyer.verifiedLicense ?? lawyer.isVerified);
                    const isAiMatch = aiRecommendedIds.includes(lawyer.id);
                    const isBookingOpen = bookingLawyerId === lawyer.id;
                    return (
                      <div
                        key={lawyer.id}
                        className={`p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border shadow-2xs transition-all ${
                          isAiMatch
                            ? 'border-purple-500 ring-1 ring-purple-500/30'
                            : 'border-slate-200/80 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={lawyer.avatar}
                            alt={lawyer.name}
                            className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-neutral-800"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {lawyer.name}
                              </h4>
                              {isVerified ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-0.5">
                                  <BadgeCheck className="w-3 h-3" />
                                  <span>SCN Verified</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400">
                                  Pending SCN Review
                                </span>
                              )}
                              {isAiMatch && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-600 text-white">
                                  AI Match
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              {lawyer.specializations?.length ? lawyer.specializations.join(' · ') : lawyer.specialty}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                              {lawyer.firmName || lawyer.firm} · {lawyer.supremeCourtNumber || lawyer.barNumber}
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-neutral-400 flex-wrap">
                              <span>{lawyer.yearsExperience} yrs exp</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {lawyer.city || lawyer.location}
                              </span>
                            </div>

                            {lawyer.bio && (
                              <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-1 line-clamp-2">
                                {lawyer.bio}
                              </p>
                            )}

                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Escrow Consult Fee</span>
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                  {formatPrice(lawyer.consultationFee, lawyer.currency)}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={!isVerified}
                                onClick={() => setBookingLawyerId(isBookingOpen ? null : lawyer.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs"
                              >
                                <Gavel className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Book Consult (Escrow)' : 'Awaiting Verification'}</span>
                              </button>
                            </div>

                            {isBookingOpen && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-indigo-500/30 space-y-2">
                                <textarea
                                  rows={2}
                                  value={bookingNotes}
                                  onChange={(e) => setBookingNotes(e.target.value)}
                                  placeholder="Briefly describe your matter (contract review, tenancy, incorporation)..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={bookingBusy}
                                    onClick={() => handleBookConsultation(lawyer)}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
                                  >
                                    {bookingBusy
                                      ? 'Locking Escrow...'
                                      : `Confirm & Lock ${formatPrice(lawyer.consultationFee, lawyer.currency)}`}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBookingLawyerId(null)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-neutral-800 text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SMART CONTRACT & DOCUMENT GENERATOR */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {selectedTemplate ? (
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedTemplate.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedTemplate.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Governed under: {selectedTemplate.applicableLaw}
                  </p>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                        First Party (You)
                      </label>
                      <input
                        type="text"
                        value={partyAName}
                        onChange={(e) => setPartyAName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                        Second Party (Contractor / Vendor / Tenant)
                      </label>
                      <input
                        type="text"
                        value={partyBName}
                        onChange={(e) => setPartyBName(e.target.value)}
                        placeholder="e.g. Chinedu Obi (Developer) or Landmark Landlord"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                          Contract Value / Rent
                        </label>
                        <input
                          type="text"
                          value={contractValue}
                          onChange={(e) => setContractValue(e.target.value)}
                          placeholder="₦150,000"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                          Duration / Deadline
                        </label>
                        <input
                          type="text"
                          value={contractDuration}
                          onChange={(e) => setContractDuration(e.target.value)}
                          placeholder="e.g. 1 year or 30 days"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                        Scope & Specific Terms
                      </label>
                      <textarea
                        value={specificTerms}
                        onChange={(e) => setSpecificTerms(e.target.value)}
                        placeholder="Describe deliverables, payment milestones, escrow release conditions, or penalty clauses..."
                        rows={3}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                        Jurisdiction / Governing State
                      </label>
                      <select
                        value={governingState}
                        onChange={(e) => setGoverningState(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      >
                        <option value="Lagos State, Nigeria">Lagos State, Nigeria</option>
                        <option value="Abuja FCT, Nigeria">Abuja FCT, Nigeria</option>
                        <option value="Rivers State, Nigeria">Rivers State, Nigeria</option>
                        <option value="Nairobi County, Kenya">Nairobi County, Kenya</option>
                        <option value="Greater Accra, Ghana">Greater Accra, Ghana</option>
                      </select>
                    </div>

                    <label className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-[11px] text-indigo-700 dark:text-indigo-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={legalIntermediaryConsent}
                        onChange={(e) => setLegalIntermediaryConsent(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I acknowledge AGC acts as an electronic contract intermediary and attach my digital e-signature.
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleGenerateContract}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Generate & E-Sign Legally Binding Contract</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Smart Contract Templates
                    </span>
                    <span className="text-[10px] text-slate-400">Standardized African Legal Deeds</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {contractTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:border-indigo-500/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {tmpl.badge}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors mt-1">
                              {tmpl.title}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-0.5 line-clamp-2">
                              {tmpl.description}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* My Generated & Signed Contracts Vault */}
                  <div className="mt-5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                      Active Signed Contracts ({generatedContracts.length})
                    </span>

                    <div className="space-y-3">
                      {generatedContracts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-white dark:bg-neutral-950 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800">
                          No active signed contracts yet. Select a template above to generate a smart legal deed.
                        </div>
                      ) : (
                        generatedContracts.map((cntr) => (
                          <div
                            key={cntr.id}
                            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Binding Contract ✓
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                                  {cntr.templateTitle}
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                  {cntr.partyAName} ↔ {cntr.partyBName}
                                </p>
                              </div>

                              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                {cntr.amountOrValue}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-2 bg-slate-50 dark:bg-neutral-900/60 p-2 rounded-xl">
                              {cntr.specificTerms}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span>{cntr.signatureA}</span>
                              <span>{cntr.createdAt}</span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-900 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleSendContractToChat(cntr)}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                              >
                                <Send className="w-3 h-3" />
                                <span>Attach to Chat</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadContractCopy(cntr)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold text-[11px] flex items-center gap-1 hover:bg-slate-100"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download Copy</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIGITAL ESCROW ARBITRATION */}
          {activeTab === 'disputes' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <Scale className="w-4 h-4 text-purple-500" />
                  <span>In-Chat Escrow & Commerce Dispute Arbitration</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                  When a buyer or merchant disputes order fulfillment or damaged goods, licensed partner arbiters review chat logs, dispatch tracking, and photos to issue binding escrow rulings.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-center">
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block mb-1">
                  Have an unresolved chat transaction?
                </span>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mb-3">
                  Open the order in Settings → Paystack Escrow Purchases or tap Manage Escrow in chat to raise a dispute directly.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    showToast('To dispute an active escrow order, tap "Manage Escrow" on the order card and submit your dispute reason.')
                  }
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  How to File Arbitration Claim
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CAC & BUSINESS COMPLIANCE TRACKER */}
          {activeTab === 'cac' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Corporate Affairs Commission (CAC) Tracker
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                  Track annual return deadlines, TIN compliance, and business name renewals for your AGC catalog store.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">CAC Annual Returns 2026</span>
                      <span className="text-[10px] text-slate-400">Due before Dec 31st (Avoid penalties)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('lawyers');
                        setSpecialtyFilter('Corporate Law');
                        showToast('Select a verified Corporate Law practitioner to handle your CAC filing.');
                      }}
                      className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px]"
                    >
                      Find Corporate Counsel
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Trademark & Brand Protection</span>
                      <span className="text-[10px] text-slate-400">Class 25 & Class 35 registration search</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('lawyers');
                        setSpecialtyFilter('Tech & IP');
                        showToast('Select an IP attorney below to initiate a trademark search.');
                      }}
                      className="px-3 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-bold text-[11px]"
                    >
                      Find IP Counsel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
