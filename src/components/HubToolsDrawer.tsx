import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  StickyNote,
  Calendar as CalendarIcon,
  Calculator as CalculatorIcon,
  Receipt,
  X,
  Plus,
  Trash2,
  Pin,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Delete,
  Clock,
  ArrowLeft,
  History,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { safeLocalStorage, safeGetJson } from '../utils/safeStorage';

type ToolTab = 'launcher' | 'notes' | 'calendar' | 'calculator' | 'expenses';

interface HubNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
}

interface HubCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  title: string;
  notes?: string;
  completed: boolean;
}

interface HubExpenseEntry {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

type ExpenseCategory = 'Supplies' | 'Transport' | 'Data & Airtime' | 'Equipment' | 'Packaging' | 'Other';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Supplies',
  'Transport',
  'Data & Airtime',
  'Equipment',
  'Packaging',
  'Other',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTimestampMeta(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface HubToolsDrawerProps {
  eligibleRoles: string[];
}

export const HubToolsDrawer: React.FC<HubToolsDrawerProps> = ({ eligibleRoles }) => {
  const { currentUser, currency, CURRENCY_SYMBOLS, formatPrice } = useApp();

  const userScope = useMemo(() => {
    const digits = (currentUser?.phoneNumber || '').replace(/\D/g, '').slice(-9);
    return digits || currentUser?.id || 'default';
  }, [currentUser?.phoneNumber, currentUser?.id]);

  const notesKey = `AGC_hub_notes_${userScope}_v1`;
  const calendarKey = `AGC_hub_calendar_${userScope}_v1`;
  const expensesKey = `AGC_hub_expenses_${userScope}_v1`;
  const calcHistoryKey = `AGC_hub_calc_history_${userScope}_v1`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolTab>('launcher');

  // ── 1. Notes State ────────────────────────────────────────────
  const [notes, setNotes] = useState<HubNote[]>(() => safeGetJson<HubNote[]>(notesKey, []));
  const [noteSearch, setNoteSearch] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitleDraft, setNoteTitleDraft] = useState('');
  const [noteBodyDraft, setNoteBodyDraft] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // ── 2. Calendar State ─────────────────────────────────────────
  const todayIso = useMemo(() => toDateIso(new Date()), []);
  const [events, setEvents] = useState<HubCalendarEvent[]>(() =>
    safeGetJson<HubCalendarEvent[]>(calendarKey, [])
  );
  const [calMonthDate, setCalMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventNotes, setNewEventNotes] = useState('');

  // ── 3. Calculator State ───────────────────────────────────────
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrevValue, setCalcPrevValue] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<'+' | '−' | '×' | '÷' | null>(null);
  const [calcResetNext, setCalcResetNext] = useState(false);
  const [calcExpression, setCalcExpression] = useState('');
  const [calcHistory, setCalcHistory] = useState<{ expr: string; result: string }[]>(() =>
    safeGetJson<{ expr: string; result: string }[]>(calcHistoryKey, [])
  );
  const [showCalcHistory, setShowCalcHistory] = useState(false);

  // ── 4. Expenses Log State ─────────────────────────────────────
  const [expenses, setExpenses] = useState<HubExpenseEntry[]>(() =>
    safeGetJson<HubExpenseEntry[]>(expensesKey, [])
  );
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Supplies');
  const [expDate, setExpDate] = useState(todayIso);
  const [expFilterCat, setExpFilterCat] = useState<'All' | ExpenseCategory>('All');
  const [expError, setExpError] = useState<string | null>(null);

  // Reload user-scoped data if account switches
  useEffect(() => {
    setNotes(safeGetJson<HubNote[]>(notesKey, []));
    setEvents(safeGetJson<HubCalendarEvent[]>(calendarKey, []));
    setExpenses(safeGetJson<HubExpenseEntry[]>(expensesKey, []));
    setCalcHistory(safeGetJson<{ expr: string; result: string }[]>(calcHistoryKey, []));
  }, [notesKey, calendarKey, expensesKey, calcHistoryKey]);

