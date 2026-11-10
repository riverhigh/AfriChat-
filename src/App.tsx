import React, { useState, useCallback } from 'react';
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
import { WhatsAppPhoneAuth } from './components/WhatsAppPhoneAuth';
import { PhoneSignUpBanner } from './components/PhoneSignUpBanner';
import { ErrandsModal } from './components/ErrandsModal';
import { CallErrorBoundary } from './components/CallErrorBoundary';

const AppContent: React.FC = () => {
  const { activeChatId, activeTab, isAuthenticated, endCall } = useApp();
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);

  // Render SplashScreen overlay before anything else (shows once per session)
  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} />;
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
      <div className="w-full max-w-md h-full bg-white dark:bg-black shadow-2xl flex flex-col relative overflow-hidden border-x border-slate-200/50 dark:border-neutral-800">
        {/* Floating Street Radio bar when active in background */}
        <AudioSpaceBar />

        {activeChatId ? (
          <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
        ) : (
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            <Header onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {activeTab === 'status' && <StatusView />}
              {activeTab === 'calls' && <CallsView />}
              {activeTab === 'town' && <TownView />}
              {activeTab === 'chats' && <ChatList />}
              {activeTab === 'settings' && (
                <SettingsView
                  onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                  onOpenDisplayModal={() => setIsDisplayModalOpen(true)}
                />
              )}
              {activeTab === 'market' && <MarketplaceView />}
            </main>

            <BottomNav />
          </div>
        )}

        {/* Global Modals & Interactive Overlays */}
        <StatusViewerModal />
        <CallErrorBoundary onReset={endCall}>{"\n"}<ActiveCallModal />{"\n"}</CallErrorBoundary>
        <IncomingCallModal />
        <CheckoutDrawer />
        <EscrowModal />
        <VoiceRecorderModal
          isOpen={isVoiceRecorderOpen}
          onClose={() => setIsVoiceRecorderOpen(false)}
        />
        <LanguageSelectorModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
        />
        <WalletModal />

        {/* African Super-App Features */}
        <MemeStickerStudioModal />
        <AudioSpaceModal />
        <ScamReputationModal />
        <InvoiceGeneratorModal />
        <InvoiceViewerModal />
        <FinancialPollModal />
        <AjoLedgerModal />

        {/* AGC Carrier Phone Auth, Contacts Discovery & Super-App Extensions */}
        <AuthModal />
        <ContactsModal />
        <DispatchModal />
        <ErrandsModal />
        <JobBoardModal />
        <SecurityModal />

        {/* Services Booking, 1-2 Days Delayed Transfers & Payroll Auto-Debit */}
        <ServicesBookingModal />
        <DelayedTransferModal />
        <PayrollModal />

        {/* Scan QR & Unique UID Modal */}
        <ScanQrModal />

        {/* AfriHealth: Hospital Queuing, Telehealth & EHR Vault */}
        <HealthcareModal />

        {/* AfriLaw: Smart Contracts, Legal SOS & CAC Tracker */}
        <LegalModal />

        {/* Text Size Scale & Device Background Upload Modal */}
        <DisplayWallpaperModal
          isOpen={isDisplayModalOpen}
          onClose={() => setIsDisplayModalOpen(false)}
        />

        {/* AfriCreator: Subscriptions, Show Tickets & Direct Music Drops */}
        <CreatorModal />

        {/* Anti-Ghost Referral & Invite System */}
        <ReferralModal />

        {/* Celebrity Identity Verification Badge Modal */}
        <CelebrityVerificationModal />

        {/* Merchant Store Registration & Tiers (â‚¦3k / â‚¦7k) */}
        <StoreRegistrationModal />

        {/* African Writers Guild (Chapters, Buddy Read, Anti-AI Guarantee) */}
        <WritersGuildModal />
        {/* Super Admin Console & Moderation Desk */}
        <AdminDashboardModal />
        <TutorCoursesModal />
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
