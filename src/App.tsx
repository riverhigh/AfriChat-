import React, { useState } from 'react';
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
import { SettingsView } from './components/SettingsView';
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

const AppContent: React.FC = () => {
  const { activeChatId, activeTab } = useApp();
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-black flex justify-center text-slate-900 dark:text-white font-sans transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-black min-h-screen shadow-xl flex flex-col relative border-x border-slate-200/50 dark:border-neutral-800">
        {/* Floating Street Radio bar when active in background */}
        <AudioSpaceBar />

        {activeChatId ? (
          <ActiveChat onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)} />
        ) : (
          <div className="flex flex-col flex-1">
            <Header onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />

            <main className="flex-1 overflow-y-auto">
              {activeTab === 'status' && <StatusView />}
              {activeTab === 'calls' && <CallsView />}
              {activeTab === 'market' && <MarketplaceView />}
              {activeTab === 'chats' && <ChatList />}
              {activeTab === 'settings' && (
                <SettingsView onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />
              )}
            </main>

            <BottomNav />
          </div>
        )}

        {/* Global Modals & Interactive Overlays */}
        <StatusViewerModal />
        <ActiveCallModal />
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

        {/* WhatsApp-Style Phone Auth, Contacts Discovery & Super-App Extensions */}
        <AuthModal />
        <ContactsModal />
        <DispatchModal />
        <JobBoardModal />
        <SecurityModal />

        {/* Services Booking, 1-2 Days Delayed Transfers & Payroll Auto-Debit */}
        <ServicesBookingModal />
        <DelayedTransferModal />
        <PayrollModal />
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
