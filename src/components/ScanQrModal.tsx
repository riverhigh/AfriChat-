import React, { useState } from 'react';
import {
  QrCode,
  Scan,
  X,
  Flashlight,
  FlashlightOff,
  Upload,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  UserPlus,
  Sparkles,
  Camera,
  HeartPulse,
  Store,
  Hash,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ScanQrModal: React.FC = () => {
  const {
    isScanQrModalOpen,
    setIsScanQrModalOpen,
    currentUser,
    addNewDeviceContact,
    setIsHealthModalOpen,
    openCheckout,
    chats,
    setActiveChatId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'scan' | 'my_qr'>('scan');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [maskPhoneInQr, setMaskPhoneInQr] = useState(true);
  const [inputUidOrPhone, setInputUidOrPhone] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  if (!isScanQrModalOpen) return null;

  const cleanUsername = currentUser.fullName
    ? `@${currentUser.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : '@afri_user';

  const userUniqueUid = `AFRI-${(currentUser.phoneNumber || '8842').slice(-4)}-LAGOS`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(`https://africhat.app/u/${cleanUsername.replace('@', '')}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddByUidOrPhone = () => {
    if (!inputUidOrPhone.trim()) return;
    const isPhone = /^[+\d]/.test(inputUidOrPhone);
    const contactName = isPhone ? `Contact ${inputUidOrPhone.slice(-4)}` : inputUidOrPhone;
    addNewDeviceContact(contactName, inputUidOrPhone, 'Added via Unique QR Scanner');
    setScanSuccessMessage(`✅ Contact "${contactName}" added to your AfriChat contacts!`);
    setInputUidOrPhone('');
    setTimeout(() => setScanSuccessMessage(null), 3000);
  };

  const handleSimulateScan = (type: 'contact' | 'merchant' | 'health' | 'channel') => {
    if (type === 'contact') {
      addNewDeviceContact('Chief Segun (Alaba Market)', '+2348039871122', 'Alaba Electronics Importer');
      setScanSuccessMessage('✅ QR Scanned: "Chief Segun (Alaba Market)" added to your contacts!');
    } else if (type === 'merchant') {
      const match = chats[0];
      if (match?.catalog?.[0]) {
        setIsScanQrModalOpen(false);
        openCheckout(match.catalog[0]);
      } else {
        setScanSuccessMessage('🛒 Merchant Escrow QR Verified: Ready to checkout safely!');
      }
    } else if (type === 'health') {
      setIsScanQrModalOpen(false);
      setIsHealthModalOpen(true);
    } else if (type === 'channel') {
      setScanSuccessMessage('📢 Town Channel QR Scanned: Joined "AfriTech Pulse"!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-neutral-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scan & AfriChat QR Code
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                Connect contacts, scan merchants, and view your UID
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScanQrModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-neutral-900 mx-4 mt-3 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_qr')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'my_qr'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>My Unique QR & UID</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {scanSuccessMessage && (
          <div className="mx-4 mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in slide-in-from-top-2">
            {scanSuccessMessage}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'scan' ? (
            <div className="flex flex-col items-center">
              {/* Interactive Camera Viewfinder */}
              <div className="relative w-full aspect-square max-w-[280px] rounded-3xl overflow-hidden bg-neutral-950 border-2 border-purple-500/40 shadow-inner flex flex-col items-center justify-center p-4">
                {/* Simulated Camera Feed Background Texture */}
                <div className="absolute inset-0 bg-radial from-neutral-900 to-black opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

                {/* Corner Finder Brackets */}
                <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />

                {/* Animated Laser Scanning Beam */}
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#a855f7] animate-pulse" />

                <div className="relative z-10 text-center px-4">
                  <Scan className="w-10 h-10 text-purple-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-white/90 font-medium">
                    Point camera at AfriChat QR code
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    Contacts · Escrow Stores · Health Pass · Channels
                  </p>
                </div>

                {/* Controls overlay */}
                <div className="absolute bottom-3 inset-x-4 flex items-center justify-between z-20">
                  <button
                    type="button"
                    onClick={() => setFlashlightOn(!flashlightOn)}
                    className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors"
                    title="Toggle Flashlight"
                  >
                    {flashlightOn ? (
                      <Flashlight className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FlashlightOff className="w-4 h-4 text-white/70" />
                    )}
                  </button>

                  <label className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors cursor-pointer" title="Scan Image from Gallery">
                    <Upload className="w-4 h-4 text-white/70" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={() => {
                        handleSimulateScan('contact');
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Instant Test Triggers for Scanner */}
              <div className="w-full mt-4">
                <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider block mb-2">
                  Simulate QR Scan In AI Studio:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan('contact')}
                    className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-left border border-purple-200 dark:border-purple-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Contact QR</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Chief Segun (Alaba)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('merchant')}
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-left border border-emerald-200 dark:border-emerald-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <Store className="w-3.5 h-3.5" />
                      <span>Escrow Store QR</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Verify & Pay Escrow
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('health')}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-left border border-rose-200 dark:border-rose-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>Health Pass QR</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      EHR Emergency Vault
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('channel')}
                    className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-left border border-blue-200 dark:border-blue-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                      <Hash className="w-3.5 h-3.5" />
                      <span>Town Channel</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      AfriTech Daily
                    </div>
                  </button>
                </div>
              </div>

              {/* Add by UID / Phone input */}
              <div className="w-full mt-3 p-3 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Add Contact by AfriChat UID or Phone
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputUidOrPhone}
                    onChange={(e) => setInputUidOrPhone(e.target.value)}
                    placeholder="e.g. AFRI-8842-LAGOS or +234..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddByUidOrPhone}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 transition-transform active:scale-95 shadow-xs"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* My Unique QR Code & UID Card */
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[300px] p-5 rounded-3xl bg-gradient-to-b from-purple-900/10 via-white to-white dark:from-purple-950/40 dark:via-neutral-950 dark:to-neutral-950 border border-purple-200 dark:border-purple-900/50 shadow-xl flex flex-col items-center text-center relative">
                {/* User Avatar */}
                <div className="relative mb-2">
                  <img
                    src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"}
                    alt={currentUser.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                    ✓
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.fullName || 'AfriChat User'}
                </h4>
                <p className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {cleanUsername}
                </p>

                {/* High Contrast Clean SVG QR Code */}
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-neutral-800 my-3">
                  <svg className="w-44 h-44 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corner Position Targets */}
                    <rect x="5" y="5" width="25" height="25" rx="4" fill="#581c87" />
                    <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                    <rect x="13" y="13" width="9" height="9" fill="#581c87" />

                    <rect x="70" y="5" width="25" height="25" rx="4" fill="#581c87" />
                    <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                    <rect x="78" y="13" width="9" height="9" fill="#581c87" />

                    <rect x="5" y="70" width="25" height="25" rx="4" fill="#581c87" />
                    <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                    <rect x="13" y="78" width="9" height="9" fill="#581c87" />

                    {/* Data Matrix Dots */}
                    <rect x="35" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="45" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="55" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="35" y="18" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="55" y="18" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="8" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="18" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="28" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="38" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="58" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="68" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="78" y="35" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="88" y="35" width="6" height="6" rx="1" fill="#0f172a" />

                    {/* Center Branding Badge */}
                    <rect x="40" y="40" width="20" height="20" rx="4" fill="#9333ea" />
                    <text x="50" y="54" fontSize="11" fill="white" fontWeight="bold" textAnchor="middle">AC</text>

                    {/* Bottom Matrix */}
                    <rect x="35" y="65" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="45" y="65" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="55" y="65" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="75" y="65" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="85" y="65" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="35" y="75" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="55" y="75" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="65" y="75" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="85" y="75" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="35" y="85" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="45" y="85" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="65" y="85" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="75" y="85" width="6" height="6" rx="1" fill="#0f172a" />
                  </svg>
                </div>

                {/* Unique AfriChat UID */}
                <div className="w-full bg-slate-100 dark:bg-neutral-900 py-1.5 px-3 rounded-xl flex items-center justify-between font-mono text-xs font-bold text-slate-800 dark:text-neutral-200">
                  <span className="text-[10px] text-slate-400">UID:</span>
                  <span>{userUniqueUid}</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1 text-purple-600 hover:text-purple-700"
                    title="Copy UID"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Privacy Toggle: Mask Phone */}
                <div className="mt-3 w-full flex items-center justify-between text-left text-[11px] text-slate-500 dark:text-neutral-400">
                  <span>Mask phone in QR (show username)</span>
                  <input
                    type="checkbox"
                    checked={maskPhoneInQr}
                    onChange={(e) => setMaskPhoneInQr(e.target.checked)}
                    className="rounded accent-purple-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[300px] grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert(`QR Code for "${cleanUsername}" saved to device gallery!`)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
