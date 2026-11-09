import React, { useState } from 'react';
import {
  HeartPulse,
  Stethoscope,
  Clock,
  Pill,
  Shield,
  ShieldCheck,
  AlertOctagon,
  ChevronRight,
  Phone,
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  X,
  Plus,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Mic,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DoctorProfile, HospitalQueueToken, MedicationReminder } from '../types';

export const HealthcareModal: React.FC = () => {
  const {
    isHealthModalOpen,
    setIsHealthModalOpen,
    doctors,
    queueTokens,
    medicationReminders,
    healthVault,
    bookDoctorAppointment,
    takeQueueToken,
    addMedicationReminder,
    updateHealthVault,
    triggerEmergencySos,
    formatPrice,
    chats,
    setActiveChatId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'telehealth' | 'queue' | 'meds' | 'vault'>('telehealth');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [consultNotes, setConsultNotes] = useState('');
  const [sosActiveMessage, setSosActiveMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  if (!isHealthModalOpen) return null;

  const handleSos = () => {
    const res = triggerEmergencySos();
    setSosActiveMessage(res.message);
    setTimeout(() => setSosActiveMessage(null), 6000);
  };

  const handleStartConsult = (doctor: DoctorProfile) => {
    const res = bookDoctorAppointment(doctor.id, consultNotes);
    // Find or link a chat
    const doctorChat = chats.find((c) => c.name.toLowerCase().includes('doctor') || c.name.toLowerCase().includes('dr')) || chats[0];
    if (doctorChat) {
      setIsHealthModalOpen(false);
      setActiveChatId(doctorChat.id);
    } else {
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleBookToken = () => {
    const res = takeQueueToken(selectedHospital, selectedDept);
    setSuccessToast(`🎫 Token ${res.token.tokenNumber} booked! You are #${res.token.positionInLine} in line. Wait safely at home!`);
    setTimeout(() => setSuccessToast(null), 4000);
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
    setSuccessToast('💊 Medication reminder activated with 1-tap refill!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSaveVault = () => {
    updateHealthVault({
      bloodGroup: vaultBloodGroup as any,
      genotype: vaultGenotype as any,
      allergies: vaultAllergies.split(',').map((s) => s.trim()).filter(Boolean),
      chronicConditions: vaultConditions.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContactName: vaultEmergencyName,
      emergencyContactPhone: vaultEmergencyPhone,
    });
    setIsEditingVault(false);
    setSuccessToast('✅ Medical Vault updated and encrypted with temporary emergency QR pass!');
    setTimeout(() => setSuccessToast(null), 3000);
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

          {successToast && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold animate-in slide-in-from-top-2">
              {successToast}
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
          {/* TAB 1: TELEHEALTH & ASK A DOCTOR */}
          {activeTab === 'telehealth' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-200">
                <span className="font-bold">🔒 Low-Data Telehealth:</span> Send symptoms, voice notes, and lab photos with ultra-low compression for 3G networks. Consult licensed African medical practitioners.
              </div>

              <div className="space-y-3">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="w-13 h-13 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {doc.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Verified Doctor ✓
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                          {doc.specialty}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                          {doc.hospitalAffiliation}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-neutral-400">
                          <span>★ {doc.rating} ({doc.reviewCount})</span>
                          <span>•</span>
                          <span>Languages: {doc.languages.join(', ')}</span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-1 line-clamp-2">
                          {doc.bio}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-900">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Consult Fee</span>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {formatPrice(doc.consultationFee, doc.currency)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartConsult(doc)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Start Consult</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <option value="Lagos University Teaching Hospital (LUTH)">Lagos University Teaching Hospital (LUTH)</option>
                      <option value="Lagoon Hospital Lekki">Lagoon Hospital Lekki Phase 1</option>
                      <option value="Reddington Multi-Specialist Hospital VI">Reddington Hospital Victoria Island</option>
                      <option value="Korle Bu Teaching Hospital Accra">Korle Bu Teaching Hospital (Accra Annex)</option>
                      <option value="Nairobi West Hospital Tele-Center">Nairobi West Hospital Hub</option>
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
                          onClick={() => {
                            setSuccessToast(`🛍️ Refill request sent to ${med.pharmacyPartner}! Gokada courier scheduled.`);
                            setTimeout(() => setSuccessToast(null), 3000);
                          }}
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
