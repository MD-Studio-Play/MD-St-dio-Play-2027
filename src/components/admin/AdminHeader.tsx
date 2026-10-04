import React from 'react';
import { useStore } from '../../context/StoreContext';
import { MdStudioLogo } from '../MdStudioLogo';
import {
  LayoutDashboard,
  Music,
  Palette,
  CreditCard,
  Flame,
  ShoppingBag,
  ExternalLink,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  UserCheck,
  Image,
  Music2,
  Disc,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'music'
  | 'midi_variados'
  | 'midi_gospel'
  | 'flyer_show'
  | 'appearance'
  | 'checkout'
  | 'firebase'
  | 'orders';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const {
    setIsAdminMode,
    firebaseConfig,
    checkoutConfig,
    exportConfigBackup,
    adminCredentials,
    logoutAdmin,
    logoutAdminGoogle,
  } = useStore();

  const handleLogout = async () => {
    logoutAdmin();
    try {
      await logoutAdminGoogle();
    } catch {
      // ignore
    }
    setIsAdminMode(false);
  };

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'music' as AdminTab, label: 'Playbacks (Catálogo)', icon: Music },
    { id: 'midi_variados' as AdminTab, label: 'Página MIDI Variados', icon: Music2 },
    { id: 'midi_gospel' as AdminTab, label: 'Página MIDI Gospel', icon: Disc },
    { id: 'flyer_show' as AdminTab, label: 'Página Flyer Show', icon: Image },
    { id: 'appearance' as AdminTab, label: 'Personalização do Site', icon: Palette },
    { id: 'checkout' as AdminTab, label: 'Checkout & Pagamento', icon: CreditCard },
    { id: 'firebase' as AdminTab, label: 'Integração Firebase', icon: Flame },
    { id: 'orders' as AdminTab, label: 'Vendas & Pedidos', icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d0e12]/95 border-b border-white/10 backdrop-blur-md">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/[0.06] text-xs">
        {/* Left: Brand + Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MdStudioLogo size="sm" />
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono uppercase tracking-widest font-bold">
              ADMIN v2.0
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/10 text-neutral-400">
            {/* PIX Status */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>PIX BRCode Ativo</span>
            </span>

            {/* Gateway Status */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-[10px] uppercase">
              <ShieldCheck className="w-3 h-3" />
              <span>{checkoutConfig.creditCardGateway} ({checkoutConfig.isSandbox ? 'Test' : 'Live'})</span>
            </span>

            {/* Firebase Status */}
            {firebaseConfig.isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 text-[10px]">
                <Flame className="w-3 h-3" />
                <span>Firebase Conectado</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Back to Store, Export JSON */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportConfigBackup}
            title="Exportar backup completo das configurações e catálogo"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdminMode(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#55c21b] text-black font-black text-xs hover:bg-[#62dc20] transition-colors cursor-pointer shadow-md shadow-lime-500/20"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Loja</span>
          </button>

          {/* Botão Sair do Painel Admin */}
          <button
            type="button"
            onClick={handleLogout}
            title="Sair do Painel Administrativo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white shadow-inner border border-white/15'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-[#55c21b]' : 'text-neutral-500'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
