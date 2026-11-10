import React, { useState } from 'react';
import {
  Scale,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronRight,
  Download,
  Share2,
  X,
  Plus,
  Send,
  PenTool,
  Lock,
  Gavel,
  Briefcase,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LawyerProfile, LegalContractTemplate, GeneratedLegalContract } from '../types';

export const LegalModal: React.FC = () => {
  const {
    isLegalModalOpen,
    setIsLegalModalOpen,
    lawyers,
    contractTemplates,
    generatedContracts,
    generateLegalContract,
    signLegalContract,
    triggerEmergencyLegalSos,
    formatPrice,
    currentUser,
    chats,
    setActiveChatId,
    sendMessage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'lawyers' | 'contracts' | 'disputes' | 'cac'>('contracts');
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LegalContractTemplate | null>(null);
  const [activeContractToSign, setActiveContractToSign] = useState<GeneratedLegalContract | null>(null);

  // Contract Generator Questionnaire form state
  const [partyAName, setPartyAName] = useState(currentUser.fullName || 'Citizen User');
  const [partyBName, setPartyBName] = useState('');
  const [contractValue, setContractValue] = useState('₦50,000');
  const [contractDuration, setContractDuration] = useState('14 days from signing');
  const [specificTerms, setSpecificTerms] = useState('');
  const [governingState, setGoverningState] = useState('Lagos State, Nigeria');
  const [legalIntermediaryConsent, setLegalIntermediaryConsent] = useState(false);
  const [signInput, setSignInput] = useState('');

  const [sosActiveMessage, setSosActiveMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isLegalModalOpen) return null;

  const handleLegalSos = () => {
    const res = triggerEmergencyLegalSos();
    setSosActiveMessage(res.message);
    setTimeout(() => setSosActiveMessage(null), 6000);
  };

  const handleGenerateContract = () => {
    if (!legalIntermediaryConsent) {
      alert('Please confirm that you acknowledge the legal intermediary disclaimer before generating this contract.');
      return;
    }
    if (!partyBName.trim() || !selectedTemplate) {
      alert('Please fill in the other party name and select a template.');
      return;
    }

    const created = generateLegalContract({
      templateTitle: selectedTemplate.title,
      partyAName,
      partyBName,
      amountOrValue: contractValue,
      durationOrDate: contractDuration,
      governingLaw: `Laws of ${governingState}`,
      specificTerms: specificTerms || 'All deliverables must meet standard merchantability. Escrow release contingent upon mutual written approval in AGC.',
    });

    setSelectedTemplate(null);
    setSuccessToast(`📜 Contract "${created.templateTitle}" created & e-signed by you! Ready to send to ${partyBName}.`);
    setTimeout(() => setSuccessToast(null), 4000);
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
      setSuccessToast('Contract shared to active chat thread!');
      setTimeout(() => setSuccessToast(null), 3000);
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
                  AfriLaw & Smart Contracts
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Lawyers-on-Demand, Contract Generator & Escrow Arbitration
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

          {/* Emergency Legal SOS button (Police harassment & illegal stop rapid defense) */}
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

          {successToast && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold animate-in slide-in-from-top-2">
              {successToast}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-bold shrink-0">
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
          {/* TAB 1: SMART CONTRACT & DOCUMENT GENERATOR */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {selectedTemplate ? (
                /* Questionnaire Form for Selected Template */
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

                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-[11px] text-indigo-700 dark:text-indigo-300">
                      ✍️ By generating, your digital cryptographic e-signature will be attached. Both parties receive verifiable tamper-proof PDF hashes.
                    </div>

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
                /* Templates Catalog */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Smart Contract Templates
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Standardized African Legal Deeds
                    </span>
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

                          <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-2 bg-slate-50 dark:bg-neutral-900/60 p-2 rounded-xl text-xs">
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
                              onClick={() => alert(`Legal PDF for "${cntr.templateTitle}" downloaded with certified electronic signature!`)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold text-[11px] flex items-center gap-1 hover:bg-slate-100"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF Copy</span>
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

          {/* TAB 2: LAWYERS DIRECTORY */}
          {activeTab === 'lawyers' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-200">
                <span className="font-bold">Verified Legal Counsel:</span> All attorneys possess verified Nigerian Bar Association (NBA) call-to-bar numbers and audited practice seals.
              </div>

              <div className="space-y-3">
                {lawyers.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-neutral-950 border border-dashed border-indigo-200 dark:border-indigo-900/40">
                    <Scale className="w-8 h-8 text-indigo-500/60 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white font-display">No Attorneys On Duty</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Accredited Nigerian Bar Association (NBA) attorneys will appear here upon verified check-in.
                    </p>
                  </div>
                ) : (
                  lawyers.map((lawyer) => (
                  <div
                    key={lawyer.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={lawyer.avatar}
                        alt={lawyer.name}
                        className="w-13 h-13 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {lawyer.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            NBA Certified ✓
                          </span>
                        </div>

                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {lawyer.specialty}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                          {lawyer.firm} · Bar No: {lawyer.barNumber}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-neutral-400">
                          <span>{lawyer.yearsExperience} yrs experience</span>
                          <span>•</span>
                          <span>{lawyer.location}</span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-1 line-clamp-2">
                          {lawyer.bio}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Triage / Advice Fee</span>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {formatPrice(lawyer.consultationFee, lawyer.currency)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const match = chats[0];
                              if (match) {
                                sendMessage(match.id, `⚖️ Hello Counsel ${lawyer.name}, I would like to book a legal triage consultation regarding ${lawyer.specialty}.`);
                                setIsLegalModalOpen(false);
                                setActiveChatId(match.id);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs"
                          >
                            <Gavel className="w-3.5 h-3.5" />
                            <span>Consult Counsel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
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
                  When a buyer or merchant disputes order fulfillment or damaged goods, licensed partner arbiters review chat logs, Gokada tracking, and photos to issue legally binding release rulings.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Case #ARB-2026-094
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      Resolved by Arbiter
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                    Matter: Disputed Phone Screen condition (Escrow: ₦45,000)
                  </p>
                  <p className="text-xs text-slate-700 dark:text-neutral-300 mt-1.5 bg-slate-50 dark:bg-neutral-900 p-2 rounded-xl">
                    Ruling: Buyer provided unboxing video showing broken seal; Arbiter Barrister Boateng ordered 100% refund from Escrow Vault back to buyer's Paystack wallet.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block mb-1">
                    Have an unresolved chat transaction?
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mb-3">
                    Trigger arbitration directly from any order in the Escrow Vault modal.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      alert('To dispute a live purchase, tap your order in the Escrow tab and select "Trigger Legal Arbitration".');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                  >
                    File New Arbitration Claim
                  </button>
                </div>
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
                      onClick={() => alert('Filing request sent to Barrister Tunde Bakare CAC desk!')}
                      className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px]"
                    >
                      File with Lawyer
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Trademark & Brand Protection</span>
                      <span className="text-[10px] text-slate-400">Class 25 & Class 35 registration search</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Trademark search booked with Bakare & Co.!')}
                      className="px-3 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-bold text-[11px]"
                    >
                      Search
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
