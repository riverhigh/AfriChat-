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
  Users,
  CheckSquare,
  DollarSign,
  Store,
  Award,
  CreditCard,
  Building2,
  UserCheck,
  CalendarDays,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  ServiceCategory,
  ServiceProvider,
  ServiceBooking,
  ServiceOffering,
  ArtisanStation,
  ArtisanStaff,
  ArtisanTask,
} from '../types';

export const ServicesBookingModal: React.FC = () => {
  const {
    isServicesModalOpen,
    setIsServicesModalOpen,
    isArtisanModalOpen,
    setIsArtisanModalOpen,
    serviceProviders,
    serviceBookings,
    createServiceBooking,
    cancelServiceBooking,
    completeServiceBooking,
    registerAsServiceProvider,
    artisanStation,
    registerArtisanStation,
    addArtisanListing,
    updateStationHours,
    hireArtisanStaff,
    assignArtisanTask,
    updateArtisanTaskStatus,
    formatPrice,
    currentUser,
    wallet,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'browse' | 'station_hub' | 'my_bookings'>(
    isArtisanModalOpen ? 'station_hub' : 'browse'
  );

  React.useEffect(() => {
    if (isArtisanModalOpen) {
      setActiveTab('station_hub');
    }
  }, [isArtisanModalOpen]);
  const [stationSubTab, setStationSubTab] = useState<'listings' | 'schedule' | 'staff' | 'tasks'>('listings');
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

  // Station Registration Form State (₦5,000 fee)
  const [regStationName, setRegStationName] = useState(
    currentUser.fullName ? `${currentUser.fullName}'s Master Station` : 'Craft & Engineering Works'
  );
  const [regStationCategory, setRegStationCategory] = useState<ServiceCategory>('mechanic');
  const [regStationLocation, setRegStationLocation] = useState('Surulere & Victoria Island, Lagos');
  const [regStationAddress, setRegStationAddress] = useState('Plot 8, Western Commercial Strip, Surulere, Lagos');
  const [regStationAbout, setRegStationAbout] = useState(
    'Licensed master workshop with computer diagnostic equipment, certified apprentices and Escrow satisfaction guarantee.'
  );
  const [regStationPaymentMethod, setRegStationPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');

  // New Listing Form State (₦500 fee per listing)
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListingTitle, setNewListingTitle] = useState('');
  const [newListingPrice, setNewListingPrice] = useState('15000');
  const [newListingDuration, setNewListingDuration] = useState('60');
  const [newListingDesc, setNewListingDesc] = useState('');
  const [newListingPayment, setNewListingPayment] = useState<'wallet' | 'paystack'>('wallet');

  // Hire Staff Form State
  const [showHireStaff, setShowHireStaff] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<ArtisanStaff['role']>('Apprentice');
  const [staffPhone, setStaffPhone] = useState('+23480');
  const [staffWage, setStaffWage] = useState('₦4,500 / day');

  // Assign Task Form State
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStaffId, setTaskStaffId] = useState('');
  const [taskPriority, setTaskPriority] = useState<ArtisanTask['priority']>('medium');
  const [taskDueDate, setTaskDueDate] = useState('Today, 5:00 PM');
  const [taskClientName, setTaskClientName] = useState('');

  // Operating Hours Editing
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [openDays, setOpenDays] = useState<string[]>(
    artisanStation?.operatingHours.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  );
  const [startTime, setStartTime] = useState(artisanStation?.operatingHours.startTime || '08:00 AM');
  const [endTime, setEndTime] = useState(artisanStation?.operatingHours.endTime || '07:00 PM');
  const [breakTime, setBreakTime] = useState(artisanStation?.operatingHours.breakTime || '01:00 PM - 02:00 PM');

  if (!isServicesModalOpen && !isArtisanModalOpen) return null;

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

  // Station Registration Handler (₦5,000 fee)
  const handleRegisterStationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStationName.trim()) {
      alert('Please enter your Artisan Station name.');
      return;
    }

    const res = registerArtisanStation(
      {
        stationName: regStationName.trim(),
        category: regStationCategory,
        categoryLabel: regStationCategory.replace('_', ' ').toUpperCase(),
        location: regStationLocation.trim(),
        workshopAddress: regStationAddress.trim(),
        about: regStationAbout.trim(),
        operatingHours: {
          days: openDays,
          startTime,
          endTime,
          breakTime,
        },
      },
      regStationPaymentMethod
    );

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert(res.message);
    setActiveTab('station_hub');
  };

  // New Listing Handler (₦500 fee per listing)
  const handleAddListingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingTitle.trim()) {
      alert('Please enter a service offering title.');
      return;
    }

    const priceNum = parseInt(newListingPrice, 10) || 10000;
    const durNum = parseInt(newListingDuration, 10) || 60;

    const res = addArtisanListing(
      {
        title: newListingTitle.trim(),
        price: priceNum,
        durationMinutes: durNum,
        description: newListingDesc.trim() || undefined,
      },
      newListingPayment
    );

    if (!res.success) {
      alert(res.message);
      return;
    }

    alert(res.message);
    setNewListingTitle('');
    setNewListingDesc('');
    setShowAddListing(false);
  };

  // Hire Staff Handler
  const handleHireStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    const res = hireArtisanStaff({
      name: staffName.trim(),
      role: staffRole,
      phone: staffPhone.trim(),
      wage: staffWage.trim(),
    });

    alert(`🎉 Successfully hired ${res.staffMember.name} as ${res.staffMember.role}!`);
    setStaffName('');
    setShowHireStaff(false);
  };

  // Assign Task Handler
  const handleAssignTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const targetStaff =
      artisanStation?.staff.find((s) => s.id === taskStaffId) ||
      artisanStation?.staff[0] || {
        id: 'staff_default',
        name: 'Lead Technician',
      };

    const res = assignArtisanTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assignedToStaffId: targetStaff.id,
      assignedToStaffName: targetStaff.name,
      priority: taskPriority,
      dueDate: taskDueDate.trim(),
      clientName: taskClientName.trim() || undefined,
    });

    alert(`✅ Task "${res.task.title}" assigned to ${res.task.assignedToStaffName}!`);
    setTaskTitle('');
    setTaskDesc('');
    setShowAssignTask(false);
  };

  // Save Hours Handler
  const handleSaveHours = () => {
    updateStationHours({
      days: openDays,
      startTime,
      endTime,
      breakTime,
    });
    setIsEditingHours(false);
    alert('Operating hours and calendar slots updated successfully!');
  };

  const toggleDay = (day: string) => {
    if (openDays.includes(day)) {
      setOpenDays(openDays.filter((d) => d !== day));
    } else {
      setOpenDays([...openDays, day]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Artisan Stations & Services</span>
                <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                  Verified Hub
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Mechanics, tailoring, grooming, stations & apprentices
              </p>
            </div>
          </div>

          <button
            onClick={() => { setIsServicesModalOpen(false); setIsArtisanModalOpen(false); }}
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
              setActiveTab('station_hub');
              setActiveProvider(null);
            }}
            className={`py-2 rounded-xl transition-all relative flex items-center justify-center gap-1 ${
              activeTab === 'station_hub'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Station Hub</span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-purple-600 text-white rounded-full">
              ₦5k
            </span>
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
            <span>Bookings</span>
            {serviceBookings.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono bg-purple-600 text-white rounded-full">
                {serviceBookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
          {/* TAB 1: BROWSE SPECIALISTS */}
          {activeTab === 'browse' && !activeProvider && (
            <div className="p-4 space-y-4">
              {/* Station Banner Promo */}
              <div className="p-3.5 bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-slate-900/50 rounded-2xl border border-purple-500/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                    <Store className="w-4 h-4" />
                    <span>Run an African Workshop or Studio?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Register your Station for ₦5k. Manage ₦500 listings, calendar appointments & apprentices.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('station_hub')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all"
                >
                  Open Station Hub
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search auto diagnostics, barbers, bouncers, Lekki..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Provider Cards */}
              <div className="space-y-3">
                {filteredProviders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No specialists found matching your search.</p>
                  </div>
                ) : (
                  filteredProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-purple-500/40 transition-all shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={provider.avatar}
                          alt={provider.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-neutral-800 shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {provider.name}
                            </h3>
                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold shrink-0">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{provider.rating.toFixed(1)}</span>
                              <span className="text-slate-400 font-normal text-[10px]">
                                ({provider.reviewCount})
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 block truncate">
                            {provider.businessName}
                          </span>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{provider.location}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2 line-clamp-2 leading-relaxed">
                        {provider.about}
                      </p>

                      {/* Services Listed */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-900 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Verified Service Offerings:
                        </span>
                        {provider.servicesOffered.map((srv) => (
                          <div
                            key={srv.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-neutral-900/60 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold block truncate text-slate-900 dark:text-white">
                                {srv.title}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{srv.durationMinutes} mins</span>
                              </span>
                            </div>

                            <button
                              onClick={() => handleStartBooking(provider, srv)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                            >
                              <span>Book {formatPrice(srv.price, provider.currency)}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BOOKING FLOW STEPS */}
          {activeTab === 'browse' && activeProvider && (
            <div className="p-4 space-y-4">
              <button
                onClick={() => setActiveProvider(null)}
                className="text-xs text-slate-500 hover:text-purple-600 flex items-center gap-1"
              >
                ← Back to pros list
              </button>

              {bookingStep === 'details' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <img
                      src={activeProvider.avatar}
                      alt={activeProvider.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {activeProvider.name}
                      </h3>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                        {activeProvider.businessName}
                      </p>
                    </div>
                  </div>

                  {/* Select Service */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1.5">
                      Select Service Offering
                    </label>
                    <div className="space-y-1.5">
                      {activeProvider.servicesOffered.map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedService(srv)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                            selectedService?.id === srv.id
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                              : 'border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs block">{srv.title}</span>
                            <span className="text-[10px] text-slate-400">{srv.durationMinutes} mins</span>
                          </div>
                          <span className="font-mono font-bold text-xs">
                            {formatPrice(srv.price, activeProvider.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date & Time Slot */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                        Appointment Day
                      </label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      >
                        {activeProvider.availability.days.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                        Time Slot
                      </label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                      >
                        {activeProvider.availability.timeSlots.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Location & Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Service Location
                    </label>
                    <input
                      type="text"
                      value={bookingLocation}
                      onChange={(e) => setBookingLocation(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      placeholder="e.g. 14 Admiralty Way, Lekki or Workshop Visit"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Notes for Specialist
                    </label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      placeholder="Describe any specifics (e.g. car make, hairstyle model, generator fault)..."
                    />
                  </div>

                  <button
                    onClick={() => setBookingStep('confirm')}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <span>Proceed to Escrow Safeguard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {bookingStep === 'confirm' && selectedService && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs space-y-2">
                    <div className="font-bold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>AGC Escrow Protection</span>
                    </div>
                    <p className="text-purple-800/80 dark:text-purple-400/80 leading-relaxed text-[11px]">
                      Your payment of{' '}
                      <strong>{formatPrice(selectedService.price, activeProvider.currency)}</strong> is held safely in
                      vault until the specialist completes your appointment and you verify the job PIN.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service:</span>
                      <span className="font-semibold">{selectedService.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Specialist:</span>
                      <span className="font-semibold">{activeProvider.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled:</span>
                      <span className="font-semibold">
                        {selectedDate} at {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-semibold">{bookingLocation}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-neutral-800 font-bold text-sm">
                      <span>Total Amount:</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">
                        {formatPrice(selectedService.price, activeProvider.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setBookingStep('details')}
                      className="py-3 px-4 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmBooking}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock & Confirm Booking</span>
                    </button>
                  </div>
                </div>
              )}

              {bookingStep === 'success' && completedBooking && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Appointment Booked & Locked in Escrow!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                      {activeProvider.name} has been notified and calendar slot is secured.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 max-w-xs mx-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Job Release Verification PIN
                    </span>
                    <div className="text-3xl font-extrabold font-mono tracking-widest text-purple-600 dark:text-purple-400">
                      {completedBooking.bookingPin}
                    </div>
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 mt-1">
                      Provide this PIN to the artisan only after the service is fully completed to your satisfaction.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveProvider(null);
                      setActiveTab('my_bookings');
                    }}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    View in My Bookings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARTISAN STATION HUB (5k Registration, 500 Listings, Hours, Calendar, Staff & Tasks) */}
          {activeTab === 'station_hub' && (
            <div className="p-4 space-y-4">
              {/* If user has not registered an Artisan Station yet */}
              {!artisanStation ? (
                <form onSubmit={handleRegisterStationSubmit} className="space-y-4">
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 text-white shadow-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-amber-300">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">Register Artisan Station</h3>
                        <p className="text-[11px] text-purple-200">
                          Auto mechanics, salons, electronics repair, and artisanal workshops
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl flex items-center justify-between text-xs mt-2">
                      <span>Station Registration Fee:</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">₦5,000</span>
                    </div>

                    <p className="text-[10px] text-purple-200 leading-relaxed">
                      Includes instant Escrow trust certification, appointment booking calendar, staff/apprentice roster, and task assignment tracking. Listing fee is ₦500 per service offering after approval.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Artisan Station / Workshop Name
                    </label>
                    <input
                      type="text"
                      value={regStationName}
                      onChange={(e) => setRegStationName(e.target.value)}
                      placeholder="e.g. Master Auto Mechanics & Diagnostic Bay"
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                        Category
                      </label>
                      <select
                        value={regStationCategory}
                        onChange={(e) => setRegStationCategory(e.target.value as ServiceCategory)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      >
                        <option value="mechanic">Auto Mechanic & Diagnostic</option>
                        <option value="barber">Barber & Haircut Lounge</option>
                        <option value="nail_tech">Nail Technician & Spa</option>
                        <option value="generator_tech">Generator Doctor</option>
                        <option value="tailor">Tailor / Bespoke Fashion</option>
                        <option value="bouncer">Bouncer & VIP Security</option>
                        <option value="electrician">Electrician & Solar</option>
                        <option value="plumber">Plumber & Piping</option>
                        <option value="event_planner">Event / Wedding Specialist</option>
                        <option value="dj">DJ & Sound Studio</option>
                        <option value="other">General African Craft</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                        City / District
                      </label>
                      <input
                        type="text"
                        value={regStationLocation}
                        onChange={(e) => setRegStationLocation(e.target.value)}
                        placeholder="e.g. Surulere, Lagos"
                        className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Physical Workshop Address
                    </label>
                    <input
                      type="text"
                      value={regStationAddress}
                      onChange={(e) => setRegStationAddress(e.target.value)}
                      placeholder="e.g. Block 4, Western Avenue Artisan Complex"
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      About Workshop Tools & Guarantee
                    </label>
                    <textarea
                      value={regStationAbout}
                      onChange={(e) => setRegStationAbout(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>

                  {/* Payment Method for ₦5,000 Registration */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1.5">
                      Pay ₦5,000 Registration Fee via:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegStationPaymentMethod('wallet')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          regStationPaymentMethod === 'wallet'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                            : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs mb-0.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>AGC Wallet</span>
                        </div>
                        <span className="text-[10px] opacity-80 block font-mono">
                          Balance: ₦{wallet.availableBalance.toLocaleString()}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegStationPaymentMethod('paystack')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          regStationPaymentMethod === 'paystack'
                            ? 'border-[#0ba4db] bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold'
                            : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs mb-0.5">
                          <CreditCard className="w-3.5 h-3.5 text-[#0ba4db]" />
                          <span>Paystack Instant</span>
                        </div>
                        <span className="text-[10px] opacity-80 block">
                          Card, Bank, USSD
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pay ₦5,000 & Register Station</span>
                  </button>
                </form>
              ) : (
                /* Station Workspace when Registered */
                <div className="space-y-4">
                  {/* Station Profile Card */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950 to-neutral-900 text-white shadow-lg space-y-3 border border-purple-500/30">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-white">
                              {artisanStation.stationName}
                            </h3>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified Station</span>
                            </span>
                          </div>
                          <p className="text-xs text-purple-300 font-medium">
                            {artisanStation.categoryLabel}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                        {artisanStation.registeredAt}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/10 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{artisanStation.workshopAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">
                          {artisanStation.operatingHours.startTime} - {artisanStation.operatingHours.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subtab Navigation */}
                  <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-neutral-900 rounded-2xl text-[11px] font-semibold border border-slate-200 dark:border-neutral-800">
                    <button
                      onClick={() => setStationSubTab('listings')}
                      className={`py-2 rounded-xl transition-all ${
                        stationSubTab === 'listings'
                          ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Listings ({artisanStation.listings.length})</span>
                    </button>

                    <button
                      onClick={() => setStationSubTab('schedule')}
                      className={`py-2 rounded-xl transition-all ${
                        stationSubTab === 'schedule'
                          ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Hours & Cal</span>
                    </button>

                    <button
                      onClick={() => setStationSubTab('staff')}
                      className={`py-2 rounded-xl transition-all ${
                        stationSubTab === 'staff'
                          ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Staff ({artisanStation.staff.length})</span>
                    </button>

                    <button
                      onClick={() => setStationSubTab('tasks')}
                      className={`py-2 rounded-xl transition-all ${
                        stationSubTab === 'tasks'
                          ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Tasks ({artisanStation.tasks.length})</span>
                    </button>
                  </div>

                  {/* SUBTAB 1: SERVICE OFFERINGS & LISTINGS (500 NGN EACH) */}
                  {stationSubTab === 'listings' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Service Offerings
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            ₦500 per new service listing
                          </span>
                        </div>

                        <button
                          onClick={() => setShowAddListing(!showAddListing)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Listing (₦500)</span>
                        </button>
                      </div>

                      {/* Add Listing Drawer */}
                      {showAddListing && (
                        <form
                          onSubmit={handleAddListingSubmit}
                          className="p-3.5 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-3 animate-in slide-in-from-top-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                              New Service Listing (₦500 Fee)
                            </span>
                            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                              Deducted upon publish
                            </span>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                              Service Title
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Mercedes Benz Diagnostic & Engine Scan"
                              value={newListingTitle}
                              onChange={(e) => setNewListingTitle(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                                Client Price (₦)
                              </label>
                              <input
                                type="number"
                                value={newListingPrice}
                                onChange={(e) => setNewListingPrice(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                                Est. Duration (Mins)
                              </label>
                              <input
                                type="number"
                                value={newListingDuration}
                                onChange={(e) => setNewListingDuration(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                              Description & Scope
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Explain what is covered in this service call..."
                              value={newListingDesc}
                              onChange={(e) => setNewListingDesc(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500">
                              Fee: ₦500 from AGC Wallet
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setShowAddListing(false)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-xl text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm"
                              >
                                Pay ₦500 & Publish
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* Listings List */}
                      <div className="space-y-2">
                        {artisanStation.listings.map((lst) => (
                          <div
                            key={lst.id}
                            className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {lst.title}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-full">
                                  Live & Listed
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                {lst.description || 'Standard workshop service appointment with Escrow.'}
                              </p>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{lst.durationMinutes} mins appointment slot</span>
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 block">
                                ₦{lst.price.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-slate-400 block">
                                ₦500 listing paid
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: OPERATING HOURS & CALENDAR APPOINTMENTS */}
                  {stationSubTab === 'schedule' && (
                    <div className="space-y-4">
                      {/* Hours Config Card */}
                      <div className="p-3.5 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span>Workshop Operating Hours & Days</span>
                          </div>

                          <button
                            onClick={() => setIsEditingHours(!isEditingHours)}
                            className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {isEditingHours ? 'Cancel' : 'Edit Hours'}
                          </button>
                        </div>

                        {/* Working Days */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Active Open Days
                          </span>
                          <div className="flex gap-1.5 flex-wrap">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                              const isOpen = openDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  disabled={!isEditingHours}
                                  onClick={() => toggleDay(day)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                    isOpen
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-200 dark:bg-neutral-800 text-slate-500'
                                  } ${!isEditingHours ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isEditingHours ? (
                          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                  Opening Time
                                </label>
                                <input
                                  type="text"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                  Closing Time
                                </label>
                                <input
                                  type="text"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveHours}
                              className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs"
                            >
                              Save Operating Hours
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 dark:border-neutral-800 font-mono">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Daily Hours</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {artisanStation.operatingHours.startTime} - {artisanStation.operatingHours.endTime}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Break Slot</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {artisanStation.operatingHours.breakTime || '1:00 PM - 2:00 PM'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Appointments Calendar */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          <CalendarDays className="w-4 h-4 text-purple-600" />
                          <span>Station Calendar Appointments</span>
                        </div>

                        {serviceBookings.length === 0 ? (
                          <div className="p-6 text-center rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/40 text-slate-400 text-xs">
                            No incoming client appointments right now.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {serviceBookings.map((bk) => (
                              <div
                                key={bk.id}
                                className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-1.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {bk.serviceTitle}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      bk.status === 'confirmed'
                                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                        : bk.status === 'completed'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-500'
                                    }`}
                                  >
                                    {bk.status}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Client: {bk.clientName} ({bk.clientPhone})</span>
                                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                                    ₦{bk.totalPrice.toLocaleString()}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-neutral-900">
                                  <span>Slot: {bk.date} @ {bk.timeSlot}</span>
                                  <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                                    PIN: {bk.bookingPin}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 3: HIRE STAFF & APPRENTICES */}
                  {stationSubTab === 'staff' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Artisans & Apprentices
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Hire & manage workshop team
                          </span>
                        </div>

                        <button
                          onClick={() => setShowHireStaff(!showHireStaff)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Hire Staff</span>
                        </button>
                      </div>

                      {/* Hire Staff Form Drawer */}
                      {showHireStaff && (
                        <form
                          onSubmit={handleHireStaffSubmit}
                          className="p-3.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl space-y-3 animate-in slide-in-from-top-2"
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Hire Assistant, Apprentice or Specialist
                          </span>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Full Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Babatunde Jinadu"
                                value={staffName}
                                onChange={(e) => setStaffName(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Role / Title
                              </label>
                              <select
                                value={staffRole}
                                onChange={(e) => setStaffRole(e.target.value as ArtisanStaff['role'])}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              >
                                <option value="Senior Artisan">Senior Artisan</option>
                                <option value="Apprentice">Apprentice</option>
                                <option value="Assistant">Assistant</option>
                                <option value="Technician">Technician</option>
                                <option value="Store Manager">Store Manager</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Phone Number
                              </label>
                              <input
                                type="text"
                                value={staffPhone}
                                onChange={(e) => setStaffPhone(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Agreed Wage
                              </label>
                              <input
                                type="text"
                                value={staffWage}
                                onChange={(e) => setStaffWage(e.target.value)}
                                placeholder="e.g. ₦5,000 / day"
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowHireStaff(false)}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-xl text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                            >
                              Add to Team
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Staff Roster List */}
                      <div className="space-y-2">
                        {artisanStation.staff.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                                {member.name[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {member.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                                    {member.role}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  {member.phone} • {member.wage}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                              {member.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 4: ASSIGN & TRACK TASKS */}
                  {stationSubTab === 'tasks' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Workshop Tasks
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Assign duties to apprentice staff
                          </span>
                        </div>

                        <button
                          onClick={() => setShowAssignTask(!showAssignTask)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Assign Task</span>
                        </button>
                      </div>

                      {/* Assign Task Form Drawer */}
                      {showAssignTask && (
                        <form
                          onSubmit={handleAssignTaskSubmit}
                          className="p-3.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl space-y-3 animate-in slide-in-from-top-2"
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Assign Work Duty or Client Job
                          </span>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Task Title
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Brake pad skimming on Honda Accord"
                              value={taskTitle}
                              onChange={(e) => setTaskTitle(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Assign To Staff
                              </label>
                              <select
                                value={taskStaffId}
                                onChange={(e) => setTaskStaffId(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              >
                                {artisanStation.staff.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.role})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Priority Level
                              </label>
                              <select
                                value={taskPriority}
                                onChange={(e) => setTaskPriority(e.target.value as ArtisanTask['priority'])}
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-semibold"
                              >
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Due Time
                              </label>
                              <input
                                type="text"
                                value={taskDueDate}
                                onChange={(e) => setTaskDueDate(e.target.value)}
                                placeholder="Today, 5:00 PM"
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Client Name (Optional)
                              </label>
                              <input
                                type="text"
                                value={taskClientName}
                                onChange={(e) => setTaskClientName(e.target.value)}
                                placeholder="e.g. Chief Okafor"
                                className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Task Instructions
                            </label>
                            <textarea
                              rows={2}
                              value={taskDesc}
                              onChange={(e) => setTaskDesc(e.target.value)}
                              placeholder="Detail instructions for the staff member..."
                              className="w-full p-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAssignTask(false)}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-xl text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                            >
                              Assign Task
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Tasks List */}
                      <div className="space-y-2">
                        {artisanStation.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                  {task.title}
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug">
                                  {task.description}
                                </p>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                    : task.priority === 'high'
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-neutral-900">
                              <span>
                                Assigned to: <strong className="text-purple-600 dark:text-purple-300">{task.assignedToStaffName}</strong>
                              </span>
                              <span>Due: {task.dueDate}</span>
                            </div>

                            {/* Status Controller */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono text-slate-400">
                                Status: <strong className="capitalize text-slate-700 dark:text-neutral-200">{task.status.replace('_', ' ')}</strong>
                              </span>

                              <div className="flex gap-1">
                                {task.status !== 'pending' && (
                                  <button
                                    onClick={() => updateArtisanTaskStatus(task.id, 'pending')}
                                    className="px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-[10px] rounded-lg font-semibold"
                                  >
                                    Pending
                                  </button>
                                )}
                                {task.status !== 'in_progress' && (
                                  <button
                                    onClick={() => updateArtisanTaskStatus(task.id, 'in_progress')}
                                    className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] rounded-lg font-semibold"
                                  >
                                    In Progress
                                  </button>
                                )}
                                {task.status !== 'completed' && (
                                  <button
                                    onClick={() => updateArtisanTaskStatus(task.id, 'completed')}
                                    className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-lg font-bold"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLIENT BOOKINGS */}
          {activeTab === 'my_bookings' && (
            <div className="p-4 space-y-3">
              {serviceBookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">You have no active service appointments.</p>
                </div>
              ) : (
                serviceBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={bk.providerAvatar}
                          alt={bk.providerName}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {bk.serviceTitle}
                          </h4>
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block">
                            {bk.providerName}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

                    <div className="p-2.5 bg-slate-50 dark:bg-neutral-900/60 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Appointment:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {bk.date} @ {bk.timeSlot}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Location:</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {bk.location}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Escrow Locked:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {formatPrice(bk.totalPrice, bk.currency)}
                        </strong>
                      </div>
                      {bk.status === 'confirmed' && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-neutral-800 text-purple-600 dark:text-purple-400 font-bold">
                          <span>Job Release PIN:</span>
                          <span className="text-base tracking-widest font-mono">{bk.bookingPin}</span>
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
        </div>
      </div>
    </div>
  );
};