  // Persist changes
  useEffect(() => {
    safeLocalStorage.setItem(notesKey, JSON.stringify(notes));
  }, [notes, notesKey]);

  useEffect(() => {
    safeLocalStorage.setItem(calendarKey, JSON.stringify(events));
  }, [events, calendarKey]);

  useEffect(() => {
    safeLocalStorage.setItem(expensesKey, JSON.stringify(expenses));
  }, [expenses, expensesKey]);

  useEffect(() => {
    safeLocalStorage.setItem(calcHistoryKey, JSON.stringify(calcHistory));
  }, [calcHistory, calcHistoryKey]);

  // Lock Escape key to close drawer cleanly
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // ── Notes Handlers ────────────────────────────────────────────
  const startNewNote = () => {
    setEditingNoteId(null);
    setNoteTitleDraft('');
    setNoteBodyDraft('');
    setIsCreatingNote(true);
  };

  const openNoteEditor = (note: HubNote) => {
    setEditingNoteId(note.id);
    setNoteTitleDraft(note.title);
    setNoteBodyDraft(note.body);
    setIsCreatingNote(true);
  };

  const saveNote = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = noteTitleDraft.trim();
    const cleanBody = noteBodyDraft.trim();
    if (!cleanTitle && !cleanBody) return;

    const nowIso = new Date().toISOString();
    if (editingNoteId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNoteId
            ? { ...n, title: cleanTitle || 'Untitled note', body: cleanBody, updatedAt: nowIso }
            : n
        )
      );
    } else {
      const created: HubNote = {
        id: `note_${Date.now()}`,
        title: cleanTitle || 'Untitled note',
        body: cleanBody,
        pinned: false,
        updatedAt: nowIso,
      };
      setNotes((prev) => [created, ...prev]);
    }
    setIsCreatingNote(false);
    setEditingNoteId(null);
    setNoteTitleDraft('');
    setNoteBodyDraft('');
  };

  const togglePinNote = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNoteId === id) {
      setIsCreatingNote(false);
      setEditingNoteId(null);
    }
  };

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return [...notes]
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, noteSearch]);

  // ── Calendar Handlers ─────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calMonthDate.getFullYear();
    const month = calMonthDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    return cells;
  }, [calMonthDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HubCalendarEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    return (eventsByDate.get(selectedDateIso) || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  }, [eventsByDate, selectedDateIso]);

  const addCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEventTitle.trim();
    if (!clean) return;
    const item: HubCalendarEvent = {
      id: `cal_${Date.now()}`,
      date: selectedDateIso,
      time: newEventTime || '09:00',
      title: clean,
      notes: newEventNotes.trim() || undefined,
      completed: false,
    };
    setEvents((prev) => [...prev, item]);
    setNewEventTitle('');
    setNewEventNotes('');
  };

  const toggleCalendarEvent = (id: string) => {
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev)));
  };

  const deleteCalendarEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  // ── Calculator Handlers ───────────────────────────────────────
  const formatNum = (val: number): string => {
    if (!Number.isFinite(val)) return 'Error';
    const rounded = Number(val.toFixed(10));
    return String(rounded);
  };

  const compute = (a: number, b: number, op: '+' | '−' | '×' | '÷'): number => {
    switch (op) {
      case '+':
        return a + b;
      case '−':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? NaN : a / b;
    }
  };

  const handleCalcDigit = useCallback(
    (digit: string) => {
      if (calcDisplay === 'Error') {
        setCalcDisplay(digit === '.' ? '0.' : digit);
        setCalcResetNext(false);
        return;
      }
      if (calcResetNext) {
        setCalcDisplay(digit === '.' ? '0.' : digit);
        setCalcResetNext(false);
        return;
      }
      if (digit === '.') {
        if (calcDisplay.includes('.')) return;
        setCalcDisplay(calcDisplay + '.');
        return;
      }
      if (calcDisplay === '0') {
        setCalcDisplay(digit);
      } else if (calcDisplay.length < 14) {
        setCalcDisplay(calcDisplay + digit);
      }
    },
    [calcDisplay, calcResetNext]
  );

  const handleCalcOperator = useCallback(
    (nextOp: '+' | '−' | '×' | '÷') => {
      const current = parseFloat(calcDisplay);
      if (Number.isNaN(current)) {
        setCalcDisplay('0');
        setCalcPrevValue(null);
        setCalcOp(null);
        return;
      }
      if (calcPrevValue !== null && calcOp && !calcResetNext) {
        const res = compute(calcPrevValue, current, calcOp);
        const formatted = formatNum(res);
        setCalcDisplay(formatted);
        if (formatted === 'Error') {
          setCalcPrevValue(null);
          setCalcOp(null);
          setCalcExpression('');
          setCalcResetNext(true);
          return;
        }
        setCalcPrevValue(parseFloat(formatted));
        setCalcExpression(`${formatted} ${nextOp}`);
      } else {
        setCalcPrevValue(current);
        setCalcExpression(`${calcDisplay} ${nextOp}`);
      }
      setCalcOp(nextOp);
      setCalcResetNext(true);
    },
    [calcDisplay, calcPrevValue, calcOp, calcResetNext]
  );

  const handleCalcEquals = useCallback(() => {
    if (calcPrevValue === null || !calcOp) return;
    const current = parseFloat(calcDisplay);
    if (Number.isNaN(current)) return;
    const res = compute(calcPrevValue, current, calcOp);
    const formatted = formatNum(res);
    const exprText = `${calcPrevValue} ${calcOp} ${current}`;
    setCalcExpression(`${exprText} =`);
    setCalcDisplay(formatted);
    if (formatted !== 'Error') {
      setCalcHistory((prev) => [{ expr: exprText, result: formatted }, ...prev].slice(0, 12));
    }
    setCalcPrevValue(null);
    setCalcOp(null);
    setCalcResetNext(true);
  }, [calcDisplay, calcPrevValue, calcOp]);

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcPrevValue(null);
    setCalcOp(null);
    setCalcExpression('');
    setCalcResetNext(false);
  };

  const handleCalcBackspace = useCallback(() => {
    if (calcResetNext || calcDisplay === 'Error') {
      setCalcDisplay('0');
      setCalcResetNext(false);
      return;
    }
    if (calcDisplay.length <= 1 || (calcDisplay.length === 2 && calcDisplay.startsWith('-'))) {
      setCalcDisplay('0');
    } else {
      setCalcDisplay(calcDisplay.slice(0, -1));
    }
  }, [calcDisplay, calcResetNext]);

  const handleCalcSign = () => {
    const val = parseFloat(calcDisplay);
    if (Number.isNaN(val) || val === 0) return;
    setCalcDisplay(formatNum(-val));
  };

  const handleCalcPercent = () => {
    const val = parseFloat(calcDisplay);
    if (Number.isNaN(val)) return;
    if (calcPrevValue !== null && (calcOp === '+' || calcOp === '−')) {
      setCalcDisplay(formatNum((calcPrevValue * val) / 100));
    } else {
      setCalcDisplay(formatNum(val / 100));
    }
  };

  // Keyboard support while Calculator tab is active
  useEffect(() => {
    if (!isOpen || activeTool !== 'calculator') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        handleCalcDigit(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleCalcOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleCalcOperator('−');
      } else if (e.key === '*') {
        e.preventDefault();
        handleCalcOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleCalcOperator('÷');
      } else if (e.key === '%') {
        e.preventDefault();
        handleCalcPercent();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalcEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleCalcBackspace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, activeTool, handleCalcDigit, handleCalcOperator, handleCalcEquals, handleCalcBackspace]);

  // ── Expenses Handlers ─────────────────────────────────────────
  const currentMonthPrefix = todayIso.slice(0, 7);
  const monthlyExpenseTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date.startsWith(currentMonthPrefix))
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, currentMonthPrefix]
  );

  const allExpenseTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => expFilterCat === 'All' || e.category === expFilterCat)
      .slice()
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
      });
  }, [expenses, expFilterCat]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const title = expTitle.trim();
    const numeric = parseFloat(expAmount);
    if (!title) {
      setExpError('Enter an expense description.');
      return;
    }
    if (Number.isNaN(numeric) || numeric <= 0) {
      setExpError('Enter a valid amount greater than zero.');
      return;
    }
    const entry: HubExpenseEntry = {
      id: `exp_${Date.now()}`,
      title,
      amount: numeric,
      category: expCategory,
      date: expDate || todayIso,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [entry, ...prev]);
    setExpTitle('');
    setExpAmount('');
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Gate: Only render for creator, store, artisan, or errands stalls
  if (eligibleRoles.length === 0) return null;

  const upcomingEventsCount = events.filter((ev) => !ev.completed && ev.date >= todayIso).length;

  const openTool = (tool: ToolTab) => {
    setActiveTool(tool);
    setIsOpen(true);
  };

  return (
    <>
      {/* Round Floating Bubble in Hub */}
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            setActiveTool('launcher');
            setIsOpen(true);
          }
        }}
        aria-label={isOpen ? 'Close workspace tools drawer' : 'Open workspace tools drawer'}
        aria-expanded={isOpen}
        title="Business & Creator Tools"
        className="fixed bottom-24 md:bottom-10 right-4 md:right-[max(1.5rem,calc(50%-38rem))] z-30 w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white flex items-center justify-center shadow-xl shadow-purple-600/35 border border-white/20 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <div
          className={`transition-transform duration-200 flex items-center justify-center ${
            isOpen ? 'rotate-90 scale-95' : 'rotate-0'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
        </div>
      </button>

      {/* Rolled-Open Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace Tools Drawer"
            className="w-full sm:max-w-lg bg-white dark:bg-[#120924] text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-purple-900/40 max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
          >
            {/* Drag Handle Affordance */}
            <div className="pt-2.5 pb-1 shrink-0 sm:hidden">
              <div className="w-10 h-1.5 bg-slate-300 dark:bg-purple-800/60 rounded-full mx-auto" />
            </div>

            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {activeTool !== 'launcher' && (
                  <button
                    type="button"
                    onClick={() => setActiveTool('launcher')}
                    className="min-h-[44px] min-w-[44px] -ml-2 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors shrink-0"
                    aria-label="Back to tools drawer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display truncate">
                    {activeTool === 'launcher'
                      ? 'Workspace Drawer'
                      : activeTool === 'notes'
                      ? 'Notes'
                      : activeTool === 'calendar'
                      ? 'Calendar'
                      : activeTool === 'calculator'
                      ? 'Calculator'
                      : 'Expenses Log'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {eligibleRoles.join(' · ')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors shrink-0"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Tool Switcher Bar (shown once inside a tool) */}
            {activeTool !== 'launcher' && (
              <div className="px-4 py-2 border-b border-slate-100 dark:border-purple-900/30 bg-slate-50/70 dark:bg-black/30 shrink-0">
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-neutral-900 rounded-xl">
                  {(
                    [
                      { id: 'notes', label: 'Notes', icon: StickyNote },
                      { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
                      { id: 'calculator', label: 'Calc', icon: CalculatorIcon },
                      { id: 'expenses', label: 'Expenses', icon: Receipt },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTool === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTool(tab.id)}
                        className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white dark:bg-[#1e1538] text-purple-600 dark:text-purple-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* ─── STAGE 1: ROLLED-OPEN LAUNCHER DRAWER ─── */}
              {activeTool === 'launcher' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => openTool('notes')}
                      className="min-h-[112px] p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40 hover:border-purple-500/60 text-left flex flex-col justify-between transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <StickyNote className="w-5 h-5" />
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Notes</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                          {notes.length === 0 ? 'Quick memos' : `${notes.length} saved`}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openTool('calendar')}
                      className="min-h-[112px] p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40 hover:border-purple-500/60 text-left flex flex-col justify-between transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Calendar</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                          {upcomingEventsCount === 0
                            ? 'Schedule tasks'
                            : `${upcomingEventsCount} upcoming`}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openTool('calculator')}
                      className="min-h-[112px] p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40 hover:border-purple-500/60 text-left flex flex-col justify-between transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <CalculatorIcon className="w-5 h-5" />
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Calculator</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                          {calcHistory.length > 0 ? `Last: ${calcHistory[0].result}` : 'Fast math'}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openTool('expenses')}
                      className="min-h-[112px] p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40 hover:border-purple-500/60 text-left flex flex-col justify-between transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Expenses Log</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 truncate">
                          {allExpenseTotal > 0
                            ? `${formatPrice(monthlyExpenseTotal, currency)} this mo`
                            : 'Track daily spend'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── TOOL 1: NOTES ─── */}
              {activeTool === 'notes' && (
                <div className="space-y-4">
                  {isCreatingNote ? (
                    <form onSubmit={saveNote} className="space-y-3">
                      <input
                        type="text"
                        value={noteTitleDraft}
                        onChange={(e) => setNoteTitleDraft(e.target.value)}
                        placeholder="Note title (e.g. Stock restock, Client order)"
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <textarea
                        rows={7}
                        value={noteBodyDraft}
                        onChange={(e) => setNoteBodyDraft(e.target.value)}
                        placeholder="Write measurements, prices, client requests, or content ideas..."
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none leading-relaxed"
                      />
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {editingNoteId ? (
                          <button
                            type="button"
                            onClick={() => deleteNote(editingNoteId)}
                            className="min-h-[44px] px-4 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingNote(false);
                              setEditingNoteId(null);
                            }}
                            className="min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="min-h-[44px] px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save Note</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={noteSearch}
                            onChange={(e) => setNoteSearch(e.target.value)}
                            placeholder="Search notes..."
                            className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-neutral-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={startNewNote}
                          className="min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>New Note</span>
                        </button>
                      </div>

                      {filteredNotes.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                          <StickyNote className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {noteSearch ? 'No matching notes' : 'No notes yet'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Save quick memos, measurements, stock lists, or content drafts.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                          {filteredNotes.map((note) => (
                            <div
                              key={note.id}
                              className="py-3 flex items-start justify-between gap-3 group"
                            >
                              <button
                                type="button"
                                onClick={() => openNoteEditor(note)}
                                className="flex-1 min-w-0 text-left py-1"
                              >
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {note.title}
                                </div>
                                {note.body && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                    {note.body}
                                  </p>
                                )}
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 tabular-nums">
                                  {note.pinned ? 'Pinned · ' : ''}
                                  {formatTimestampMeta(note.updatedAt)}
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => togglePinNote(note.id)}
                                  className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors ${
                                    note.pinned
                                      ? 'text-amber-500 bg-amber-500/10'
                                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                  }`}
                                  aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteNote(note.id)}
                                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                  aria-label="Delete note"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── TOOL 2: CALENDAR ─── */}
              {activeTool === 'calendar' && (
                <div className="space-y-4">
                  {/* Month Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCalMonthDate(
                            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                          )
                        }
                        className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-bold text-slate-900 dark:text-white px-2 tabular-nums">
                        {MONTH_NAMES[calMonthDate.getMonth()]} {calMonthDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCalMonthDate(
                            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                          )
                        }
                        className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-900"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                        setSelectedDateIso(todayIso);
                      }}
                      className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
                    >
                      Today
                    </button>
                  </div>

                  {/* Weekday Header & Day Grid */}
                  <div>
                    <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 pb-1.5">
                      {WEEKDAYS.map((wd) => (
                        <div key={wd}>{wd}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((cell, idx) => {
                        if (!cell.iso || cell.day === null) {
                          return <div key={`empty_${idx}`} className="h-11" />;
                        }
                        const isSelected = cell.iso === selectedDateIso;
                        const isToday = cell.iso === todayIso;
                        const dayEvents = eventsByDate.get(cell.iso) || [];
                        const hasOpenEvent = dayEvents.some((e) => !e.completed);
                        return (
                          <button
                            key={cell.iso}
                            type="button"
                            onClick={() => setSelectedDateIso(cell.iso!)}
                            className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs font-semibold tabular-nums transition-colors relative ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-sm'
                                : isToday
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                                : 'hover:bg-slate-100 dark:hover:bg-neutral-900 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span>{cell.day}</span>
                            {dayEvents.length > 0 && (
                              <span
                                className={`w-4 h-0.5 rounded-full mt-0.5 ${
                                  isSelected
                                    ? 'bg-white'
                                    : hasOpenEvent
                                    ? 'bg-purple-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Day Agenda */}
                  <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Schedule · {formatShortDate(selectedDateIso)}
                      </h4>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <form onSubmit={addCalendarEvent} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder="Add booking, delivery, or reminder..."
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={newEventTime}
                          onChange={(e) => setNewEventTime(e.target.value)}
                          className="min-h-[44px] px-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="submit"
                          className="min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    </form>

                    {selectedDayEvents.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                        No reminders scheduled for this day.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                        {selectedDayEvents.map((ev) => (
                          <div key={ev.id} className="py-2.5 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCalendarEvent(ev.id)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left min-h-[44px]"
                            >
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  ev.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {ev.completed && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className={`text-xs font-semibold truncate ${
                                    ev.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {ev.title}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
                                  <Clock className="w-3 h-3" />
                                  <span>{ev.time}</span>
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCalendarEvent(ev.id)}
                              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 shrink-0"
                              aria-label="Delete calendar item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TOOL 3: CALCULATOR ─── */}
              {activeTool === 'calculator' && (
                <div className="space-y-3">
                  {/* Display Panel */}
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#0b0518] border border-slate-200/80 dark:border-purple-900/40">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        type="button"
                        onClick={() => setShowCalcHistory((v) => !v)}
                        className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{showCalcHistory ? 'Hide History' : `History (${calcHistory.length})`}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCalcBackspace}
                        className="min-h-[36px] px-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 text-xs"
                        aria-label="Backspace"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400 min-h-[18px] truncate tabular-nums">
                      {calcExpression || ' '}
                    </div>
                    <div className="text-right text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight tabular-nums truncate mt-1">
                      {calcDisplay}
                    </div>
                  </div>

                  {showCalcHistory && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-2 max-h-40 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Recent Calculations</span>
                        {calcHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCalcHistory([])}
                            className="text-xs text-rose-500 font-medium"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {calcHistory.length === 0 ? (
                        <p className="text-xs text-slate-400">No calculations yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-200/60 dark:divide-neutral-800">
                          {calcHistory.map((h, i) => (
                            <button
                              key={`${h.expr}_${i}`}
                              type="button"
                              onClick={() => {
                                setCalcDisplay(h.result);
                                setCalcResetNext(true);
                                setShowCalcHistory(false);
                              }}
                              className="w-full py-1.5 flex items-center justify-between text-xs font-mono tabular-nums hover:text-purple-600 dark:hover:text-purple-400"
                            >
                              <span className="text-slate-500 truncate">{h.expr}</span>
                              <span className="font-bold text-slate-900 dark:text-white ml-2">= {h.result}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={handleCalcClear}
                      className="h-13 rounded-2xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-900 dark:text-white font-bold text-sm active:scale-95 transition-all"
                    >
                      AC
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcSign}
                      className="h-13 rounded-2xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-900 dark:text-white font-bold text-sm active:scale-95 transition-all"
                    >
                      ±
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcPercent}
                      className="h-13 rounded-2xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-900 dark:text-white font-bold text-sm active:scale-95 transition-all"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('÷')}
                      className={`h-13 rounded-2xl font-bold text-lg active:scale-95 transition-all ${
                        calcOp === '÷' && calcResetNext
                          ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                          : 'bg-purple-600/15 text-purple-700 dark:text-purple-300 hover:bg-purple-600/25'
                      }`}
                    >
                      ÷
                    </button>

                    {(['7', '8', '9'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleCalcDigit(d)}
                        className="h-13 rounded-2xl bg-slate-100 dark:bg-[#1a1133] hover:bg-slate-200 dark:hover:bg-[#241845] text-slate-900 dark:text-white font-bold text-lg tabular-nums active:scale-95 transition-all"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('×')}
                      className={`h-13 rounded-2xl font-bold text-lg active:scale-95 transition-all ${
                        calcOp === '×' && calcResetNext
                          ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                          : 'bg-purple-600/15 text-purple-700 dark:text-purple-300 hover:bg-purple-600/25'
                      }`}
                    >
                      ×
                    </button>

                    {(['4', '5', '6'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleCalcDigit(d)}
                        className="h-13 rounded-2xl bg-slate-100 dark:bg-[#1a1133] hover:bg-slate-200 dark:hover:bg-[#241845] text-slate-900 dark:text-white font-bold text-lg tabular-nums active:scale-95 transition-all"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('−')}
                      className={`h-13 rounded-2xl font-bold text-lg active:scale-95 transition-all ${
                        calcOp === '−' && calcResetNext
                          ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                          : 'bg-purple-600/15 text-purple-700 dark:text-purple-300 hover:bg-purple-600/25'
                      }`}
                    >
                      −
                    </button>

                    {(['1', '2', '3'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleCalcDigit(d)}
                        className="h-13 rounded-2xl bg-slate-100 dark:bg-[#1a1133] hover:bg-slate-200 dark:hover:bg-[#241845] text-slate-900 dark:text-white font-bold text-lg tabular-nums active:scale-95 transition-all"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('+')}
                      className={`h-13 rounded-2xl font-bold text-lg active:scale-95 transition-all ${
                        calcOp === '+' && calcResetNext
                          ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                          : 'bg-purple-600/15 text-purple-700 dark:text-purple-300 hover:bg-purple-600/25'
                      }`}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCalcDigit('0')}
                      className="col-span-2 h-13 rounded-2xl bg-slate-100 dark:bg-[#1a1133] hover:bg-slate-200 dark:hover:bg-[#241845] text-slate-900 dark:text-white font-bold text-lg tabular-nums active:scale-95 transition-all"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('.')}
                      className="h-13 rounded-2xl bg-slate-100 dark:bg-[#1a1133] hover:bg-slate-200 dark:hover:bg-[#241845] text-slate-900 dark:text-white font-bold text-lg active:scale-95 transition-all"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcEquals}
                      className="h-13 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg active:scale-95 transition-all shadow-md shadow-purple-600/25"
                    >
                      =
                    </button>
                  </div>
                </div>
              )}

              {/* ─── TOOL 4: EXPENSES LOG ─── */}
              {activeTool === 'expenses' && (
                <div className="space-y-4">
                  {/* Totals Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40">
                      <div className="text-xs text-slate-500 dark:text-slate-400">This Month</div>
                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums mt-0.5 truncate">
                        {formatPrice(monthlyExpenseTotal, currency)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1133] border border-slate-200/80 dark:border-purple-900/40">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Total Logged</div>
                      <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 tabular-nums mt-0.5 truncate">
                        {formatPrice(allExpenseTotal, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Log New Expense Form */}
                  <form
                    onSubmit={handleAddExpense}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#160e2c] border border-slate-200/80 dark:border-purple-900/40 space-y-2.5"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Log Expense</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        placeholder="Item or cost (e.g. Packaging bags)"
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                          {CURRENCY_SYMBOLS[currency]}
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full min-h-[44px] pl-7 pr-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {expError && <p className="text-xs text-rose-500 font-medium">{expError}</p>}
                    <button
                      type="submit"
                      className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Expense</span>
                    </button>
                  </form>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {(['All', ...EXPENSE_CATEGORIES] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExpFilterCat(cat)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          expFilterCat === cat
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Expenses List */}
                  {filteredExpenses.length === 0 ? (
                    <div className="py-8 text-center space-y-1.5">
                      <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No expenses recorded
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Track supplies, delivery transport, packaging, and daily costs.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                      {filteredExpenses.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                              {item.category} · {formatShortDate(item.date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                              {formatPrice(item.amount, currency)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteExpense(item.id)}
                              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                              aria-label="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
