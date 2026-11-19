import React, { useState, Suspense } from 'react';
import { ShieldCheck, AlertTriangle, LogIn, PhoneMissed, VideoOff, Phone, Video, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { CallErrorBoundary } from './components/CallErrorBoundary';
import { ChatErrorBoundary } from './components/ChatErrorBoundary';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PhoneSignUpBanner } from './components/PhoneSignUpBanner';
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';

import { WhatsAppPhoneAuth } from './components/WhatsAppPhoneAuth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ChatList } from './components/ChatList';

const lazyNamed = <T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string
) =>
  React.lazy(() =>
    loader().then((mod) => ({
      default: (mod[exportName] || mod.default) as T,
    }))
  );

// Secondary views loaded on demand
const ActiveChat = lazyNamed(() => import('./components/ActiveChat'), 'ActiveChat');
const StatusView = lazyNamed(() => import('./components/StatusView'), 'StatusView');
const MarketplaceView = lazyNamed(() => import('./components/MarketplaceView'), 'MarketplaceView');
const CallsView = lazyNamed(() => import('./components/CallsView'), 'CallsView');
const SettingsView = lazyNamed(() => import('./components/SettingsView'), 'SettingsView');
const TownView = lazyNamed(() => import('./components/TownView'), 'TownView');

// On-demand modals & overlays (only downloaded when opened/triggered)
const StatusViewerModal = lazyNamed(() => import('./components/StatusViewerModal'), 'StatusViewerModal');
const ActiveCallModal = lazyNamed(() => import('./components/ActiveCallModal'), 'ActiveCallModal');
const IncomingCallModal = lazyNamed(() => import('./components/IncomingCallModal'), 'IncomingCallModal');
const IncomingContactRequestModal = lazyNamed(() => import('./components/IncomingContactRequestModal'), 'IncomingContactRequestModal');
const IncomingGroupInviteModal = lazyNamed(() => import('./components/IncomingGroupInviteModal'), 'IncomingGroupInviteModal');
const CheckoutDrawer = lazyNamed(() => import('./components/CheckoutDrawer'), 'CheckoutDrawer');
const EscrowModal = lazyNamed(() => import('./components/EscrowModal'), 'EscrowModal');
const VoiceRecorderModal = lazyNamed(() => import('./components/VoiceRecorderModal'), 'VoiceRecorderModal');
const LanguageSelectorModal = lazyNamed(() => import('./components/LanguageSelectorModal'), 'LanguageSelectorModal');
const WalletModal = lazyNamed(() => import('./components/WalletModal'), 'WalletModal');
const CreditCelebrationModal = lazyNamed(() => import('./components/CreditCelebrationModal'), 'CreditCelebrationModal');
const MemeStickerStudioModal = lazyNamed(() => import('./components/MemeStickerStudioModal'), 'MemeStickerStudioModal');
const AudioSpaceModal = lazyNamed(() => import('./components/AudioSpaceModal'), 'AudioSpaceModal');
const AudioSpaceBar = lazyNamed(() => import('./components/AudioSpaceBar'), 'AudioSpaceBar');
const SpacesDashboard = lazyNamed(() => import('./components/SpacesDashboard'), 'SpacesDashboard');
const ScamReputationModal = lazyNamed(() => import('./components/ScamReputationModal'), 'ScamReputationModal');
const InvoiceGeneratorModal = lazyNamed(() => import('./components/InvoiceGeneratorModal'), 'InvoiceGeneratorModal');
const InvoiceViewerModal = lazyNamed(() => import('./components/InvoiceViewerModal'), 'InvoiceViewerModal');
const FinancialPollModal = lazyNamed(() => import('./components/FinancialPollModal'), 'FinancialPollModal');
const QuickPollModal = lazyNamed(() => import('./components/QuickPollModal'), 'QuickPollModal');
const GameXoChallengeModal = lazyNamed(() => import('./components/GameXoChallengeModal'), 'GameXoChallengeModal');
const ShareLocationModal = lazyNamed(() => import('./components/ShareLocationModal'), 'ShareLocationModal');
const AjoLedgerModal = lazyNamed(() => import('./components/AjoLedgerModal'), 'AjoLedgerModal');
const AuthModal = lazyNamed(() => import('./components/AuthModal'), 'AuthModal');
const ContactsModal = lazyNamed(() => import('./components/ContactsModal'), 'ContactsModal');
const DispatchModal = lazyNamed(() => import('./components/DispatchModal'), 'DispatchModal');
const ErrandsModal = lazyNamed(() => import('./components/ErrandsModal'), 'ErrandsModal');
const JobBoardModal = lazyNamed(() => import('./components/JobBoardModal'), 'JobBoardModal');
const TaskToEarnModal = lazyNamed(() => import('./components/TaskToEarnModal'), 'TaskToEarnModal');
const SecurityModal = lazyNamed(() => import('./components/SecurityModal'), 'SecurityModal');
const ServicesBookingModal = lazyNamed(() => import('./components/ServicesBookingModal'), 'ServicesBookingModal');
const SendBillModal = lazyNamed(() => import('./components/SendBillModal'), 'SendBillModal');
const PayrollModal = lazyNamed(() => import('./components/PayrollModal'), 'PayrollModal');
const ScanQrModal = lazyNamed(() => import('./components/ScanQrModal'), 'ScanQrModal');
const HealthcareModal = lazyNamed(() => import('./components/HealthcareModal'), 'HealthcareModal');
const LegalModal = lazyNamed(() => import('./components/LegalModal'), 'LegalModal');
const DisplayWallpaperModal = lazyNamed(() => import('./components/DisplayWallpaperModal'), 'DisplayWallpaperModal');
const CreatorModal = lazyNamed(() => import('./components/CreatorModal'), 'CreatorModal');
const ReferralModal = lazyNamed(() => import('./components/ReferralModal'), 'ReferralModal');
const CelebrityVerificationModal = lazyNamed(() => import('./components/CelebrityVerificationModal'), 'CelebrityVerificationModal');
const StoreRegistrationModal = lazyNamed(() => import('./components/StoreRegistrationModal'), 'StoreRegistrationModal');
const WritersGuildModal = lazyNamed(() => import('./components/WritersGuildModal'), 'WritersGuildModal');
const AdminDashboardModal = lazyNamed(() => import('./components/AdminDashboardModal'), 'AdminDashboardModal');
const TutorCoursesModal = lazyNamed(() => import('./components/TutorCoursesModal'), 'TutorCoursesModal');
const PetShopModal = lazyNamed(() => import('./components/PetShopModal'), 'PetShopModal');

