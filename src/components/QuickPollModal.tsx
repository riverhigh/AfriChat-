import React, { useState } from 'react';
import { BarChart3, Plus, Trash2, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface QuickPollModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSubmitPoll?: (question: string, options: string[], allowMultiple: boolean) => void;
  contextLabel?: string;
}

export const QuickPollModal: React.FC<QuickPollModalProps> = ({
  isOpen,
  onClose,
  onSubmitPoll,
  contextLabel,
}) => {
  const {
    isQuickPollModalOpen,
    setIsQuickPollModalOpen,
    activeChatId,
    createQuickPoll,
  } = useApp();

  const open = isOpen !== undefined ? isOpen : isQuickPollModalOpen;
  const handleClose = onClose || (() => setIsQuickPollModalOpen(false));

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedQ = question.trim();
    const validOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!cleanedQ) {
      setErrorMsg('Please type a question for your poll.');
      return;
    }
    if (validOpts.length < 2) {
      setErrorMsg('Provide at least 2 options.');
      return;
    }

    if (onSubmitPoll) {
      onSubmitPoll(cleanedQ, validOpts, allowMultiple);
    } else if (activeChatId) {
      const res = createQuickPoll(activeChatId, cleanedQ, validOpts, allowMultiple);
      if (!res.success) {
        setErrorMsg(res.message || 'Could not launch poll.');
        return;
      }
    }

    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setErrorMsg('');
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#0d0916] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-purple-500/25 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {contextLabel || 'Launch Quick Vote Poll'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Free instant community vote · Live tally
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Poll Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g., Where are we hanging out Friday night?"
              maxLength={140}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Options ({options.length}/5)
              </label>
              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              )}
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    handleOptionChange(idx, e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={70}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                    title="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Allow multiple answers
              </span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                Members can pick more than one option
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 accent-purple-600 rounded"
            />
          </label>

          {errorMsg && (
            <p className="text-xs text-rose-500 font-semibold">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>Launch Poll</span>
          </button>
        </form>
      </div>
    </div>
  );
};
