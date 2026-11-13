import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Building,
  Phone,
  Clock,
  UserCheck,
  Loader2,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ScamReputationModal: React.FC = () => {
  const {
    isScamCheckerModalOpen,
    setIsScamCheckerModalOpen,
    checkEntityReputation,
    flagEntityAsScam,
    scamLookupEntity,
    isCheckingReputation,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'check' | 'report'>('check');
  const [reportValue, setReportValue] = useState('');
  const [reportType, setReportType] = useState<'phone' | 'bank_account'>('phone');
  const [reportReason, setReportReason] = useState('Sent fake bank debit SMS alert and disappeared');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isScamCheckerModalOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    await checkEntityReputation(searchQuery.trim());
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportValue.trim()) return;
    setIsSubmitting(true);
    await flagEntityAsScam(reportValue.trim(), reportType, reportReason);
    setFeedback(`✅ Report broadcast live! ${reportValue} flagged in AGC crowdsourced vault.`);
    setIsSubmitting(false);
    setTimeout(() => {
      setFeedback(null);
      setActiveTab('check');
      setSearchQuery(reportValue);
    }, 2000);
  };

  return (
    <div
      onClick={() => setIsScamCheckerModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display flex items-center gap-1.5">
                Scam &amp; Reputation Checker
                {/* Live indicator */}
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Live
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Crowdsourced fraud database for African phone numbers &amp; accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsScamCheckerModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 dark:bg-[#110f1e] border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('check')}
            className={`py-2 rounded-xl transition-colors ${
              activeTab === 'check'
                ? 'bg-white dark:bg-[#1c1933] text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Check Number / Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`py-2 rounded-xl transition-colors ${
              activeTab === 'report'
                ? 'bg-white dark:bg-[#1c1933] text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Report Fraud / Scammer
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {feedback && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium">{feedback}</span>
            </div>
          )}

          {activeTab === 'check' && (
            <div className="space-y-4">
              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search phone number or bank account…"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCheckingReputation}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {isCheckingReputation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  {isCheckingReputation ? 'Checking…' : 'Verify'}
                </button>
              </form>

              {/* Result */}
              {scamLookupEntity ? (
                <div
                  className={`rounded-2xl border p-4 space-y-3 ${
                    scamLookupEntity.riskLevel === 'critical_scam'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : scamLookupEntity.riskLevel === 'suspicious'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {/* Risk header */}
                  <div className="flex items-center gap-2">
                    {scamLookupEntity.riskLevel === 'critical_scam' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                    ) : scamLookupEntity.riskLevel === 'suspicious' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate">
                          {scamLookupEntity.targetValue}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            scamLookupEntity.riskLevel === 'critical_scam'
                              ? 'bg-rose-500 text-white'
                              : scamLookupEntity.riskLevel === 'suspicious'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {scamLookupEntity.riskLevel.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {scamLookupEntity.reportsCount} report{scamLookupEntity.reportsCount !== 1 ? 's' : ''} in AGC vault
                      </p>
                    </div>
                  </div>

                  {/* Account info */}
                  {(scamLookupEntity.accountName || scamLookupEntity.bankName) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-black/20 rounded-xl px-3 py-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {scamLookupEntity.accountName}
                        {scamLookupEntity.bankName && ` · ${scamLookupEntity.bankName}`}
                      </span>
                    </div>
                  )}

                  {/* Recent flags */}
                  {scamLookupEntity.recentFlags && scamLookupEntity.recentFlags.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Recent Reports
                      </p>
                      {scamLookupEntity.recentFlags.slice(0, 3).map((flag, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 rounded-lg px-2.5 py-1.5"
                        >
                          <Clock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="flex-1">{flag.reason}</span>
                          <span className="text-[9px] text-slate-400 shrink-0 whitespace-nowrap">
                            {flag.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary verdict */}
                  <div
                    className={`rounded-xl px-3 py-2 text-xs font-medium ${
                      scamLookupEntity.riskLevel === 'critical_scam'
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                        : scamLookupEntity.riskLevel === 'suspicious'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {scamLookupEntity.riskLevel === 'critical_scam' ? (
                      <p>⚠️ High risk — multiple AGC community reports. Avoid transacting with this entity.</p>
                    ) : scamLookupEntity.riskLevel === 'suspicious' ? (
                      <p>🟡 Moderate risk — some reports flagged. Proceed with caution and verify identity.</p>
                    ) : (
                      <p>✅ No fraudulent activity reported on this entity across Nigerian or African networks.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                  <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="font-medium text-slate-500 dark:text-slate-400">
                    Search any Nigerian or African phone number or bank account
                  </p>
                  <p className="text-slate-400 dark:text-slate-500">
                    to check AGC's live crowdsourced fraud vault.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <form onSubmit={handleReportSubmit} className="space-y-3.5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
                Help protect market traders and buyers by reporting fraudulent accounts or fake alerts.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entity Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportType('phone')}
                    className={`py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                      reportType === 'phone'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('bank_account')}
                    className={`py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                      reportType === 'bank_account'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" /> Bank Account
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Value (Phone or Account #)
                </label>
                <input
                  type="text"
                  value={reportValue}
                  onChange={(e) => setReportValue(e.target.value)}
                  placeholder={reportType === 'phone' ? '+234 800 000 0000' : '0123456789'}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Fraud Report
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option>Sent fake bank debit SMS alert and disappeared</option>
                  <option>Took deposit for parcel and blocked contact on chat</option>
                  <option>Sent wrong/counterfeit goods and refused refund</option>
                  <option>Impersonated registered market store or vendor</option>
                  <option>Sent phishing link requesting debit card PIN</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Broadcasting…' : 'Submit Fraud Flag to AGC Vault'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
