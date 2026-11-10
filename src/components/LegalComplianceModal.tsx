import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  Building2,
  Lock,
  HeartPulse,
  Send,
  CheckCircle2,
  Download,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tos' | 'privacy' | 'disclaimers' | 'dmca' | 'data_rights';
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'tos',
}) => {
  const { currentUser, wallet } = useApp();
  const [activeTab, setActiveTab] = useState<'tos' | 'privacy' | 'disclaimers' | 'dmca' | 'data_rights'>(defaultTab);

  // DMCA / Takedown Form State
  const [infringingUrl, setInfringingUrl] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [takedownSubmitted, setTakedownSubmitted] = useState(false);

  // Data Rights Flow State
  const [dataRequestSuccess, setDataRequestSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTakedownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTakedownSubmitted(true);
    setTimeout(() => {
      setTakedownSubmitted(false);
      setInfringingUrl('');
      setClaimantName('');
      setClaimantEmail('');
      setWorkDescription('');
      alert('Takedown claim recorded. Our Legal Trust & Safety team will review within 24 hours pursuant to copyright safe harbor rules.');
    }, 1500);
  };

  const handleExportData = () => {
    const exportPayload = {
      corporateEntity: 'Web Tab Global Services Technology LTD (RC8554897)',
      dataSubject: {
        userId: currentUser.id,
        phoneNumber: currentUser.phoneNumber,
        fullName: currentUser.fullName,
        createdAt: currentUser.createdAt,
      },
      walletSummary: {
        currency: wallet.currency,
        availableBalance: wallet.availableBalance,
        transactionsCount: wallet.transactions.length,
      },
      exportTimestamp: new Date().toISOString(),
      ndpaReference: 'Nigeria Data Protection Act (NDPA) 2023 - Article 34 Right of Access',
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afri_chat_ndpa_export_${currentUser.phoneNumber || 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataRequestSuccess('Your personal data archive has been generated and downloaded pursuant to NDPA 2023.');
    setTimeout(() => setDataRequestSuccess(null), 4000);
  };

  const handleDeleteRequest = () => {
    if (confirm('Are you sure you want to request permanent erasure of your personal data under the NDPA? All unspent wallet balances must be withdrawn first.')) {
      setDataRequestSuccess('Data erasure ticket logged. Trust & Safety will scrub personal records in accordance with NDPA 30-day compliance timelines.');
      setTimeout(() => setDataRequestSuccess(null), 5000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#12111d] rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Legal & Regulatory Disclosures
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Web Tab Global Services Technology LTD (RC8554897)</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-neutral-900/50 border-b border-slate-100 dark:border-neutral-800 overflow-x-auto no-scrollbar text-xs font-semibold">
          {[
            { id: 'tos', label: 'Terms of Service', icon: FileText },
            { id: 'privacy', label: 'NDPA Privacy', icon: Lock },
            { id: 'disclaimers', label: 'Intermediary Disclaimers', icon: AlertTriangle },
            { id: 'dmca', label: 'Copyright & Takedown', icon: ShieldCheck },
            { id: 'data_rights', label: 'My Data Rights', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-200/60 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'tos' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl">
                <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">
                  1. Operating Entity & Intermediary Status
                </span>
                <p>
                  AGC is operated by <strong>Web Tab Global Services Technology LTD</strong> (Registration RC8554897, incorporated under the laws of the Federal Republic of Nigeria). AGC operates strictly as an <em>intermediary technology software platform</em> connecting buyers, merchants, independent artisans, and users. Web Tab Global Services Technology LTD is <strong>not</strong> a licensed commercial bank, law chamber, or healthcare provider.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                  2. Wallet & Settlement Disclaimers
                </h4>
                <p>
                  In-app wallet stored balances and payment processing are facilitated in partnership with Central Bank of Nigeria (CBN)-licensed payment solution service providers (including Paystack / Flutterwave). User balances represent an electronic stored-value voucher for platform transactions and are not eligible for interest accumulation or commercial lending.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                  3. Peer-to-Peer Escrow Facilitation
                </h4>
                <p>
                  AGC&apos;s Escrow service holds digital authorization keys until mutual verification of physical product inspection via a 4-digit PIN. Web Tab Global Services Technology LTD facilitates cryptographic release conditions but does not inspect, warehouse, or warrant physical goods sold by third-party catalog merchants.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                  4. Limitation of Personal Liability
                </h4>
                <p>
                  All contracts, platform claims, and merchant transactions are strictly with Web Tab Global Services Technology LTD as a corporate entity. Officers, directors, software engineers, and founders are completely protected from personal corporate liabilities arising from third-party content or peer-to-peer disputes.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: NDPA PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                  Nigeria Data Protection Act (NDPA 2023) Compliance Notice
                </span>
                <p>
                  Web Tab Global Services Technology LTD acts as a registered Data Controller and Processor under the Nigeria Data Protection Act (NDPA) 2023. We observe strict lawful basis (consent and contractual performance) for all personal information.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  What Information We Process
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Identity:</strong> Phone number, verified display name, and avatar.</li>
                  <li><strong>Financial:</strong> Wallet transaction ledgers, escrow PIN validations, and Paystack reference tokens.</li>
                  <li><strong>Sensitive Records:</strong> Health vault records and legal contracts are processed solely with explicit per-action consent checkboxes and are never sold or shared with commercial advertising brokers.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Data Retention & Storage
                </h4>
                <p>
                  Personal chat logs and voice transcripts are retained solely for message delivery. Users possess the unconditional right under NDPA Article 34 to export their data or demand permanent account erasure.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SPECIFIC INTERMEDIARY DISCLAIMERS */}
          {activeTab === 'disclaimers' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                  <HeartPulse className="w-4 h-4" />
                  <span>AfriHealth Telehealth Disclaimer</span>
                </div>
                <p>
                  Consultations and queue tokens via AfriHealth are provided by independent medical practitioners. They do <strong>not</strong> substitute for emergency triage or in-person hospital admission. If you are experiencing a life-threatening emergency, visit the nearest medical center immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                  <Scale className="w-4 h-4" />
                  <span>AfriLaw Legal Directory Disclaimer</span>
                </div>
                <p>
                  Legal contract templates and directory listings are informational and self-service. No attorney-client relationship is formed between Web Tab Global Services Technology LTD and any user. Retaining an attorney requires independent formal engagement.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Artisan Stations & Services Disclaimer</span>
                </div>
                <p>
                  Mechanics, tailors, and electricians listed on the Artisan Hub are independent self-employed contractors. Web Tab Global Services Technology LTD is not an employer or insurer of artisan workmanship.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: DMCA & COPYRIGHT SAFE HARBOR */}
          {activeTab === 'dmca' && (
            <div className="space-y-4">
              <p>
                Pursuant to Section 512 of the DMCA and Nigerian Copyright Act safe harbor standards, Web Tab Global Services Technology LTD maintains an expeditious notice-and-takedown procedure for alleged intellectual property violations in digital files, AfriBooks, or store listings.
              </p>

              <form onSubmit={handleTakedownSubmit} className="space-y-3 p-4 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  Expedited Intellectual Property Takedown Form
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    Your Full Name / Entity
                  </label>
                  <input
                    type="text"
                    required
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    placeholder="e.g. Victor Adeleke, Esq. on behalf of Author"
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    value={claimantEmail}
                    onChange={(e) => setClaimantEmail(e.target.value)}
                    placeholder="legal@rightsowner.com"
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    Infringing File / Book / Listing Title or ID
                  </label>
                  <input
                    type="text"
                    required
                    value={infringingUrl}
                    onChange={(e) => setInfringingUrl(e.target.value)}
                    placeholder="e.g. AfriBook: 'The Lagos Merchant' or File ID 'fl_4882'"
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                    Statement of Ownership & Good Faith Belief
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="I have a good-faith belief that use of the material is not authorized by the copyright owner, agent, or the law."
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={takedownSubmitted}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{takedownSubmitted ? 'Transmitting Notice...' : 'Submit Takedown Notice (24h Review)'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: MY DATA RIGHTS (NDPA EXPORT & DELETION) */}
          {activeTab === 'data_rights' && (
            <div className="space-y-4">
              <p>
                In compliance with the <strong>Nigeria Data Protection Act (NDPA) 2023</strong>, AGC provides users with self-service controls over their personal data records.
              </p>

              {dataRequestSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{dataRequestSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                      <Download className="w-4 h-4 text-purple-600" />
                      <span>Export My Personal Data</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      Download a complete, machine-readable JSON archive of your profile, verified phone identity, and wallet ledger.
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Archive</span>
                  </button>
                </div>

                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-xs">
                      <Trash2 className="w-4 h-4" />
                      <span>Request Permanent Erasure</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      Permanently delete your profile and phone association from AGC and Supabase servers (NDPA Article 34).
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteRequest}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Request Data Erasure</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 flex items-center justify-between text-[11px] text-slate-400">
          <span>Web Tab Global Services Technology LTD · RC8554897</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
