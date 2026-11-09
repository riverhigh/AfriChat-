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

const AppContent: React.FC = () => {
  const { activeChatId, activeTab } = useApp();
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0c0b16] flex justify-center text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#11101e] min-h-screen shadow-xl flex flex-col relative">
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