const TabFallback: React.FC = () => (
  <div className="flex-1 h-full min-h-[240px] flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#090414] text-slate-600 dark:text-purple-200">
    <div className="w-7 h-7 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
    <span className="text-xs font-medium tracking-wide opacity-80">Loading view…</span>
  </div>
);

const AppContent: React.FC = () => {
  const {
    activeChatId,
    setActiveChatId,
    activeTab,
    setActiveTab,
    isAuthenticated,
    isKickedOut,
    endCall,
    declineIncomingCall,
    startCall,
    missedCallNotice,
    dismissMissedCallNotice,
    isFeatureEnabled,
    isBanned,
    banInfo,
    systemConfig,
    currentUser,
    // Modal open flags so lazy chunks only download when opened
    activeViewingStatus,
    activeCall,
    incomingCall,
    activeContactRequestPopup,
    activeGroupInvitePopup,
    activeCheckoutProduct,
    activeEscrowModalOrder,
    activeCreditAlert,
    activeAudioSpace,
    isAudioSpaceMinimized,
    spaceEndedSummary,
    isWalletModalOpen,
    isMemeStudioOpen,
    isSpacesDashboardOpen,
    setIsSpacesDashboardOpen,
    isScamCheckerModalOpen,
    isInvoiceGeneratorOpen,
    viewingInvoice,
    isFinancialPollModalOpen,
    isQuickPollModalOpen,
    isGameXoModalOpen,
    isShareLocationModalOpen,
    isAjoModalOpen,
    isAuthModalOpen,
    isContactsModalOpen,
    isDispatchModalOpen,
    isErrandsModalOpen,
    isJobBoardModalOpen,
    isTaskEarnModalOpen,
    isSecurityModalOpen,
    isServicesModalOpen,
    isSendBillModalOpen,
    isPayrollModalOpen,
    isScanQrModalOpen,
    isHealthModalOpen,
    isLegalModalOpen,
    isCreatorModalOpen,
    isReferralModalOpen,
    isCelebrityModalOpen,
    isStoreRegModalOpen,
    isWritersModalOpen,
    isAdminModalOpen,
    setIsAdminModalOpen,
    isTutorModalOpen,
    isPetShopModalOpen,
    setIsPetShopModalOpen,
  } = useApp();

  const maintenanceTapRef = React.useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });
  const handleMaintenanceLogoTap = () => {
    const now = Date.now();
    if (now - maintenanceTapRef.current.lastAt > 2500) {
      maintenanceTapRef.current = { count: 1, lastAt: now };
    } else {
      maintenanceTapRef.current.count += 1;
      maintenanceTapRef.current.lastAt = now;
    }
    if (maintenanceTapRef.current.count >= 7) {
      maintenanceTapRef.current = { count: 0, lastAt: 0 };
      setIsAdminModalOpen(true);
    }
  };

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

  // ── Global Maintenance Mode Lockout (Live Admin System Config) ──
  if (systemConfig?.maintenanceMode && currentUser?.role !== 'admin') {
    return (
      <>
        <div className="fixed inset-0 z-[90] bg-[#06020d] flex flex-col items-center justify-center p-6 text-white text-center select-none">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-700/20 rounded-full blur-[130px]" />
          </div>
          <div className="relative z-10 max-w-sm space-y-5">
            <div
              onClick={handleMaintenanceLogoTap}
              className="w-20 h-20 rounded-3xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-purple-900/40"
            >
              <img src="/icon-192.png" alt="AGC" className="w-12 h-12 rounded-2xl object-cover" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Scheduled Maintenance
              </span>
              <h2 className="text-2xl font-black tracking-tight font-display">
                AfriChat is Updating
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {systemConfig.maintenanceMessage || 'AfriChat is undergoing scheduled system upgrades. We will be back shortly.'}
              </p>
            </div>
            {systemConfig.supportContactPhone && (
              <a
                href={`tel:${systemConfig.supportContactPhone}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-700/30 transition-all"
              >
                <span>Support Desk: {systemConfig.supportContactPhone}</span>
              </a>
            )}
          </div>
        </div>
        {isAdminModalOpen && (
          <Suspense fallback={null}>
            <AdminDashboardModal />
          </Suspense>
        )}
      </>
    );
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
        <OfflineIndicator />
        <PhoneSignUpBanner />
        <WhatsAppPhoneAuth />
        {isAdminModalOpen && (
          <Suspense fallback={null}>
            <AdminDashboardModal />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-900/10 dark:bg-black flex justify-center overflow-hidden text-slate-900 dark:text-white font-sans transition-colors select-none">
      <OfflineIndicator />
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-full md:h-[95vh] md:my-auto md:rounded-3xl bg-white dark:bg-black shadow-2xl flex flex-col relative overflow-hidden border-x md:border border-slate-200/50 dark:border-neutral-800">
        {/* Floating Street Radio bar when active in background */}
        {activeAudioSpace && isAudioSpaceMinimized && (
          <Suspense fallback={null}>
            <AudioSpaceBar />
          </Suspense>
        )}

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
                  <Suspense fallback={<TabFallback />}>
                    <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
                  </Suspense>
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
              <Suspense fallback={<TabFallback />}>
                <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
              </Suspense>
            </ChatErrorBoundary>
          ) : (
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              <Header onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />

              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                {activeTab === 'chats' ? (
                  <ChatList />
                ) : (
                  <ChatErrorBoundary onReset={() => setActiveTab('chats')}>
                    <Suspense fallback={<TabFallback />}>
                      {activeTab === 'status' && isFeatureEnabled('status') && <StatusView />}
                      {activeTab === 'calls' && isFeatureEnabled('calls') && <CallsView />}
                      {activeTab === 'town' && isFeatureEnabled('town') && <TownView />}
                      {activeTab === 'settings' && (
                        <SettingsView
                          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                          onOpenDisplayModal={() => setIsDisplayModalOpen(true)}
                        />
                      )}
                      {activeTab === 'market' && isFeatureEnabled('market') && <MarketplaceView />}
                    </Suspense>
                  </ChatErrorBoundary>
                )}
              </main>

              <BottomNav />
            </div>
          )
        )}

        {/* Global Modals & Interactive Overlays (lazy-loaded only when opened) */}
        <Suspense fallback={null}>
          {activeViewingStatus && <StatusViewerModal />}
          {activeCall && (
            <CallErrorBoundary onReset={endCall}>
              <ActiveCallModal />
            </CallErrorBoundary>
          )}
          {incomingCall && (
            <CallErrorBoundary onReset={declineIncomingCall}>
              <IncomingCallModal />
            </CallErrorBoundary>
          )}
          {missedCallNotice && !incomingCall && !activeCall && (
            <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[75] w-[calc(100%-24px)] max-w-sm rounded-2xl bg-slate-900/95 dark:bg-[#160b29]/95 text-white border border-rose-500/40 shadow-2xl shadow-rose-950/50 backdrop-blur-md p-3 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
                  {missedCallNotice.callType === 'video' ? (
                    <VideoOff className="w-5 h-5" />
                  ) : (
                    <PhoneMissed className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-rose-300 truncate">
                      {missedCallNotice.callType === 'video' ? 'Missed Video Call' : 'Missed Voice Call'}
                    </span>
                    <span className="text-[10px] font-mono text-white/50 shrink-0">
                      {missedCallNotice.timestamp}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {missedCallNotice.isGroupCall && missedCallNotice.groupName
                      ? `${missedCallNotice.callerName} · ${missedCallNotice.groupName}`
                      : missedCallNotice.callerName}
                  </p>
                  <p className="text-[11px] text-white/65 truncate">
                    {missedCallNotice.reason}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {missedCallNotice.chatId && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('chats');
                          setActiveChatId(missedCallNotice.chatId);
                          dismissMissedCallNotice();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors"
                      >
                        View in Chat
                      </button>
                    )}
                    {isFeatureEnabled('calls') && (missedCallNotice.callerPhone || missedCallNotice.chatId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const notice = missedCallNotice;
                          dismissMissedCallNotice();
                          startCall(
                            notice.isGroupCall && notice.groupName ? notice.groupName : notice.callerName,
                            notice.callerPhone,
                            notice.callerAvatar,
                            notice.callType,
                            undefined,
                            true,
                            {
                              isGroupCall: Boolean(notice.isGroupCall),
                              chatId: notice.chatId || undefined,
                            }
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                      >
                        {missedCallNotice.callType === 'video' ? (
                          <Video className="w-3 h-3" />
                        ) : (
                          <Phone className="w-3 h-3" />
                        )}
                        <span>Call Back</span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissMissedCallNotice}
                  className="p-1 text-white/50 hover:text-white rounded-lg"
                  aria-label="Dismiss missed call notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {activeContactRequestPopup && <IncomingContactRequestModal />}
          {activeGroupInvitePopup && <IncomingGroupInviteModal />}
          {activeCheckoutProduct && <CheckoutDrawer />}
          {isFeatureEnabled('escrow') && activeEscrowModalOrder && <EscrowModal />}
          {isFeatureEnabled('voiceNotes') && isVoiceRecorderOpen && (
            <VoiceRecorderModal
              isOpen={isVoiceRecorderOpen}
              onClose={() => setIsVoiceRecorderOpen(false)}
            />
          )}
          {isLanguageModalOpen && (
            <LanguageSelectorModal
              isOpen={isLanguageModalOpen}
              onClose={() => setIsLanguageModalOpen(false)}
            />
          )}
          {isFeatureEnabled('wallet') && isWalletModalOpen && <WalletModal />}
          {activeCreditAlert && <CreditCelebrationModal />}

          {/* African Super-App Features - Disappear completely when toggled off */}
          {isFeatureEnabled('memeStudio') && isMemeStudioOpen && <MemeStickerStudioModal />}
          {isFeatureEnabled('audioSpaces') && isSpacesDashboardOpen && (
            <SpacesDashboard isModal onBack={() => setIsSpacesDashboardOpen(false)} />
          )}
          {isFeatureEnabled('audioSpaces') && (activeAudioSpace || spaceEndedSummary) && <AudioSpaceModal />}
          {isFeatureEnabled('scamChecker') && isScamCheckerModalOpen && <ScamReputationModal />}
          {isFeatureEnabled('wallet') && isInvoiceGeneratorOpen && <InvoiceGeneratorModal />}
          {isFeatureEnabled('wallet') && viewingInvoice && <InvoiceViewerModal />}
          {isFeatureEnabled('wallet') && isFinancialPollModalOpen && <FinancialPollModal />}
          {isQuickPollModalOpen && <QuickPollModal />}
          {isGameXoModalOpen && <GameXoChallengeModal />}
          {isShareLocationModalOpen && <ShareLocationModal />}
          {isFeatureEnabled('ajo') && isAjoModalOpen && <AjoLedgerModal />}

          {/* AGC Carrier Phone Auth, Contacts Discovery & Super-App Extensions */}
          {isAuthModalOpen && <AuthModal />}
          {isContactsModalOpen && <ContactsModal />}
          {isFeatureEnabled('dispatch') && isDispatchModalOpen && <DispatchModal />}
          {isFeatureEnabled('errands') && isErrandsModalOpen && <ErrandsModal />}
          {isFeatureEnabled('jobs') && isJobBoardModalOpen && <JobBoardModal />}
          {isFeatureEnabled('wallet') && isTaskEarnModalOpen && <TaskToEarnModal />}
          {isFeatureEnabled('securityPin') && isSecurityModalOpen && <SecurityModal />}

          {/* Services Booking, Send My Bill & Payroll Auto-Debit */}
          {isFeatureEnabled('artisan') && isServicesModalOpen && <ServicesBookingModal />}
          {isFeatureEnabled('wallet') && isSendBillModalOpen && <SendBillModal />}
          {isFeatureEnabled('payroll') && isPayrollModalOpen && <PayrollModal />}

          {/* Scan QR & Unique UID Modal */}
          {isScanQrModalOpen && <ScanQrModal />}

          {/* AfriHealth: Hospital Queuing, Telehealth & EHR Vault */}
          {isFeatureEnabled('healthcare') && isHealthModalOpen && <HealthcareModal />}

          {/* AfriLaw: Smart Contracts, Legal SOS & CAC Tracker */}
          {isFeatureEnabled('legal') && isLegalModalOpen && <LegalModal />}

          {/* Text Size Scale & Device Background Upload Modal */}
          {isDisplayModalOpen && (
            <DisplayWallpaperModal
              isOpen={isDisplayModalOpen}
              onClose={() => setIsDisplayModalOpen(false)}
            />
          )}

          {/* AfriCreator: Subscriptions, Show Tickets & Direct Music Drops */}
          {isFeatureEnabled('creator') && isCreatorModalOpen && <CreatorModal />}

          {/* Anti-Ghost Referral & Invite System */}
          {isFeatureEnabled('referral') && isReferralModalOpen && <ReferralModal />}

          {/* Celebrity Identity Verification Badge Modal */}
          {isCelebrityModalOpen && <CelebrityVerificationModal />}

          {/* Merchant Store Registration & Tiers */}
          {isFeatureEnabled('storeTiers') && isStoreRegModalOpen && <StoreRegistrationModal />}

          {/* African Writers Guild (Chapters, Buddy Read, Anti-AI Guarantee) */}
          {isFeatureEnabled('writers') && isWritersModalOpen && <WritersGuildModal />}

          {/* Super Admin Console & Moderation Desk (Always Available to Admin) */}
          {isAdminModalOpen && <AdminDashboardModal />}

          {isFeatureEnabled('tutor') && isTutorModalOpen && <TutorCoursesModal />}

          {/* African Pets Forum & Pet Shop Marketplace */}
          {isFeatureEnabled('petShop') && isPetShopModalOpen && (
            <PetShopModal
              isOpen={isPetShopModalOpen}
              onClose={() => setIsPetShopModalOpen(false)}
            />
          )}
        </Suspense>

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
                  safeLocalStorage.clear();
                  safeSessionStorage.clear();
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
    <RootErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </RootErrorBoundary>
  );
}
