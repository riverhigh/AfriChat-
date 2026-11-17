import React, { useState } from 'react';
import {
  HeartPulse,
  Stethoscope,
  Clock,
  Pill,
  Shield,
  ShieldCheck,
  AlertOctagon,
  QrCode,
  AlertTriangle,
  Building2,
  X,
  Plus,
  ShoppingBag,
  MessageSquare,
  BadgeCheck,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DoctorProfile } from '../types';

export const HealthcareModal: React.FC = () => {
  const {
    isHealthModalOpen,
    setIsHealthModalOpen,
    doctors,
    queueTokens,
    medicationReminders,
    healthVault,
    bookDoctorAppointment,
    registerClinicOrDoctor,
    takeQueueToken,
    addMedicationReminder,
    updateHealthVault,
    triggerEmergencySos,
    formatPrice,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'telehealth' | 'queue' | 'meds' | 'vault'>('telehealth');
  const [bookingDocId, setBookingDocId] = useState<string | null>(null);
  const [consultNotes, setConsultNotes] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [sosActiveMessage, setSosActiveMessage] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  // Register Clinic / Doctor form state
  const [showRegisterHealth, setShowRegisterHealth] = useState(false);
  const [regAccountType, setRegAccountType] = useState<'doctor' | 'clinic'>('doctor');
  const [regName, setRegName] = useState(currentUser.fullName || '');
  const [regLicense, setRegLicense] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('General Medicine');
  const [regHospitalName, setRegHospitalName] = useState('');
  const [regCity, setRegCity] = useState('Lagos');
  const [regAddress, setRegAddress] = useState('');
  const [regFee, setRegFee] = useState<number>(8000);
  const [regLanguages, setRegLanguages] = useState('English, Pidgin');
  const [regDepartments, setRegDepartments] = useState('General Outpatient Clinic, Pediatrics, Lab');
  const [regBusy, setRegBusy] = useState(false);

  // New queue booking state
  const [selectedHospital, setSelectedHospital] = useState('Lagos University Teaching Hospital (LUTH)');
  const [selectedDept, setSelectedDept] = useState('General Outpatient Clinic');

  // New medication form
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');

  // Health vault edit state
  const [isEditingVault, setIsEditingVault] = useState(false);
  const [vaultBloodGroup, setVaultBloodGroup] = useState(healthVault.bloodGroup);
  const [vaultGenotype, setVaultGenotype] = useState(healthVault.genotype);
  const [vaultAllergies, setVaultAllergies] = useState(healthVault.allergies.join(', '));
  const [vaultConditions, setVaultConditions] = useState(healthVault.chronicConditions.join(', '));
  const [vaultEmergencyName, setVaultEmergencyName] = useState(healthVault.emergencyContactName);
  const [vaultEmergencyPhone, setVaultEmergencyPhone] = useState(healthVault.emergencyContactPhone);
  const [vaultNdpaConsent, setVaultNdpaConsent] = useState(false);

  if (!isHealthModalOpen) return null;

  const showToast = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToastBanner({ text, tone });
    setTimeout(() => setToastBanner(null), 4500);
  };

  const verifiedClinicNames = Array.from(
    new Set([
      'Lagos University Teaching Hospital (LUTH)',
      'Lagoon Hospital Lekki',
      'Reddington Multi-Specialist Hospital VI',
      'Korle Bu Teaching Hospital Accra',
      'Nairobi West Hospital Tele-Center',
      ...doctors
        .filter((d) => d.isVerified !== false && (d.accountType === 'clinic' || d.hospitalAffiliation))
        .map((d) => d.accountType === 'clinic' ? d.name : d.hospitalAffiliation)
        .filter(Boolean),
    ])
  );

  const handleSos = () => {
    const res = triggerEmergencySos();
    setSosActiveMessage(res.message);
    setTimeout(() => setSosActiveMessage(null), 6000);
  };

  const handleRegisterHealthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regLicense.trim() || !regAddress.trim()) {
      showToast('Name, MDCN/Facility license number, and address are required.', 'err');
      return;
    }
    setRegBusy(true);
    try {
      const res = await registerClinicOrDoctor({
        accountType: regAccountType,
        name: regName.trim(),
        licenseNumber: regLicense.trim().toUpperCase(),
        specialty: regSpecialty.trim() || 'General Medicine',
        hospitalName: regHospitalName.trim() || regName.trim(),
        city: regCity.trim() || 'Lagos',
        officeAddress: regAddress.trim(),
        consultationFee: Number(regFee) || 5000,
        bio: `Accredited ${regAccountType === 'clinic' ? 'healthcare facility' : 'medical practitioner'} at ${regHospitalName.trim() || regName.trim()}, ${regCity.trim() || 'Lagos'}.`,
        languages: regLanguages.split(',').map((s) => s.trim()).filter(Boolean),
        departments: regDepartments.split(',').map((s) => s.trim()).filter(Boolean),
      });
      showToast(res.message, res.success ? 'ok' : 'err');
      if (res.success) {
        setShowRegisterHealth(false);
        setRegLicense('');
        setRegAddress('');
      }
    } finally {
      setRegBusy(false);
    }
  };

  const handleStartConsult = async (doctor: DoctorProfile) => {
    setBookingBusy(true);
    try {
      const res = await bookDoctorAppointment(doctor.id, consultNotes.trim() || `Telehealth consult with ${doctor.name}`);
      showToast(res.message, res.success ? 'ok' : 'err');
      if (res.success) {
        setBookingDocId(null);
        setConsultNotes('');
      }
    } finally {
      setBookingBusy(false);
    }
  };

  const handleBookToken = () => {
    const res = takeQueueToken(selectedHospital, selectedDept);
    showToast(`🎫 Token ${res.token.tokenNumber} booked at ${selectedHospital}! Position #${res.token.positionInLine} in line.`);
  };

  const handleSaveMedication = () => {
    if (!medName.trim()) return;
    addMedicationReminder({
      medicationName: medName,
      dosage: medDosage || '1 tablet with water',
      frequency: medFrequency || 'Twice daily',
      scheduledTimes: ['08:00', '20:00'],
      remainingDays: 5,
      pharmacyPartner: 'Medplus Lekki Partner Store',
      canReorder: true,
      notes: 'Prescribed refill',
    });
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setShowAddMedForm(false);
    showToast('💊 Medication reminder activated with 1-tap refill!');
  };

  const handleSaveVault = () => {
    if (!vaultNdpaConsent) {
      showToast('Under the NDPA, please check the consent box before saving personal medical records.', 'err');
      return;
    }
    updateHealthVault({
      bloodGroup: vaultBloodGroup as any,
      genotype: vaultGenotype as any,
      allergies: vaultAllergies.split(',').map((s) => s.trim()).filter(Boolean),
      chronicConditions: vaultConditions.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContactName: vaultEmergencyName,
      emergencyContactPhone: vaultEmergencyPhone,
    });
    setIsEditingVault(false);
    showToast('✅ Medical Vault updated and encrypted with temporary emergency QR pass!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header with Emergency Red SOS */}
        <div className="p-4 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-black border-b border-rose-500/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                <HeartPulse className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                  AfriHealth
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Hospital Queuing, Telehealth & EHR Vault
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHealthModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Emergency Red SOS Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleSos}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
            >
              <AlertOctagon className="w-4 h-4 animate-bounce" />
              <span>🚨 1-Tap Medical Emergency SOS (LASAMBUS & Next-of-Kin)</span>
            </button>
          </div>

          {sosActiveMessage && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-2 shadow-md">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-spin" />
              <span>{sosActiveMessage}</span>
            </div>
          )}

          {toastBanner && (
            <div
              className={`mt-2 p-2.5 rounded-xl text-white text-xs font-bold animate-in slide-in-from-top-2 ${
                toastBanner.tone === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {toastBanner.text}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('telehealth')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'telehealth'
                ? 'bg-white dark:bg-black text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-black text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hospital Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meds')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'meds'
                ? 'bg-white dark:bg-black text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Refills</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'vault'
                ? 'bg-white dark:bg-black text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>EHR Vault</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: TELEHEALTH & CLINICS */}
          {activeTab === 'telehealth' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between gap-2">
                <div className="text-[11px] text-rose-900 dark:text-rose-200">
                  <span className="font-bold block">Doctor or Licensed Clinic?</span>
                  <span className="opacity-80">Register with MDCN / Facility License for telehealth & queues.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterHealth((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showRegisterHealth ? 'Close Form' : 'Register Clinic/MD'}</span>
                </button>
              </div>

              {showRegisterHealth && (
                <form
                  onSubmit={handleRegisterHealthSubmit}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-rose-500/30 space-y-2.5 animate-in zoom-in-95"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-rose-500" />
                      <span>AfriHealth Provider Registration</span>
                    </h4>
                    <div className="flex rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setRegAccountType('doctor')}
                        className={`px-2 py-0.5 rounded-md ${regAccountType === 'doctor' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
                      >
                        Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegAccountType('clinic')}
                        className={`px-2 py-0.5 rounded-md ${regAccountType === 'clinic' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
                      >
                        Clinic
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        {regAccountType === 'clinic' ? 'Clinic / Hospital Name' : 'Doctor Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={regAccountType === 'clinic' ? 'Cedar Crest Medical' : 'Dr. Amaka Eze'}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        {regAccountType === 'clinic' ? 'HEFAMAA / CAC Reg No.' : 'MDCN License No.'}
                      </label>
                      <input
                        type="text"
                        required
                        value={regLicense}
                        onChange={(e) => setRegLicense(e.target.value)}
                        placeholder={regAccountType === 'clinic' ? 'FAC/LAG/4821' : 'MDCN/R/41298'}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Specialty</label>
                      <input
                        type="text"
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        placeholder="Family Medicine / Cardiology"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Hospital Affiliation</label>
                      <input
                        type="text"
                        value={regHospitalName}
                        onChange={(e) => setRegHospitalName(e.target.value)}
                        placeholder="Reddington / Independent"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                      <input
                        type="text"
                        required
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Consult Fee (₦)</label>
                      <input
                        type="number"
                        min={1000}
                        value={regFee}
                        onChange={(e) => setRegFee(Number(e.target.value) || 5000)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Clinic / Practice Address</label>
                    <input
                      type="text"
                      required
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="12 Bourdillon Rd, Ikoyi, Lagos"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Languages</label>
                      <input
                        type="text"
                        value={regLanguages}
                        onChange={(e) => setRegLanguages(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Departments</label>
                      <input
                        type="text"
                        value={regDepartments}
                        onChange={(e) => setRegDepartments(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regBusy}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
                  >
                    {regBusy ? 'Submitting...' : 'Submit for Medical Verification'}
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {doctors.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-neutral-950 border border-dashed border-rose-200 dark:border-rose-900/40">
                    <Stethoscope className="w-8 h-8 text-rose-500/60 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white font-display">No Telehealth Doctors On Duty</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Verified doctors & clinics will appear here upon registration & approval.
                    </p>
                  </div>
                ) : (
                  doctors.map((doc) => {
                    const isVerified = doc.isVerified !== false;
                    const isBooking = bookingDocId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={doc.avatar}
                            alt={doc.name}
                            className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-neutral-800"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {doc.name}
                              </h4>
                              {isVerified ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                                  <BadgeCheck className="w-3 h-3" />
                                  <span>{doc.accountType === 'clinic' ? 'Verified Clinic' : 'Verified MD'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300">
                                  Pending Verification
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                              {doc.specialty}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                              {doc.hospitalAffiliation}
                              {doc.licenseNumber ? ` · ${doc.licenseNumber}` : ''}
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-neutral-400 flex-wrap">
                              <span>★ {doc.rating} ({doc.reviewCount})</span>
                              <span>•</span>
                              <span>{doc.languages.join(', ')}</span>
                              {doc.city && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {doc.city}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Consult Fee</span>
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                  {formatPrice(doc.consultationFee, doc.currency)}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={!isVerified}
                                onClick={() => setBookingDocId(isBooking ? null : doc.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Book Consult' : 'Awaiting Review'}</span>
                              </button>
                            </div>

                            {isBooking && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-rose-500/30 space-y-2">
                                <textarea
                                  rows={2}
                                  value={consultNotes}
                                  onChange={(e) => setConsultNotes(e.target.value)}
                                  placeholder="Describe symptoms or questions for the doctor/clinic..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={bookingBusy}
                                    onClick={() => handleStartConsult(doc)}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
                                  >
                                    {bookingBusy
                                      ? 'Booking...'
                                      : `Pay ${formatPrice(doc.consultationFee, doc.currency)} & Start Consult`}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBookingDocId(null)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-neutral-800 text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HOSPITAL QUEUING & DIGITAL TOKEN */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/20 to-purple-950/20 border border-blue-500/30">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Book Digital Queue Token (Skip Waiting Rooms)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
                  Avoid 3-hour waiting room congestion. Take a token from home or office and get live alerts when your turn approaches.
                </p>

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Partner Hospital / Clinic
                    </label>
                    <select
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {verifiedClinicNames.map((clinic) => (
                        <option key={clinic} value={clinic}>
                          {clinic}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Department
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="General Outpatient Clinic">General Outpatient Clinic</option>
                      <option value="Pediatrics & Immunization">Pediatrics & Immunization</option>
                      <option value="Obstetrics & Antenatal">Obstetrics & Antenatal</option>
                      <option value="Diagnostics, Lab & Ultrasound">Diagnostics, Lab & Ultrasound</option>
                      <option value="Cardiology & Hypertension">Cardiology & Hypertension</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookToken}
                    className="w-full mt-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Get Queue Token Now</span>
                  </button>
                </div>
              </div>

              {/* Active Tokens List */}
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                  My Hospital Tokens & Live Status
                </span>

                <div className="space-y-2.5">
                  {queueTokens.map((tok) => (
                    <div
                      key={tok.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
                              {tok.tokenNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tok.status === 'waiting'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {tok.status === 'waiting' ? 'Waiting in Live Queue' : 'Completed'}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                            {tok.hospitalName}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            {tok.department} · {tok.location}
                          </p>
                        </div>

                        {tok.status === 'waiting' && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Serving Now</span>
                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                              {tok.currentlyServing}
                            </span>
                          </div>
                        )}
                      </div>

                      {tok.status === 'waiting' && (
                        <div className="mt-3 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between text-xs">
                          <span className="text-purple-700 dark:text-purple-300 font-medium">
                            Position: <strong>{tok.positionInLine} people ahead</strong>
                          </span>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            ~{tok.estimatedWaitMins} mins wait
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDICATION & REFILL REMINDERS */}
          {activeTab === 'meds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Medication Schedules & Refills
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Never miss a dosage; 1-tap reorder from partner pharmacies
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMedForm(!showAddMedForm)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Drug</span>
                </button>
              </div>

              {showAddMedForm && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2.5 animate-in zoom-in-95">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Add Medication Prescription
                  </h5>
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="Medication name (e.g. Coartem, Ventolin, Metformin)"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="Dosage (e.g. 1 tablet twice daily with food)"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="text"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    placeholder="Times (e.g. Morning 8am & Night 8pm)"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMedication}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                  >
                    Save Reminder
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {medicationReminders.map((med) => (
                  <div
                    key={med.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            {med.medicationName}
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-neutral-300">
                            {med.dosage}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Frequency: {med.frequency}
                          </p>
                          {med.notes && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                              Note: {med.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400">
                        {med.remainingDays} days left
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-900 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                        Partner: {med.pharmacyPartner}
                      </span>

                      {med.canReorder && (
                        <button
                          type="button"
                          onClick={() =>
                            showToast(`🛍️ Refill request sent to ${med.pharmacyPartner}! Gokada courier scheduled.`)
                          }
                          className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>1-Tap Refill</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DIGITAL HEALTH WALLET & EHR VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-b from-purple-900/10 via-white to-white dark:from-purple-950/40 dark:via-neutral-950 dark:to-neutral-950 border border-purple-200 dark:border-purple-900/50 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Encrypted Medical EHR Vault
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingVault(!isEditingVault)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {isEditingVault ? 'Cancel' : 'Edit Details'}
                  </button>
                </div>

                {isEditingVault ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</label>
                        <select
                          value={vaultBloodGroup}
                          onChange={(e) => setVaultBloodGroup(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                        >
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Genotype</label>
                        <select
                          value={vaultGenotype}
                          onChange={(e) => setVaultGenotype(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                        >
                          <option value="AA">AA</option>
                          <option value="AS">AS (Carrier)</option>
                          <option value="SS">SS</option>
                          <option value="AC">AC</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Known Allergies (comma separated)</label>
                      <input
                        type="text"
                        value={vaultAllergies}
                        onChange={(e) => setVaultAllergies(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Chronic Conditions</label>
                      <input
                        type="text"
                        value={vaultConditions}
                        onChange={(e) => setVaultConditions(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Emergency Kin</label>
                        <input
                          type="text"
                          value={vaultEmergencyName}
                          onChange={(e) => setVaultEmergencyName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kin Phone</label>
                        <input
                          type="text"
                          value={vaultEmergencyPhone}
                          onChange={(e) => setVaultEmergencyPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vaultNdpaConsent}
                        onChange={(e) => setVaultNdpaConsent(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I consent under NDPA to store encrypted emergency medical metadata.</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSaveVault}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      Save EHR Vault
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block">Blood Group</span>
                        <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                          {healthVault.bloodGroup}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block">Genotype</span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                          {healthVault.genotype}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">ALLERGIES</span>
                      <div className="flex flex-wrap gap-1">
                        {healthVault.allergies.map((alg, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold">
                            ⚠️ {alg}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">CHRONIC CONDITIONS</span>
                      <div className="flex flex-wrap gap-1">
                        {healthVault.chronicConditions.map((cond, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                            {cond}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                        <span className="font-bold text-slate-900 dark:text-white">{healthVault.emergencyContactName}</span>
                      </div>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{healthVault.emergencyContactPhone}</span>
                    </div>

                    {/* Temporary Encrypted Emergency Pass QR */}
                    <div className="mt-3 p-3 rounded-2xl bg-neutral-950 text-white flex items-center gap-3 border border-purple-500/30">
                      <QrCode className="w-12 h-12 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Temporary Emergency Pass QR
                        </span>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Scannable by ambulance medics or ER admitting desk to unlock emergency blood group and allergy profile.
                        </p>
                        <span className="text-[9px] font-mono text-purple-300 font-bold block mt-1">
                          Pass ID: {healthVault.qrCodeId}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
