import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Play,
  Video,
  FileText,
  Clock,
  Star,
  Users,
  Award,
  BadgeCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Lock,
  Unlock,
  CreditCard,
  Wallet,
  Layers,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Course, CourseCategory, CourseLesson } from '../types';

export const TutorCoursesModal: React.FC = () => {
  const {
    isTutorModalOpen,
    setIsTutorModalOpen,
    tutorProfile,
    courses,
    activeLearningCourse,
    setActiveLearningCourse,
    registerAsTutor,
    upgradeTutorUnlimited,
    publishCourse,
    enrollInCourse,
    wallet,
    currentUser,
    formatPrice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'browse' | 'classroom' | 'studio' | 'register'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Classroom Player State
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  // Tutor Registration Form State (5k one-time fee + 4k blue check condition)
  const [tutorRegName, setTutorRegName] = useState(currentUser.fullName || '');
  const [tutorBio, setTutorBio] = useState('Certified professional instructor passionate about practical African skills.');
  const [tutorCategory, setTutorCategory] = useState<CourseCategory>('tech_coding');
  const [payBlueCheck, setPayBlueCheck] = useState(true);
  const [regPaymentMethod, setRegPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [isRegistering, setIsRegistering] = useState(false);

  // New Course Creation Form State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CourseCategory>('tech_coding');
  const [newPrice, setNewPrice] = useState('8000');
  const [newThumbnail, setNewThumbnail] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80');
  const [newDescription, setNewDescription] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('30');
  const [newLessonNotes, setNewLessonNotes] = useState('');
  const [lessonsList, setLessonsList] = useState<CourseLesson[]>([
    {
      id: 'lsn_init_1',
      title: 'Module 1: Orientation & Foundations',
      durationMinutes: 35,
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      notes: 'Course syllabus breakdown, software setups, and practical expectations.',
      isPreview: true,
    },
  ]);

  if (!isTutorModalOpen) return null;

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Courses' },
    { id: 'tech_coding', label: 'Tech & Coding' },
    { id: 'business_finance', label: 'Business & Trade' },
    { id: 'languages_culture', label: 'African Languages' },
    { id: 'creative_design', label: 'Creative & Audio' },
    { id: 'trades_engineering', label: 'Engineering & Trades' },
    { id: 'academics_jamb', label: 'JAMB / WAEC' },
  ];

  const filteredCourses = courses.filter((c: Course) => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tutorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorRegName.trim()) {
      alert('Please enter your tutor or academy name.');
      return;
    }

    setIsRegistering(true);
    setTimeout(() => {
      setIsRegistering(false);
      const res = registerAsTutor({
        tutorName: tutorRegName.trim(),
        bio: tutorBio.trim(),
        category: tutorCategory,
        payVerificationBlueCheck: payBlueCheck,
        paymentMethod: regPaymentMethod,
      });

      if (res.success) {
        showToast(res.message);
        setActiveTab('studio');
      } else {
        alert(res.message);
      }
    }, 600);
  };

  const handleUpgradeUnlimited = (method: 'wallet' | 'paystack') => {
    const res = upgradeTutorUnlimited(method);
    if (res.success) {
      showToast(res.message);
    } else {
      alert(res.message);
    }
  };

  const handleAddLessonItem = () => {
    if (!newLessonTitle.trim()) {
      alert('Please enter a lesson title.');
      return;
    }

    const item: CourseLesson = {
      id: `lsn_${Date.now()}`,
      title: newLessonTitle.trim(),
      durationMinutes: Number(newLessonDuration) || 30,
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      notes: newLessonNotes.trim() || 'Comprehensive course notes and practical walkthrough instructions.',
      isPreview: lessonsList.length === 0,
    };

    setLessonsList([...lessonsList, item]);
    setNewLessonTitle('');
    setNewLessonNotes('');
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter course title.');
      return;
    }
    if (lessonsList.length === 0) {
      alert('Please add at least 1 lesson module.');
      return;
    }

    const totalMinutes = lessonsList.reduce((acc: number, l: CourseLesson) => acc + l.durationMinutes, 0);
    const hours = Math.round((totalMinutes / 60) * 10) / 10;

    const res = publishCourse({
      title: newTitle.trim(),
      description: newDescription.trim() || 'Master practical skills with certified African industry mentorship.',
      category: newCategory,
      price: Number(newPrice) || 5000,
      currency: 'NGN',
      thumbnailUrl: newThumbnail,
      lessonsCount: lessonsList.length,
      totalDurationHours: hours,
      lessons: lessonsList,
    });

    if (res.success) {
      showToast(res.message);
      setShowAddCourse(false);
      setNewTitle('');
      setNewDescription('');
    } else {
      alert(res.message);
    }
  };

  const handleEnrollClick = (course: Course) => {
    if (course.isEnrolledByMe) {
      setActiveLearningCourse(course);
      setActiveTab('classroom');
      return;
    }

    const res = enrollInCourse(course.id, 'wallet');
    if (res.success) {
      showToast(res.message);
      setActiveLearningCourse(course);
      setActiveTab('classroom');
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#121124] text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-indigo-900/40 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-indigo-900/40 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold font-display leading-tight">
                  AfriCourses & Tutor Academy
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/40 font-mono font-bold px-1.5 py-0.2 rounded-full">
                  Skill Hub
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80">
                Learn high-demand African skills or register as a certified tutor to sell courses
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTutorModalOpen(false)}
            className="p-1.5 text-blue-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toast */}
        {feedbackToast && (
          <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 pt-3 border-b border-slate-200 dark:border-indigo-900/30 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'browse'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Courses</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classroom')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'classroom'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>My Classroom</span>
            {courses.filter((c: Course) => c.isEnrolledByMe).length > 0 && (
              <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-mono">
                {courses.filter((c: Course) => c.isEnrolledByMe).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (tutorProfile.isRegisteredTutor) {
                setActiveTab('studio');
              } else {
                setActiveTab('register');
              }
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'studio' || activeTab === 'register'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{tutorProfile.isRegisteredTutor ? 'Tutor Studio' : 'Become a Tutor'}</span>
            {tutorProfile.hasBlueCheck && (
              <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500/20" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BROWSE COURSES */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, tutors, coding, languages..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Tutor Onboarding Callout Banner */}
              {!tutorProfile.isRegisteredTutor && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-950/40 to-blue-950/40 border border-purple-500/30 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>Teach & Earn on AfriChat</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Register as a certified tutor for ₦5k + ₦4k blue check. Publish up to 10 courses or unlimited for ₦20k/mo!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 shadow-md transition-all active:scale-95"
                  >
                    Get Started
                  </button>
                </div>
              )}

              {/* Course Cards Grid */}
              <div className="space-y-3.5">
                {filteredCourses.map((course: Course) => (
                  <div
                    key={course.id}
                    className="p-3.5 rounded-3xl bg-slate-50 dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 hover:border-blue-500/40 transition-all space-y-3"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-200 dark:bg-neutral-800">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono text-[9px] font-bold">
                          {course.totalDurationHours}h
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                            {course.category.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{course.rating.toFixed(1)}</span>
                            <span className="text-slate-400 text-[10px]">({course.reviewsCount})</span>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight line-clamp-2">
                          {course.title}
                        </h3>

                        {/* Tutor Byline */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <img
                            src={course.tutorAvatar}
                            alt={course.tutorName}
                            className="w-4 h-4 rounded-full object-cover ring-1 ring-blue-500"
                          />
                          <span className="text-xs text-slate-600 dark:text-neutral-300 font-medium truncate">
                            {course.tutorName}
                          </span>
                          {course.tutorIsBlueVerified && (
                            <span title="Verified Certified Tutor"><BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" /></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-neutral-300 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-neutral-800 text-xs">
                      <div className="flex items-center gap-3 text-slate-500 dark:text-neutral-400 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" />
                          <span>{course.lessonsCount} lessons</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{course.enrolledStudentsCount} students</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          ₦{course.price.toLocaleString()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleEnrollClick(course)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-transform active:scale-95 ${
                            course.isEnrolledByMe
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {course.isEnrolledByMe ? (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Enroll Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CLASSROOM PLAYER */}
          {activeTab === 'classroom' && (
            <div className="space-y-4">
              {(() => {
                const enrolledList = courses.filter((c: Course) => c.isEnrolledByMe);
                const currentCourse = activeLearningCourse || enrolledList[0];

                if (!currentCourse) {
                  return (
                    <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        No Courses Enrolled Yet
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto">
                        Enroll in practical skills taught by top certified African mentors with escrow learner protection.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('browse')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs"
                      >
                        Explore Academy Courses
                      </button>
                    </div>
                  );
                }

                const currentLesson = currentCourse.lessons[activeLessonIndex] || currentCourse.lessons[0];

                return (
                  <div className="space-y-4">
                    {/* Course Header */}
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                          Active Classroom · {currentCourse.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lifetime Access</span>
                        </span>
                      </div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                        {currentCourse.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 mt-1">
                        <span>Instructor: <strong className="text-slate-800 dark:text-white">{currentCourse.tutorName}</strong></span>
                        <span>·</span>
                        <span>{currentCourse.lessonsCount} Modules</span>
                      </div>
                    </div>

                    {/* Video Player */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-black aspect-video flex flex-col justify-center items-center relative shadow-lg">
                      <video
                        src={currentLesson?.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                        controls
                        className="w-full h-full object-contain"
                        poster={currentCourse.thumbnailUrl}
                      />
                    </div>

                    {/* Active Lesson Details */}
                    {currentLesson && (
                      <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-blue-950 dark:text-blue-200">
                            {currentLesson.title}
                          </h4>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                            {currentLesson.durationMinutes} mins
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                          {currentLesson.notes}
                        </p>
                      </div>
                    )}

                    {/* Syllabus Accordion */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                        Course Syllabus & Modules
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden bg-slate-50 dark:bg-neutral-900/50">
                        {currentCourse.lessons.map((lesson: CourseLesson, idx: number) => (
                          <div
                            key={lesson.id}
                            onClick={() => setActiveLessonIndex(idx)}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              activeLessonIndex === idx
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                                  activeLessonIndex === idx
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-200 dark:bg-neutral-800 text-slate-500'
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <span className="text-xs truncate">{lesson.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                              {lesson.durationMinutes}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: REGISTER AS TUTOR (₦5k + ₦4k Blue Check condition, 10 Limit) */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 text-white shadow-lg space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-amber-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Certified African Tutor Onboarding</h3>
                    <p className="text-[11px] text-blue-200">
                      Teach, mentor, and sell video courses & masterclasses to thousands
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/10 rounded-2xl space-y-1.5 text-xs mt-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span>One-Time Tutor Registration Fee:</span>
                    <span className="font-bold text-amber-300">₦5,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verified Blue Checkmark Condition:</span>
                    <span className="font-bold text-blue-300">₦4,000</span>
                  </div>
                  <div className="pt-1.5 border-t border-white/20 flex items-center justify-between font-bold text-white text-sm">
                    <span>Total Starter Payout:</span>
                    <span className="text-emerald-300">₦{payBlueCheck ? '9,000' : '5,000'}</span>
                  </div>
                </div>

                <div className="text-[10px] text-blue-100 space-y-1 pt-1">
                  <p>• Base tier includes up to <strong>10 courses limit</strong> with full student video hosting.</p>
                  <p>• Upgrade anytime to <strong>Unlimited Pro Courses for ₦20,000/month</strong>.</p>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Tutor / Academy Name
                  </label>
                  <input
                    type="text"
                    value={tutorRegName}
                    onChange={(e) => setTutorRegName(e.target.value)}
                    placeholder="e.g. Dr. Ngozi Coding Academy"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Primary Teaching Category
                  </label>
                  <select
                    value={tutorCategory}
                    onChange={(e) => setTutorCategory(e.target.value as CourseCategory)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="tech_coding">Tech & Software Development</option>
                    <option value="business_finance">Business, Trade & Importation</option>
                    <option value="languages_culture">African Languages (Yoruba, Igbo, Swahili, Hausa)</option>
                    <option value="creative_design">Creative, Audio & Afrobeats Production</option>
                    <option value="trades_engineering">Solar Engineering & Vocational Trades</option>
                    <option value="academics_jamb">JAMB, WAEC & University Tutoring</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Tutor Bio & Qualifications
                  </label>
                  <textarea
                    value={tutorBio}
                    onChange={(e) => setTutorBio(e.target.value)}
                    rows={2}
                    placeholder="Brief background and expertise..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Blue Check Condition Toggle */}
                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">
                        Verified Blue Checkmark (₦4,000)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                        Mandatory verification condition for student trust and credibility
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={payBlueCheck}
                    onChange={(e) => setPayBlueCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Payment Channel */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegPaymentMethod('wallet')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        regPaymentMethod === 'wallet'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Wallet (₦{wallet.availableBalance.toLocaleString()})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegPaymentMethod('paystack')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        regPaymentMethod === 'paystack'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Paystack Instant</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>
                    Pay ₦{payBlueCheck ? '9,000' : '5,000'} & Activate Tutor Status
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: TUTOR STUDIO & MANAGEMENT */}
          {activeTab === 'studio' && tutorProfile.isRegisteredTutor && (
            <div className="space-y-4">
              {/* Tutor Profile Header Card */}
              <div className="p-4 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={tutorProfile.tutorName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {tutorProfile.tutorName}
                        </span>
                        <span title="Verified Blue Check"><BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20" /></span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {tutorProfile.category.replace('_', ' ')} · Registered {tutorProfile.registeredAt}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {tutorProfile.tier === 'unlimited_pro' ? 'Unlimited Pro' : 'Starter (10 Limit)'}
                  </span>
                </div>

                {/* Course Allowance & Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                  <div className="p-2 rounded-2xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                    <span className="text-slate-400 text-[9px] block">Courses</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {courses.filter((c: Course) => c.tutorId === currentUser.id).length} / {tutorProfile.tier === 'unlimited_pro' ? '∞' : '10'}
                    </span>
                  </div>

                  <div className="p-2 rounded-2xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                    <span className="text-slate-400 text-[9px] block">Students</span>
                    <span className="font-bold text-emerald-500 text-sm">
                      {courses.filter((c: Course) => c.tutorId === currentUser.id).reduce((acc: number, c: Course) => acc + c.enrolledStudentsCount, 0)}
                    </span>
                  </div>

                  <div className="p-2 rounded-2xl bg-white dark:bg-black border border-slate-200/60 dark:border-neutral-800">
                    <span className="text-slate-400 text-[9px] block">Revenue</span>
                    <span className="font-bold text-purple-500 text-sm">
                      ₦{tutorProfile.totalEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Pro Tier Upgrade Banner */}
                {tutorProfile.tier !== 'unlimited_pro' && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-950/40 border border-purple-500/40 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Upgrade to Unlimited Courses</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        ₦20,000 monthly for unlimited published courses, featured listing & masterclass hosting.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpgradeUnlimited('wallet')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 shadow-md transition-all active:scale-95"
                    >
                      Upgrade ₦20k
                    </button>
                  </div>
                )}
              </div>

              {/* Publish Course Section */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  My Published Courses
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(!showAddCourse)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddCourse ? 'Close Form' : 'Publish New Course'}</span>
                </button>
              </div>

              {/* Add Course Form */}
              {showAddCourse && (
                <form onSubmit={handlePublishSubmit} className="p-4 rounded-3xl bg-slate-50 dark:bg-neutral-900 border border-blue-500/30 space-y-3 animate-in zoom-in-95">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Create & Publish New Course</span>
                  </h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                      Course Title
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Mastering Afrobeats Vocal Mixing & Compression"
                      className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as CourseCategory)}
                        className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="tech_coding">Tech & Coding</option>
                        <option value="business_finance">Business & Trade</option>
                        <option value="languages_culture">African Languages</option>
                        <option value="creative_design">Creative & Audio</option>
                        <option value="trades_engineering">Trades & Engineering</option>
                        <option value="academics_jamb">JAMB / Academics</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                        Price (₦ NGN)
                      </label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="8000"
                        min="500"
                        className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-neutral-400 block mb-1">
                      Description / Learning Outcomes
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="Describe what students will learn..."
                      className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Lesson Modules Builder */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-black border border-slate-200/80 dark:border-neutral-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Add Lesson Modules ({lessonsList.length} added)
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Lesson title (e.g. Module 2: Logic Pro Setup)"
                        className="flex-1 p-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        value={newLessonDuration}
                        onChange={(e) => setNewLessonDuration(e.target.value)}
                        placeholder="Mins"
                        className="w-16 p-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={handleAddLessonItem}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                      {lessonsList.map((lsn, idx) => (
                        <div key={lsn.id} className="p-1.5 text-xs rounded bg-slate-50 dark:bg-neutral-900 flex items-center justify-between">
                          <span className="truncate">{idx + 1}. {lsn.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">{lsn.durationMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md"
                  >
                    Publish Course for ₦{Number(newPrice).toLocaleString()}
                  </button>
                </form>
              )}

              {/* List of user's own courses */}
              <div className="space-y-2">
                {courses
                  .filter((c) => c.tutorId === currentUser.id)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{c.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ₦{c.price.toLocaleString()} · {c.lessonsCount} lessons · {c.enrolledStudentsCount} students enrolled
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Live in Academy
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
