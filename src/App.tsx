import React, { useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, LogIn } from 'lucide-react';
import { SplashScreen } from './components/SplashScreen';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ChatList } from './components/ChatList';
import { ActiveChat } from './components/ActiveChat';
import { StatusView } from './components/StatusView';
import { StatusViewerModal } from './components/StatusViewerModal';
import { MarketplaceView } from './components/MarketplaceView';
import { CallsView } from './components/CallsView';
import { ActiveCallModal } from './components/ActiveCallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { IncomingContactRequestModal } from './components/IncomingContactRequestModal';
import { SettingsView } from './components/SettingsView';
import { TownView } from './components/TownView';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { EscrowModal } from './components/EscrowModal';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { WalletModal } from './components/WalletModal';
import { MemeStickerStudioModal } from './components/MemeStickerStudioModal';
import { AudioSpaceModal } from './components/AudioSpaceModal';
import { AudioSpaceBar } from './components/AudioSpaceBar';
import { ScamReputationModal } from './components/ScamReputationModal';
import { InvoiceGeneratorModal } from './components/InvoiceGeneratorModal';
import { InvoiceViewerModal } from './components/InvoiceViewerModal';
import { FinancialPollModal } from './components/FinancialPollModal';
import { AjoLedgerModal } from './components/AjoLedgerModal';
import { AuthModal } from './components/AuthModal';
import { ContactsModal } from './components/ContactsModal';
import { DispatchModal } from './components/DispatchModal';
import { JobBoardModal } from './components/JobBoardModal';
import { SecurityModal } from './components/SecurityModal';
import { ServicesBookingModal } from './components/ServicesBookingModal';
import { DelayedTransferModal } from './components/DelayedTransferModal';
import { PayrollModal } from './components/PayrollModal';
import { ScanQrModal } from './components/ScanQrModal';
import { HealthcareModal } from './components/HealthcareModal';
import { LegalModal } from './components/LegalModal';
import { DisplayWallpaperModal } from './components/DisplayWallpaperModal';
import { CreatorModal } from './components/CreatorModal';
import { ReferralModal } from './components/ReferralModal';
import { CelebrityVerificationModal } from './components/CelebrityVerificationModal';
import { StoreRegistrationModal } from './components/StoreRegistrationModal';
import { WritersGuildModal } from './components/WritersGuildModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { TutorCoursesModal } from './components/TutorCoursesModal';
import { PetShopModal } from './components/PetShopModal';
import { WhatsAppPhoneAuth } from './components/WhatsAppPhoneAuth';
import { PhoneSignUpBanner } from './components/PhoneSignUpBanner';
import { ErrandsModal } from './components/ErrandsModal';
import { CallErrorBoundary } from './components/CallErrorBoundary';
import { ChatErrorBoundary } from './components/ChatErrorBoundary';

