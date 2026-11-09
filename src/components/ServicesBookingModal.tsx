import React, { useState } from 'react';
import {
  X,
  Search,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronRight,
  Phone,
  Plus,
  Wrench,
  Scissors,
  Sparkles,
  Shield,
  PartyPopper,
  Radio,
  Briefcase,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceCategory, ServiceProvider, ServiceBooking, ServiceOffering } from '../types';

export const ServicesBookingModal: React.FC = () => {
  const {
    isServicesModalOpen,
    setIsServicesModalOpen,
    serviceProviders,
    serviceBookings,
    createServiceBooking,
    cancelServiceBooking,
    completeServiceBooking,
    registerAsServiceProvider,
    formatPrice,
    currentUser,
    wallet,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'browse' | 'my_bookings' | 'register'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<ServiceProvider | null>(null);

  // Booking Flow State
  const [bookingStep, setBookingStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [selectedService, setSelectedService] = useState<ServiceOffering | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('Tomorrow');
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');
  const [bookingLocation, setBookingLocation] = useState<string>('Client Home / Venue');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'escrow' | 'direct'>('escrow');
  const [completedBooking, setCompletedBooking] = useState<ServiceBooking | null>(null);

  // Provider Registration Form State
  const [regName, setRegName] = useState(currentUser.fullName);
  const [regBizName, setRegBizName] = useState('');
  const [regCategory, setRegCategory] = useState<ServiceCategory>('barber');
  const [regPhone, setRegPhone] = useState(currentUser.phoneNumber);
  const [regLocation, setRegLocation] = useState('Lagos, Nigeria');
  const [regRate, setRegRate] = useState('10000');
  const [regAbout, setRegAbout] = useState('');
  const [regServiceTitle, setRegServiceTitle] = useState('');
  const [regServicePrice, setRegServicePrice] = useState('15000');

  if (!isServicesModalOpen) return null;

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'mechanic', label: 'Mechanic', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'barber', label: 'Barber', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'nail_tech', label: 'Nail Tech', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'bouncer', label: 'Bouncer & VIP', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'event_planner', label: 'Events & Wedding', icon: <PartyPopper className="w-3.5 h-3.5" /> },
    { id: 'generator_tech', label: 'Generator Tech', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'tailor', label: 'Bespoke Tailor', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'dj', label: 'DJ & Sound', icon: <Radio className="w-3.5 h-3.5" /> },
  ];

  const filteredProviders = serviceProviders.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.about.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStartBooking = (provider: ServiceProvider, service?: ServiceOffering) => {
    setActiveProvider(provider);
    setSelectedService(service || provider.servicesOffered[0] || null);
    setSelectedDate(provider.availability.days[0] || 'Tomorrow');
    setSelectedTime(provider.availability.timeSlots[0] || '10:00 AM');
    setBookingStep('details');
  };

  const handleConfirmBooking = () => {
    if (!activeProvider || !selectedService) return;

    const result = createServiceBooking({
      serviceProviderId: activeProvider.id,
      providerName: activeProvider.name,
      providerAvatar: activeProvider.avatar,
      clientName: currentUser.fullName,
      clientPhone: currentUser.phoneNumber,
      serviceTitle: selectedService.title,
      category: activeProvider.category,
      date: selectedDate,
      timeSlot: selectedTime,
      location: bookingLocation,
      totalPrice: selectedService.price,
      currency: activeProvider.currency,
      notes: bookingNotes,
      status: 'confirmed',
      paymentMode,
      isPaid: true,
    });

    setCompletedBooking(result.booking);
    setBookingStep('success');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regBizName.trim()) {
      alert('Please enter your business or brand name.');
      return;
    }

    const priceNum = parseInt(regServicePrice, 10) || 10000;
    const hourlyNum = parseInt(regRate, 10) || 8000;

    registerAsServiceProvider({
      name: regName,
      businessName: regBizName,
      avatar: currentUser.avatarUrl,
      category: regCategory,
      categoryLabel: regCategory.replace('_', ' ').toUpperCase(),
      hourlyRate: hourlyNum,
      currency: 'NGN',
      location: regLocation,
      about: regAbout || 'Verified African service specialist with quick turnaround and top customer ratings.',
      experienceYears: 5,
      phone: regPhone,
      availability: {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        timeSlots: ['09:00 AM', '12:00 PM', '03:00 PM', '06:00 PM'],
      },
      servicesOffered: [
        {
          id: `so_new_${Date.now()}`,
          title: regServiceTitle || 'Standard Appointment Callout & Service',
          price: priceNum,
          durationMinutes: 60,
        },
      ],
      portfolioImages: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
      ],
    });

    alert('Your service business has been listed on AfriChat! Clients can now book appointments directly with Escrow security.');
    setActiveTab('browse');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>African Services & Bookings</span>
                <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                  No Limits
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Barbers, mechanics, bouncers, nail techs & specialists
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsServicesModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-neutral-950 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => {
              setActiveTab('browse');
              setActiveProvider(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Find Pros
          </button>
          <button
            onClick={() => {
              setActiveTab('my_bookings');
              setActiveProvider(null);
            }}
            className={`py-2 rounded-xl transition-all relative ${
              activeTab === 'my_bookings'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>My Bookings</span>
            {serviceBookings.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono bg-purple-600 text-white rounded-full">
                {serviceBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setActiveProvider(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'register'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            + List Service
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
          {/* TAB 1: BROWSE & BOOK SERVICES */}
          {activeTab === 'browse' && (
            <div>
              {/* If a provider is actively selected for detail / booking */}
              {activeProvider ? (
                <div className="p-4 space-y-4">
                  {/* Back button */}
                  <button
                    onClick={() => setActiveProvider(null)}
                    className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    ← Back to all African specialists
                  </button>

                  {bookingStep === 'details' && (
                    <div className="space-y-4">
                      {/* Provider Header Card */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-start gap-3.5">
                        <img
                          src={activeProvider.avatar}
                          alt={activeProvider.name}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {activeProvider.name}
                            </h3>
                            {activeProvider.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {activeProvider.businessName}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <strong className="text-slate-800 dark:text-neutral-200">{activeProvider.rating}</strong> ({activeProvider.reviewCount})
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5" />
                              {activeProvider.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="p-3 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                        {activeProvider.about}
                      </div>

                      {/* Service Menu */}
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                          1. Select Desired Service
                        </div>
                        <div className="space-y-2">
                          {activeProvider.servicesOffered.map((srv) => (
                            <div
                              key={srv.id}
                              onClick={() => setSelectedService(srv)}
                              className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                selectedService?.id === srv.id
                                  ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-600'
                                  : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-neutral-700'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-xs text-slate-900 dark:text-white">
                                  {srv.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5 font-mono">
                                  <Clock className="w-3 h-3" />
                                  <span>{srv.durationMinutes} mins appointment</span>
                                </div>
                              </div>
                              <div className="font-bold text-sm text-purple-600 dark:text-purple-400 font-mono">
                                {formatPrice(srv.price, activeProvider.currency)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Date & Time Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                            2. Day
                          </label>
                          <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                          >
                            <option value="Today">Today (Urgent Callout)</option>
                            <option value="Tomorrow">Tomorrow</option>
                            <option value="Wednesday, Nov 12">Wednesday, Nov 12</option>
                            <option value="Thursday, Nov 13">Thursday, Nov 13</option>
                            <option value="Friday, Nov 14">Friday, Nov 14</option>
                            <option value="Saturday, Nov 15">Saturday, Nov 15</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                            3. Time Slot
                          </label>
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                          >
                            {activeProvider.availability.timeSlots.map((ts) => (
                              <option key={ts} value={ts}>{ts}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Location & Instructions */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                          4. Service Location & Notes
                        </label>
                        <input
                          type="text"
                          value={bookingLocation}
                          onChange={(e) => setBookingLocation(e.target.value)}
                          placeholder="Your house/office address or specialist studio..."
                          className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 mb-2"
                        />
                        <input
                          type="text"
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          placeholder="Special instructions (e.g. Mercedes C300 starter issue, skin sensitivity)..."
                          className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </div>

                      {/* Payment Mode (Escrow vs Direct) */}
                      <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-neutral-900 border border-purple-200 dark:border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-purple-600" />
                            <span>AfriChat Escrow Protection</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                          Your money is held safely in the AfriChat Vault. The specialist is only paid after you provide your 4-digit completion PIN at the end of the job.
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-neutral-800">
                          <div>
                            <div className="text-[10px] text-slate-500">Total Fee:</div>
                            <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                              {selectedService ? formatPrice(selectedService.price, activeProvider.currency) : '—'}
                            </div>
                          </div>

                          <button
                            onClick={handleConfirmBooking}
                            disabled={!selectedService}
                            className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                          >
                            <span>Lock Escrow & Book</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUCCESS CONFIRMATION STEP */}
                  {bookingStep === 'success' && completedBooking && (
                    <div className="text-center py-6 px-3 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 animate-bounce" />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          Appointment Confirmed!
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                          {completedBooking.providerName} has been booked for {completedBooking.date} at {completedBooking.timeSlot}.
                        </p>
                      </div>

                      {/* Escrow Release PIN Box */}
                      <div className="p-4 rounded-2xl bg-purple-50 dark:bg-neutral-900 border border-purple-200 dark:border-neutral-800 max-w-xs mx-auto">
                        <div className="text-xs font-semibold text-slate-500">Your Service Release PIN:</div>
                        <div className="text-3xl font-black font-mono tracking-widest text-purple-600 dark:text-purple-400 my-1">
                          {completedBooking.bookingPin}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                          🔒 Hand this PIN to {completedBooking.providerName} ONLY after you are 100% satisfied with the work.
                        </div>
                      </div>

                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setActiveProvider(null);
                            setActiveTab('my_bookings');
                          }}
                          className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                        >
                          View My Bookings
                        </button>
                        <button
                          onClick={() => {
                            setActiveProvider(null);
                            setActiveTab('browse');
                          }}
                          className="py-2.5 px-4 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-medium"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Service Directory List View */
                <div>
                  {/* Search bar */}
                  <div className="p-3 border-b border-slate-200 dark:border-neutral-800">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search mechanic, nail tech, barber, generator, bouncer..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-neutral-900 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    {/* Category chips */}
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategory(c.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                            selectedCategory === c.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {c.icon}
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Providers Grid */}
                  <div className="p-3 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      Available African Specialists ({filteredProviders.length})
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {filteredProviders.map((provider) => (
                        <div
                          key={provider.id}
                          className="p-3 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-900/60 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={provider.avatar}
                              alt={provider.name}
                              className="w-14 h-14 rounded-xl object-cover ring-1 ring-purple-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 min-w-0">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {provider.name}
                                  </h4>
                                  {provider.isVerified && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full shrink-0">
                                  {provider.categoryLabel}
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-slate-600 dark:text-neutral-300 truncate">
                                {provider.businessName}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400 mt-1 font-mono">
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <strong>{provider.rating}</strong> ({provider.reviewCount})
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3" />
                                  {provider.location}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                            {provider.about}
                          </p>

                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-900 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400">Starting from</span>
                              <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                                {formatPrice(provider.servicesOffered[0]?.price || provider.hourlyRate, provider.currency)}
                              </div>
                            </div>

                            <button
                              onClick={() => handleStartBooking(provider)}
                              className="py-1.5 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                            >
                              <span>Book Appointment</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY BOOKINGS & ESCROW RELEASE */}
          {activeTab === 'my_bookings' && (
            <div className="p-3 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Your Service Appointments ({serviceBookings.length})
              </div>

              {serviceBookings.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-neutral-400 text-xs">
                  No appointments booked yet. Browse African specialists to book with Escrow security!
                </div>
              ) : (
                serviceBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={bk.providerAvatar}
                          alt={bk.providerName}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-purple-600"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {bk.serviceTitle}
                          </h4>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                            with <strong>{bk.providerName}</strong>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          bk.status === 'confirmed'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : bk.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {bk.status}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-neutral-900 rounded-xl text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-slate-600 dark:text-neutral-300">
                        <span>Schedule:</span>
                        <strong>{bk.date} @ {bk.timeSlot}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-neutral-300">
                        <span>Escrow Fee:</span>
                        <strong>{formatPrice(bk.totalPrice, bk.currency)}</strong>
                      </div>
                      {bk.status === 'confirmed' && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-neutral-800 text-purple-600 dark:text-purple-400 font-bold">
                          <span>Job Release PIN:</span>
                          <span className="text-base tracking-widest">{bk.bookingPin}</span>
                        </div>
                      )}
                    </div>

                    {bk.status === 'confirmed' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => cancelServiceBooking(bk.id)}
                          className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Cancel & Refund
                        </button>
                        <button
                          onClick={() => completeServiceBooking(bk.id)}
                          className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                        >
                          Confirm & Release Pay
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: REGISTER AS AFRICAN PRO */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="p-4 space-y-3.5">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                List your craft on AfriChat! Receive direct WhatsApp-style appointments and secure upfront escrow payments directly into your AfriChat Wallet.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Full Name / Owner
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Business / Brand Name
                </label>
                <input
                  type="text"
                  value={regBizName}
                  onChange={(e) => setRegBizName(e.target.value)}
                  placeholder="e.g. Ade VIP Barbing & Grooming Lounge"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    African Service Field
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as ServiceCategory)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  >
                    <option value="mechanic">Auto Mechanic</option>
                    <option value="barber">Barber & Haircut</option>
                    <option value="nail_tech">Nail Technician</option>
                    <option value="bouncer">Bouncer & Security</option>
                    <option value="event_planner">Event / Wedding Planner</option>
                    <option value="generator_tech">Generator Doctor</option>
                    <option value="tailor">Tailor / Fashion Designer</option>
                    <option value="dj">DJ & Sound Producer</option>
                    <option value="caterer">Caterer & Party Jollof</option>
                    <option value="plumber">Plumber & Piping</option>
                    <option value="electrician">Electrician & Wiring</option>
                    <option value="other">Other African Craft</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Primary Location / City
                </label>
                <input
                  type="text"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  placeholder="e.g. Lekki, Lagos or Osu, Accra"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Signature Service Title
                  </label>
                  <input
                    type="text"
                    value={regServiceTitle}
                    onChange={(e) => setRegServiceTitle(e.target.value)}
                    placeholder="e.g. Skin Fade + Beard Groom"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    value={regServicePrice}
                    onChange={(e) => setRegServicePrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  About your experience & tools
                </label>
                <textarea
                  value={regAbout}
                  onChange={(e) => setRegAbout(e.target.value)}
                  rows={2}
                  placeholder="Tell clients about your years of experience, warranty, and turnaround speed..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Service Listing</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
