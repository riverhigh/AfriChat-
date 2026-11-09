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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScamEntity } from '../types';

export const ScamReputationModal: React.FC = () => {
  const {
    isScamCheckerModalOpen,
    setIsScamCheckerModalOpen,
    checkEntityReputation,
    flagEntityAsScam,
    scamLookupEntity,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('+234 809 999 0011');
  const [activeTab, setActiveTab] = useState<'check' | 'report'>('check');
  const [reportValue, setReportValue] = useState('');
  const [reportType, setReportType] = useState<'phone' | 'bank_account'>('phone');
  const [reportReason, setReportReason] = useState('Sent fake bank debit SMS alert and disappeared');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isScamCheckerModalOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    checkEntityReputation(searchQuery.trim());
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportValue.trim()) return;
    flagEntityAsScam(reportValue.trim(), reportType, reportReason);
    setFeedback(`Report submitted! ${reportValue} flagged in AfriChat crowdsourced scam vault.`);
    setTimeout(() => {
      setFeedback(null);
      setActiveTab('check');
      setSearchQuery(reportValue);
    }, 1500);
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
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Scam & Reputation Checker
              </h3>
              <p className="text-[10px] text-slate-400">
                Crowdsourced fraud database for African phone numbers & accounts
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
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {activeTab === 'check' && (
            <div className="space-y-4">
              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter phone or account (e.g. +234...)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0"
                >
                  Verify
                </button>
              </form>

              {/* Quick sample chips */}
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto no-scrollbar">
                <span className="text-slate-400 shrink-0">Try Demo:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('+234 809 999 0011');
                    checkEntityReputation('+234 809 999 0011');
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-mono text-[10px] border border-rose-200 dark:border-rose-800"
                >
                  Flagged Phone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('0129883471');
                    checkEntityReputation('0129883471');
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-mono text-[10px] border border-rose-200 dark:border-rose-800"
                >
                  Flagged Bank Acct
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('+234 803 123 4567');
                    checkEntityReputation('+234 803 123 4567');
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] border border-emerald-200 dark:border-emerald-800"
                >
                  Verified Clean
                </button>
              </div>

              {/* Result Card */}
              {scamLookupEntity ? (
                <div
                  className={`p-4 rounded-2xl border ${
                    scamLookupEntity.riskLevel === 'critical_scam'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {scamLookupEntity.riskLevel === 'critical_scam' ? (
                        <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {scamLookupEntity.riskLevel === 'critical_scam'
                            ? 'HIGH FRAUD RISK DETECTED!'
                            : 'VERIFIED CLEAN ENTITY'}
                        </div>
                        <div className="text-xs font-mono opacity-80 mt-0.5">
                          {scamLookupEntity.targetValue}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        scamLookupEntity.riskLevel === 'critical_scam'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {scamLookupEntity.reportsCount} Reports
                    </span>
                  </div>

                  {scamLookupEntity.accountName && (
                    <div className="mt-3 p-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs space-y-0.5">
                      <div className="font-semibold">Associated Account Name:</div>
                      <div className="font-mono text-slate-800 dark:text-slate-100">
                        {scamLookupEntity.accountName} · {scamLookupEntity.bankName}
                      </div>
                    </div>
                  )}

                  {/* Flag Logs */}
                  {scamLookupEntity.recentFlags.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                        Crowdsourced Evidence Logs:
                      </div>
                      <div className="space-y-1">
                        {scamLookupEntity.recentFlags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white/60 dark:bg-black/40 text-[11px] leading-relaxed border border-black/5 dark:border-white/5"
                          >
                            <p className="font-medium">"{flag.reason}"</p>
                            <div className="flex items-center justify-between text-[10px] opacity-70 mt-1">
                              <span>Flagged by {flag.flaggedBy}</span>
                              <span>{flag.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-xs font-medium">
                    {scamLookupEntity.riskLevel === 'critical_scam' ? (
                      <p className="text-rose-700 dark:text-rose-300">
                        🚨 DO NOT transfer funds directly. Always use AfriChat Escrow Vault to hold money until goods are delivered!
                      </p>
                    ) : (
                      <p className="text-emerald-700 dark:text-emerald-300">
                        ✓ No fraudulent activity reported on this entity across Nigerian or African networks.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Search any phone number or bank account above to see its crowdsourced reputation.
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
                  <option>Took deposit for parcel and blocked contact on WhatsApp</option>
                  <option>Sent wrong/counterfeit goods and refused refund</option>
                  <option>Impersonated registered market store or vendor</option>
                  <option>Sent phishing link requesting debit card PIN</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Flag className="w-4 h-4" />
                <span>Submit Fraud Flag to AfriChat Vault</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