const AppContent: React.FC = () => {
  const { activeChatId, setActiveChatId, activeTab, setActiveTab, isAuthenticated, isKickedOut, endCall, isPetShopModalOpen, setIsPetShopModalOpen, isFeatureEnabled, isBanned, banInfo, systemConfig, currentUser } = useApp();
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('agc_splash_shown'));
  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('agc_splash_shown', 'true');
    setShowSplash(false);
  }, []);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  React.useEffect(() => {
    const handleResize = () => setIsTablet(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-redirect if active tab's feature is toggled OFF by admin
  React.useEffect(() => {
    if (activeTab === 'status' && !isFeatureEnabled('status')) {
      setActiveTab('chats');
    } else if (activeTab === 'calls' && !isFeatureEnabled('calls')) {
      setActiveTab('chats');
    } else if (activeTab === 'town' && !isFeatureEnabled('town')) {
      setActiveTab('chats');
    } else if (activeTab === 'market' && !isFeatureEnabled('market')) {
      setActiveTab('chats');
    }
  }, [activeTab, isFeatureEnabled, setActiveTab]);

  // Render SplashScreen overlay before anything else (shows once per session)
  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  // ── Kicked-out screen: shown when another device logs in with this number ──
  if (isKickedOut) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#06020d] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-rose-700/15 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-xs space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight">Logged Out</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your account was signed in on <strong className="text-white">another device</strong>.
              For your security, you have been logged out from this device.
            </p>
          </div>
          <div className="p-4 bg-rose-500/8 border border-rose-500/20 rounded-2xl text-xs text-slate-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-2" />
            AGC enforces <strong className="text-white">one active session per number</strong> to protect your account.
            If this wasn't you, your account may be compromised.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-700/30 active:scale-[0.98] transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // Show WhatsApp Phone registration screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <PhoneSignUpBanner />
        <WhatsAppPhoneAuth />
      </>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-900/10 dark:bg-black flex justify-center overflow-hidden text-slate-900 dark:text-white font-sans transition-colors select-none">
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-full md:h-[95vh] md:my-auto md:rounded-3xl bg-white dark:bg-black shadow-2xl flex flex-col relative overflow-hidden border-x md:border border-slate-200/50 dark:border-neutral-800">
        {/* Floating Street Radio bar when active in background */}
        <AudioSpaceBar />

        {/* Master-Detail Split on Tablet & Wide Displays for Chats */}
        {isTablet && activeTab === 'chats' ? (
          <div className="flex flex-row w-full h-full overflow-hidden">
            {/* Master: Left Chat List pane */}
            <div className="w-80 lg:w-96 shrink-0 h-full flex flex-col border-r border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden relative">
              <Header onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <ChatList />
              </div>
              <BottomNav />
            </div>

            {/* Detail: Right Active Chat pane */}
            <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-neutral-950 overflow-hidden relative">
              {activeChatId ? (
                <ChatErrorBoundary onReset={() => setActiveChatId(null)}>
                  <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
                </ChatErrorBoundary>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                  <div className="w-20 h-20 rounded-3xl bg-purple-600/10 dark:bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/10">
                    <img src="/icon-192.png" alt="AfriChat" className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                  </div>
                  <h3 className="text-xl font-black font-display text-slate-900 dark:text-white mb-2">
                    AfriChat Web &amp; Tablet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-sm mb-6 leading-relaxed">
                    Select a conversation from the list to start messaging, sending voice notes, or making calls.
                  </p>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <span>🔒 End-to-End Encrypted (AES-GCM 256)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single Column Mobile / Smartwatch View or Non-Chat Tabs */
          activeChatId ? (
            <ChatErrorBoundary onReset={() => setActiveChatId(null)}>
              <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
            </ChatErrorBoundary>
          ) : (
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              <Header onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />

              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                {activeTab === 'status' && isFeatureEnabled('status') && <StatusView />}
                {activeTab === 'calls' && isFeatureEnabled('calls') && <CallsView />}
                {activeTab === 'town' && isFeatureEnabled('town') && <TownView />}
                {activeTab === 'chats' && <ChatList />}
                {activeTab === 'settings' && (
                  <SettingsView
                    onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                    onOpenDisplayModal={() => setIsDisplayModalOpen(true)}
                  />
                )}
                {activeTab === 'market' && isFeatureEnabled('market') && <MarketplaceView />}
              </main>

              <BottomNav />
            </div>
          )
        )}

        {/* Global Modals & Interactive Overlays */}
        <StatusViewerModal />
        <CallErrorBoundary onReset={endCall}>{"\n"}<ActiveCallModal />{"\n"}</CallErrorBoundary>
        <IncomingCallModal />
        <IncomingContactRequestModal />
        <CheckoutDrawer />
        {isFeatureEnabled('escrow') && <EscrowModal />}
        {isFeatureEnabled('voiceNotes') && (
          <VoiceRecorderModal
            isOpen={isVoiceRecorderOpen}
            onClose={() => setIsVoiceRecorderOpen(false)}
          />
        )}
        <LanguageSelectorModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
        />
        {isFeatureEnabled('wallet') && <WalletModal />}

        {/* African Super-App Features - Disappear completely when toggled off */}
        {isFeatureEnabled('memeStudio') && <MemeStickerStudioModal />}
        {isFeatureEnabled('audioSpaces') && <AudioSpaceModal />}
        {isFeatureEnabled('scamChecker') && <ScamReputationModal />}
        {isFeatureEnabled('wallet') && <InvoiceGeneratorModal />}
        {isFeatureEnabled('wallet') && <InvoiceViewerModal />}
        {isFeatureEnabled('wallet') && <FinancialPollModal />}
        {isFeatureEnabled('ajo') && <AjoLedgerModal />}

        {/* AGC Carrier Phone Auth, Contacts Discovery & Super-App Extensions */}
        <AuthModal />
        <ContactsModal />
        {isFeatureEnabled('dispatch') && <DispatchModal />}
        {isFeatureEnabled('errands') && <ErrandsModal />}
        {isFeatureEnabled('jobs') && <JobBoardModal />}
        {isFeatureEnabled('securityPin') && <SecurityModal />}

        {/* Services Booking, 1-2 Days Delayed Transfers & Payroll Auto-Debit */}
        {isFeatureEnabled('artisan') && <ServicesBookingModal />}
        {isFeatureEnabled('delayedSend') && <DelayedTransferModal />}
        {isFeatureEnabled('payroll') && <PayrollModal />}

        {/* Scan QR & Unique UID Modal */}
        <ScanQrModal />

        {/* AfriHealth: Hospital Queuing, Telehealth & EHR Vault */}
        {isFeatureEnabled('healthcare') && <HealthcareModal />}

        {/* AfriLaw: Smart Contracts, Legal SOS & CAC Tracker */}
        {isFeatureEnabled('legal') && <LegalModal />}

        {/* Text Size Scale & Device Background Upload Modal */}
        <DisplayWallpaperModal
          isOpen={isDisplayModalOpen}
          onClose={() => setIsDisplayModalOpen(false)}
        />

        {/* AfriCreator: Subscriptions, Show Tickets & Direct Music Drops */}
        {isFeatureEnabled('creator') && <CreatorModal />}

        {/* Anti-Ghost Referral & Invite System */}
        {isFeatureEnabled('referral') && <ReferralModal />}

        {/* Celebrity Identity Verification Badge Modal */}
        <CelebrityVerificationModal />

        {/* Merchant Store Registration & Tiers */}
        {isFeatureEnabled('storeTiers') && <StoreRegistrationModal />}

        {/* African Writers Guild (Chapters, Buddy Read, Anti-AI Guarantee) */}
        {isFeatureEnabled('writers') && <WritersGuildModal />}

        {/* Super Admin Console & Moderation Desk (Always Available to Admin) */}
        <AdminDashboardModal />

        {isFeatureEnabled('tutor') && <TutorCoursesModal />}

        {/* African Pets Forum & Pet Shop Marketplace */}
        {isFeatureEnabled('petShop') && (
          <PetShopModal
            isOpen={isPetShopModalOpen}
            onClose={() => setIsPetShopModalOpen(false)}
          />
        )}
        {/* Permanent Ban Lockdown Screen */}
        {isBanned && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-xl text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-rose-600/20 border-2 border-rose-500/80 flex items-center justify-center mb-5 shadow-2xl shadow-rose-600/40">
              <span className="text-4xl">🚫</span>
            </div>
            <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-black uppercase tracking-wider bg-rose-600 text-white mb-2 shadow-sm">
              Account Permanently Banned
            </span>
            <h2 className="text-2xl font-black text-white font-display mb-2">
              Platform Access Terminated
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
              Your registered phone number <strong className="text-white font-mono">{currentUser?.phoneNumber || 'on record'}</strong> has been permanently blocked from accessing the AfriChat super-app platform.
            </p>
            {banInfo?.reason && (
              <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-200 max-w-md w-full mb-6 text-left shadow-inner">
                <div className="font-bold text-rose-400 mb-0.5 text-[11px] uppercase tracking-wide">Official Ban Reason:</div>
                <div className="leading-relaxed">{banInfo.reason}</div>
                {banInfo.bannedAt && (
                  <div className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-rose-900/40">
                    Enacted: {new Date(banInfo.bannedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <a
                href={`tel:${systemConfig?.supportContactPhone || '+234800000000'}`}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Call Security Desk</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all text-center border border-slate-700"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
