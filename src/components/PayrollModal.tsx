import React, { useState } from 'react';
import {
  X,
  Users,
  Repeat,
  DollarSign,
  Play,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Building,
  CreditCard,
  ShieldCheck,
  Check,
  Pause,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PayrollEmployee } from '../types';

export const PayrollModal: React.FC = () => {
  const {
    isPayrollModalOpen,
    setIsPayrollModalOpen,
    payrollEmployees,
    payrollLogs,
    addPayrollEmployee,
    toggleEmployeePayrollStatus,
    deletePayrollEmployee,
    runPayrollNow,
    wallet,
    formatPrice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'roster' | 'add' | 'logs'>('roster');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Employee Form State
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Store Attendant & Clerk');
  const [empPhone, setEmpPhone] = useState('+234 ');
  const [empSalary, setEmpSalary] = useState('65000');
  const [empFrequency, setEmpFrequency] = useState<'weekly' | 'bi_weekly' | 'monthly'>('monthly');
  const [empAccount, setEmpAccount] = useState('Zenith Bank (2109847291)');

  if (!isPayrollModalOpen) return null;

  const totalActiveCommitment = payrollEmployees
    .filter((e) => e.status === 'active')
    .reduce((acc, e) => acc + e.salary, 0);

  const handleRunAllPayroll = () => {
    setStatusMessage(null);
    const result = runPayrollNow();
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      setActiveTab('logs');
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleRunSinglePayroll = (employeeId: string, name: string) => {
    setStatusMessage(null);
    const result = runPayrollNow(employeeId);
    if (result.success) {
      setStatusMessage({ type: 'success', text: `Auto-debit for ${name} dispatched successfully!` });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter staff member name.' });
      return;
    }

    const salaryNum = parseFloat(empSalary);
    if (!salaryNum || salaryNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid salary amount.' });
      return;
    }

    addPayrollEmployee({
      fullName: empName,
      role: empRole,
      phone: empPhone,
      salary: salaryNum,
      currency: 'NGN',
      frequency: empFrequency,
      nextPaymentDate: empFrequency === 'weekly' ? 'Every Friday' : '28th of every month',
      bankOrWallet: empAccount,
      accountNumber: empAccount,
    });

    setStatusMessage({ type: 'success', text: `${empName} added to recurring payroll auto-debit!` });
    setEmpName('');
    setActiveTab('roster');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Payroll & Recurring Auto-Debit</span>
                <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                  Auto-Disburse
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Staff salaries, drivers, attendants & domestic team auto-debits
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPayrollModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-neutral-950 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => {
              setActiveTab('roster');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'roster'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Staff Roster ({payrollEmployees.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'add'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            + Add Staff
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Run History ({payrollLogs.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-black">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: ROSTER & AUTO-DEBIT SUMMARY */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Summary Dashboard Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-900 via-indigo-900 to-purple-800 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between text-xs text-purple-200">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Repeat className="w-4 h-4 text-purple-300" />
                    <span>Auto-Debit Cycle Status</span>
                  </span>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full font-mono text-[10px] font-bold">
                    Next Run: 28th Nov
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] text-purple-200">Total Active Monthly Payroll:</div>
                    <div className="text-2xl font-black font-mono tracking-tight">
                      ₦{totalActiveCommitment.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-purple-200">Wallet Balance:</div>
                    <div className="text-xs font-bold font-mono text-emerald-300">
                      ₦{wallet.availableBalance.toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRunAllPayroll}
                  className="w-full py-2.5 bg-white text-purple-950 hover:bg-purple-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Auto-Debit Run Now ({payrollEmployees.filter((e) => e.status === 'active').length} staff)</span>
                </button>
              </div>

              {/* Staff List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Enrolled Staff & Auto-Debit Toggles
                </div>

                {payrollEmployees.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-neutral-400 text-xs">
                    No staff enrolled on payroll yet. Add workers to start auto-debiting.
                  </div>
                ) : (
                  payrollEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {emp.fullName}
                            </h4>
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                emp.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                              }`}
                            >
                              {emp.status === 'active' ? 'Auto-Debit ON' : 'Paused'}
                            </span>
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                            {emp.role}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {emp.phone} · {emp.bankOrWallet}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {formatPrice(emp.salary, emp.currency)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono capitalize">
                            /{emp.frequency.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {emp.lastPaidDate && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Last disbursed: <span className="text-slate-600 dark:text-neutral-300">{emp.lastPaidDate}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-900 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEmployeePayrollStatus(emp.id)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            emp.status === 'active'
                              ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {emp.status === 'active' ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause Auto-Debit</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume Auto-Debit</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRunSinglePayroll(emp.id, emp.fullName)}
                            className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                          >
                            Pay Now
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePayrollEmployee(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Remove staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD EMPLOYEE */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddEmployeeSubmit} className="space-y-3.5">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                Add domestic staff, shop attendants, drivers, or artisans. AfriChat automatically processes salary transfers on the scheduled recurring cycle.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Worker Full Name
                </label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Sunday Alabi"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Role / Designation
                </label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="e.g. Executive Driver, Shop Clerk, Tailor Assistant"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Phone / E.164
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="+234 803 888 4921"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Salary (₦)
                  </label>
                  <input
                    type="number"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="65000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Recurrence Frequency
                  </label>
                  <select
                    value={empFrequency}
                    onChange={(e) => setEmpFrequency(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  >
                    <option value="weekly">Weekly Auto-Debit</option>
                    <option value="bi_weekly">Bi-Weekly Auto-Debit</option>
                    <option value="monthly">Monthly Auto-Debit (28th)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Payout Destination
                  </label>
                  <input
                    type="text"
                    value={empAccount}
                    onChange={(e) => setEmpAccount(e.target.value)}
                    placeholder="e.g. AfriChat Wallet or Zenith Bank"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Payroll & Enable Auto-Debit</span>
              </button>
            </form>
          )}

          {/* TAB 3: RUN HISTORY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Disbursement Audit Logs ({payrollLogs.length})
              </div>

              {payrollLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-neutral-400 text-xs">
                  No automated payroll runs recorded yet.
                </div>
              ) : (
                payrollLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {log.employeeName} ({log.role})
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {log.date} · Ref: {log.reference}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                        {formatPrice(log.amount, log.currency)}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Disbursed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
