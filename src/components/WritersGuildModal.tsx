import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Heart,
  MessageSquare,
  Coins,
  Users,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Share2,
  Lock,
  Unlock,
  AlertCircle,
  Coffee,
  Bookmark,
  BookMarked,
  Send,
  Eye,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AfriBook, BookChapter, GroupReadSession } from '../types';

export const WritersGuildModal: React.FC = () => {
  const {
    isWritersModalOpen,
    setIsWritersModalOpen,
    afriBooks,
    activeReadingBook,
    setActiveReadingBook,
    activeReadingChapterIndex,
    setActiveReadingChapterIndex,
    submitNewBook,
    addChapterToBook,
    commentOnChapter,
    tipBookAuthor,
    buyPaidBook,
    groupReadSessions,
    activeGroupReadSession,
    setActiveGroupReadSession,
    startGroupReadSession,
    sendGroupReadMessage,
    updateGroupReadProgress,
    currentUser,
    wallet,
    formatPrice,
    chats,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'browse' | 'reader' | 'submit' | 'group_read'>('browse');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tipModalBook, setTipModalBook] = useState<AfriBook | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(500);
  const [chapterCommentInput, setChapterCommentInput] = useState('');
  const [groupReadMsgInput, setGroupReadMsgInput] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Submit New Book State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthorName, setNewAuthorName] = useState(currentUser.fullName || 'Author');
  const [newGenre, setNewGenre] = useState('Afro-Futurism & Mystery');
  const [newCoverUrl, setNewCoverUrl] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newPricingType, setNewPricingType] = useState<'free' | 'paid'>('paid');
  const [newPrice, setNewPrice] = useState('1500');
  const [firstChapterTitle, setFirstChapterTitle] = useState('Chapter 1: The Beginning');
  const [firstChapterContent, setFirstChapterContent] = useState('');
  const [antiAiPledged, setAntiAiPledged] = useState(false);

  // Group Read Invite Selector
  const [showBuddyPicker, setShowBuddyPicker] = useState<AfriBook | null>(null);

  if (!isWritersModalOpen) return null;

  const genres = [
    'All',
    'Afro-Futurism & Mystery',
    'Drama & African Commerce',
    'Lagos Romance & Life',
    'Folklore & Indigenous Epics',
    'Historical Fiction',
  ];

  const filteredBooks = afriBooks.filter((book) => {
    const matchesGenre = selectedGenre === 'All' || book.genre.includes(selectedGenre);
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const handleOpenReader = (book: AfriBook, chapterIndex: number = 0) => {
    setActiveReadingBook(book);
    setActiveReadingChapterIndex(chapterIndex);
    setActiveTab('reader');
  };

  const handleSendChapterComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReadingBook || !chapterCommentInput.trim()) return;
    const currentChapter = activeReadingBook.chapters[activeReadingChapterIndex];
    if (!currentChapter) return;

    commentOnChapter(activeReadingBook.id, currentChapter.id, chapterCommentInput.trim());
    setChapterCommentInput('');
    setFeedbackToast('💬 Comment posted on this chapter!');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleTipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipModalBook || tipAmount <= 0) return;
    const res = tipBookAuthor(tipModalBook.id, tipAmount);
    setTipModalBook(null);
    setFeedbackToast(res.message);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleBuyBookSubmit = (book: AfriBook) => {
    const res = buyPaidBook(book.id);
    setFeedbackToast(res.message);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handlePublishBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a book title.');
      return;
    }
    if (!antiAiPledged) {
      alert('You must sign the Anti-AI Human Author Pledge. AI-generated books are strictly prohibited on AfriChat.');
      return;
    }
    if (!firstChapterContent.trim()) {
      alert('Please write the text for Chapter 1.');
      return;
    }

    const priceNum = newPricingType === 'paid' ? parseInt(newPrice, 10) || 1500 : 0;

    const res = submitNewBook({
      title: newTitle.trim(),
      authorId: currentUser.id,
      authorName: newAuthorName.trim(),
      authorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverUrl: newCoverUrl.trim(),
      genre: newGenre,
      synopsis: newSynopsis.trim() || 'A compelling human-written African story.',
      isHumanWrittenCertified: true,
      pricingType: newPricingType,
      price: priceNum,
      currency: 'NGN',
      chapters: [
        {
          id: `chap_init_${Date.now()}`,
          chapterNumber: 1,
          title: firstChapterTitle.trim() || 'Chapter 1',
          content: firstChapterContent.trim(),
          readTimeMinutes: Math.max(3, Math.round(firstChapterContent.split(' ').length / 150)),
          comments: [],
        },
      ],
    });

    setFeedbackToast(res.message);
    setTimeout(() => setFeedbackToast(null), 3000);
    setActiveTab('browse');
    setNewTitle('');
    setFirstChapterContent('');
    setAntiAiPledged(false);
  };

  const handleStartBuddyRead = (book: AfriBook, buddyName: string, buddyAvatar?: string) => {
    setShowBuddyPicker(null);
    const session = startGroupReadSession(book.id, buddyName, buddyAvatar);
    setActiveGroupReadSession(session);
    setActiveTab('group_read');
    setFeedbackToast(`📖 Buddy reading room started with ${buddyName}! Both can read together.`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleSendBuddyMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupReadSession || !groupReadMsgInput.trim()) return;
    sendGroupReadMessage(activeGroupReadSession.id, groupReadMsgInput.trim());
    setGroupReadMsgInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#121020] text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-purple-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-purple-900/40 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold font-display leading-tight">
                  AfriBooks Writers Guild
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono font-bold px-1.5 py-0.2 rounded-full">
                  No AI Allowed
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                100% Human-Written Stories · Chapters, Tips & Buddy Group Reading
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWritersModalOpen(false)}
            className="p-1.5 text-purple-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-neutral-900/70 border-b border-slate-200 dark:border-neutral-800 text-xs font-bold shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === 'browse'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Browse Books
            </button>
            {activeReadingBook && (
              <button
                onClick={() => setActiveTab('reader')}
                className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 ${
                  activeTab === 'reader'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Reading</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('group_read')}
              className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 ${
                activeTab === 'group_read'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Buddy Read</span>
              {groupReadSessions.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          <button
            onClick={() => setActiveTab('submit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'submit'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Book</span>
          </button>
        </div>

        {/* Toast Feedback */}
        {feedbackToast && (
          <div className="m-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BROWSE BOOKS */}
          {activeTab === 'browse' && (
            <div className="space-y-3.5">
              {/* Anti-AI Guarantee Banner */}
              <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 rounded-2xl border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="block leading-tight">100% Human-Written • Anti-AI Certified</span>
                    <span className="text-[10px] text-emerald-200/80 font-normal">
                      Every manuscript is vetted. Zero algorithmic text or AI generation allowed.
                    </span>
                  </div>
                </div>
              </div>

              {/* Genre Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(g)}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      selectedGenre === g
                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Books List */}
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 flex gap-3 hover:border-purple-500/40 transition-colors"
                  >
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-20 h-28 rounded-xl object-cover shadow-md shrink-0 cursor-pointer"
                      onClick={() => handleOpenReader(book)}
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            {book.genre}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Human</span>
                          </span>
                        </div>

                        <h3
                          onClick={() => handleOpenReader(book)}
                          className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 hover:text-purple-600 cursor-pointer mt-0.5"
                        >
                          {book.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-1">
                          By <span className="font-semibold text-slate-700 dark:text-slate-300">{book.authorName}</span>
                        </p>

                        <p className="text-[11px] text-slate-600 dark:text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                          {book.synopsis}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-neutral-800 text-[11px]">
                        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                          <span>{book.chapters.length} chap(s)</span>
                          <span>·</span>
                          <span className="text-amber-500 font-bold">₦{book.tipsTotalAmount.toLocaleString()} tipped</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Tip Button */}
                          <button
                            type="button"
                            onClick={() => setTipModalBook(book)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            title="Tip author"
                          >
                            <Coffee className="w-3.5 h-3.5" />
                          </button>

                          {/* Buddy Group Read Button */}
                          <button
                            type="button"
                            onClick={() => setShowBuddyPicker(book)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                            title="Buddy-read with a friend (If one pays, both can read!)"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          {/* Read / Buy Button */}
                          {book.pricingType === 'paid' && !book.isPurchasedByMe ? (
                            <button
                              type="button"
                              onClick={() => handleBuyBookSubmit(book)}
                              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                            >
                              Buy ₦{book.price.toLocaleString()}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReader(book)}
                              className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-200"
                            >
                              Read Book
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: READER & CHAPTER MODE */}
          {activeTab === 'reader' && activeReadingBook && (
            <div className="space-y-4">
              {/* Top Navigation */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('browse')}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Library</span>
                </button>

                <div className="text-center min-w-0 px-2">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {activeReadingBook.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Chapter {activeReadingChapterIndex + 1} of {activeReadingBook.chapters.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTipModalBook(activeReadingBook)}
                    className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    <Coffee className="w-3 h-3" />
                    <span>Tip</span>
                  </button>
                  <button
                    onClick={() => setShowBuddyPicker(activeReadingBook)}
                    className="px-2 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>Buddy</span>
                  </button>
                </div>
              </div>

              {/* Chapter Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {activeReadingBook.chapters.map((chap, idx) => (
                  <button
                    key={chap.id}
                    onClick={() => setActiveReadingChapterIndex(idx)}
                    className={`px-3 py-1 text-xs rounded-xl whitespace-nowrap font-medium transition-colors ${
                      activeReadingChapterIndex === idx
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ch. {chap.chapterNumber}
                  </button>
                ))}
              </div>

              {/* Current Chapter Content */}
              {(() => {
                const chapter = activeReadingBook.chapters[activeReadingChapterIndex];
                if (!chapter) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No chapter found.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/30 dark:bg-neutral-900/40 rounded-3xl border border-amber-500/20">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-500/10">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-display">
                          {chapter.title}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">
                          {chapter.readTimeMinutes} min read
                        </span>
                      </div>

                      {/* Prose Typography */}
                      <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-sans whitespace-pre-line space-y-3">
                        {chapter.content}
                      </div>

                      {/* Chapter End Author Card */}
                      <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={activeReadingBook.authorAvatar}
                            alt={activeReadingBook.authorName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              Written by {activeReadingBook.authorName}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-medium">
                              100% Human-Crafted • Anti-AI Pledge
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setTipModalBook(activeReadingBook)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Coffee className="w-3.5 h-3.5" />
                          <span>Tip Author</span>
                        </button>
                      </div>
                    </div>

                    {/* Chapter Comments Section */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                          <span>Chapter Reader Reactions ({chapter.comments.length})</span>
                        </h4>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {chapter.comments.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-2">
                            Be the first reader to comment on this chapter!
                          </p>
                        ) : (
                          chapter.comments.map((comm) => (
                            <div
                              key={comm.id}
                              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                                  {comm.readerName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {comm.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                                {comm.comment}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      <form onSubmit={handleSendChapterComment} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={chapterCommentInput}
                          onChange={(e) => setChapterCommentInput(e.target.value)}
                          placeholder="Drop your thoughts on this chapter..."
                          className="flex-1 px-3 py-2 bg-slate-100 dark:bg-neutral-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0"
                        >
                          Post
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: BUDDY GROUP READ ROOM */}
          {activeTab === 'group_read' && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 rounded-2xl border border-indigo-500/30 text-xs text-indigo-200">
                <div className="font-bold flex items-center gap-1.5 text-white">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Buddy Read: 2 Friends Read Together If One Pays</span>
                </div>
                <p className="text-[11px] text-indigo-300 mt-1">
                  Enjoy synchronized chapter reading, live plot commentary, and buddy progression tracker with zero extra cost.
                </p>
              </div>

              {activeGroupReadSession ? (
                <div className="space-y-3">
                  {/* Reading Session Status Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeGroupReadSession.bookCover}
                        alt={activeGroupReadSession.bookTitle}
                        className="w-12 h-16 rounded-xl object-cover shadow-sm"
                      />
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase">
                          Live Co-Reading Room
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {activeGroupReadSession.bookTitle}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <span>Reading with:</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {activeGroupReadSession.buddyUserName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const targetBook = afriBooks.find((b) => b.id === activeGroupReadSession.bookId) || afriBooks[0];
                        if (targetBook) handleOpenReader(targetBook, activeGroupReadSession.currentChapter - 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700"
                    >
                      Read Now
                    </button>
                  </div>

                  {/* Synchronized Chapter Progress Bar */}
                  <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-neutral-900/40 border border-purple-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {currentUser.fullName.split(' ')[0]}: Ch. {activeGroupReadSession.currentChapter}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{activeGroupReadSession.buddyUserName.split(' ')[0]} in sync</span>
                    </div>
                  </div>

                  {/* Shared Buddy Discussion Chat */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block px-1">
                      In-Book Discussion Yarn
                    </span>

                    <div className="p-3 bg-slate-50 dark:bg-black/60 rounded-2xl border border-slate-200 dark:border-neutral-800 space-y-2 max-h-56 overflow-y-auto">
                      {activeGroupReadSession.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-2xl text-xs max-w-[85%] ${
                            m.senderName === currentUser.fullName
                              ? 'ml-auto bg-purple-600 text-white'
                              : 'mr-auto bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          <span className="text-[10px] font-bold block opacity-75">
                            {m.senderName} · {m.timestamp}
                          </span>
                          <p className="mt-0.5 leading-relaxed">{m.text}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendBuddyMsg} className="flex gap-2">
                      <input
                        type="text"
                        value={groupReadMsgInput}
                        onChange={(e) => setGroupReadMsgInput(e.target.value)}
                        placeholder="React to this chapter with your reading buddy..."
                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-neutral-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    No Active Buddy Reading Room
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto">
                    Pick any book from the library and invite a friend to read together chapter by chapter.
                  </p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Select a Book to Buddy Read
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUBMIT NEW BOOK IN CHAPTERS */}
          {activeTab === 'submit' && (
            <form onSubmit={handlePublishBook} className="space-y-3.5">
              {/* Anti-AI Pledge Callout */}
              <div className="p-3.5 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-indigo-950/40 rounded-2xl border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <Award className="w-4 h-4" />
                  <span>Strict Anti-AI Authors Policy</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  AfriBooks is reserved exclusively for authentic human imagination, African dialects, and genuine storytelling. No ChatGPT or AI-generated books are permitted.
                </p>
                <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiAiPledged}
                    onChange={(e) => setAntiAiPledged(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    required
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    I solemnly pledge this book is 100% human-written.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Shadows of the Niger, Lagos Solstice"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Author / Pen Name
                  </label>
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Genre
                  </label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Afro-Futurism & Mystery">Afro-Futurism & Mystery</option>
                    <option value="Drama & African Commerce">Drama & African Commerce</option>
                    <option value="Lagos Romance & Life">Lagos Romance & Life</option>
                    <option value="Folklore & Indigenous Epics">Folklore & Indigenous Epics</option>
                    <option value="Historical Fiction">Historical Fiction</option>
                    <option value="Poetry & Spoken Word">Poetry & Spoken Word</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pricing Model
                  </label>
                  <select
                    value={newPricingType}
                    onChange={(e) => setNewPricingType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="free">Free to Read (Fans Tip You)</option>
                    <option value="paid">Paid Book Purchase</option>
                  </select>
                </div>

                {newPricingType === 'paid' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Price (NGN)
                    </label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      min={500}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Synopsis / Blurb
                </label>
                <textarea
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  rows={2}
                  placeholder="Tell readers what your book is about..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800">
                <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                  Chapter 1: Opening Chapter
                </label>
                <input
                  type="text"
                  value={firstChapterTitle}
                  onChange={(e) => setFirstChapterTitle(e.target.value)}
                  placeholder="Chapter Title e.g. Chapter 1: The Arrival"
                  className="w-full px-3 py-2 mb-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                />
                <textarea
                  value={firstChapterContent}
                  onChange={(e) => setFirstChapterContent(e.target.value)}
                  rows={6}
                  placeholder="Write your opening chapter text here..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Publish Book to African Writers Guild</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Tip Author Modal Overlay */}
      {tipModalBook && (
        <div
          onClick={() => setTipModalBook(null)}
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#1a172e] rounded-3xl p-5 shadow-2xl border border-amber-500/30 text-slate-900 dark:text-white space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Tip the Author</h4>
                  <p className="text-[10px] text-slate-400">100% direct to author's AfriChat wallet</p>
                </div>
              </div>
              <button onClick={() => setTipModalBook(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Supporting <span className="font-bold text-amber-500">{tipModalBook.authorName}</span> for "{tipModalBook.title}".
            </p>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {[200, 500, 1000, 2500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(amt)}
                  className={`py-2 rounded-xl font-bold border transition-colors ${
                    tipAmount === amt
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ₦{amt}
                </button>
              ))}
            </div>

            <form onSubmit={handleTipSubmit} className="space-y-3">
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(Math.max(50, Number(e.target.value)))}
                min={50}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white"
              />

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-2xl shadow-md"
              >
                Confirm ₦{tipAmount.toLocaleString()} Tip
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Buddy Reader Invite Picker Overlay */}
      {showBuddyPicker && (
        <div
          onClick={() => setShowBuddyPicker(null)}
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#1a172e] rounded-3xl p-5 shadow-2xl border border-indigo-500/30 text-slate-900 dark:text-white space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Pick a Reading Buddy</h4>
                  <p className="text-[10px] text-slate-400">If one pays, both can read together</p>
                </div>
              </div>
              <button onClick={() => setShowBuddyPicker(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select a friend to invite into your co-reading room for "{showBuddyPicker.title}":
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {chats.slice(0, 5).map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleStartBuddyRead(showBuddyPicker, chat.name, chat.avatar)}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-indigo-500 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {chat.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{chat.location || 'AfriChat Contact'}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-indigo-500 flex items-center gap-0.5">
                    <span>Invite</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
