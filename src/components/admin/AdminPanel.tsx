import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminHeader, AdminTab } from './AdminHeader';
import { AdminLoginModal } from './AdminLoginModal';
import { DashboardTab } from './DashboardTab';
import { MusicTab } from './MusicTab';
import { AppearanceTab } from './AppearanceTab';
import { CheckoutTab } from './CheckoutTab';
import { FirebaseTab } from './FirebaseTab';
import { OrdersTab } from './OrdersTab';
import { FlyerShowTab } from './FlyerShowTab';
import { MidiVariadosTab } from './MidiVariadosTab';
import { MidiGospelTab } from './MidiGospelTab';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  tabName: string;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Admin tab ${this.props.tabName} error:`, error, errorInfo);
  }

  componentDidUpdate(prevProps: AdminErrorBoundaryProps) {
    if (prevProps.tabName !== this.props.tabName && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#111216] border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Ocorreu uma oscilação ao carregar esta seção ({this.props.tabName})
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Os dados foram preservados e o restante do painel continua funcionando normalmente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Esta Aba</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AdminPanel: React.FC = () => {
  const { isAdminAuthenticated } = useStore();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');

  if (!isAdminAuthenticated) {
    return <AdminLoginModal />;
  }

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#e1e3e7] flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Admin Top Navigation & Header */}
      <AdminHeader
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Admin Content Body with Tab-level Error Isolation */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full animate-in fade-in duration-200">
        <AdminErrorBoundary tabName={currentTab} key={currentTab}>
          {currentTab === 'dashboard' && (
            <DashboardTab onNavigateToTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'music' && <MusicTab />}
          {currentTab === 'midi_variados' && <MidiVariadosTab />}
          {currentTab === 'midi_gospel' && <MidiGospelTab />}
          {currentTab === 'flyer_show' && <FlyerShowTab />}
          {currentTab === 'appearance' && <AppearanceTab />}
          {currentTab === 'checkout' && <CheckoutTab />}
          {currentTab === 'firebase' && <FirebaseTab />}
          {currentTab === 'orders' && <OrdersTab />}
        </AdminErrorBoundary>
      </main>

      {/* Admin Footer */}
      <footer className="w-full bg-[#07080a] border-t border-white/5 py-4 px-4 sm:px-6 text-center text-xs text-neutral-500">
        MD Stúdio Play Admin System · Plataforma Integrada de Gestão Musical & E-commerce
      </footer>
    </div>
  );
};
