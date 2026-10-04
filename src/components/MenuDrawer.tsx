import React from 'react';
import {
  X,
  Music,
  Flame,
  Clock,
  HelpCircle,
  MessageCircle,
  Layers,
  Shield,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/packs';
import { MdStudioLogo } from './MdStudioLogo';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (cat: string) => void;
  activeTab?: string;
  onSelectTab?: (tab: 'playbacks' | 'midi_variados' | 'midi_gospel' | 'flyer_show') => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  activeTab = 'playbacks',
  onSelectTab,
}) => {
  const { menuConfig, logoConfig, themeConfig, setIsAdminMode, setIsCustomerAreaOpen } = useStore();

  if (!isOpen) return null;

  const whatsappHref = `https://wa.me/${menuConfig.whatsappNumber || '5511999998888'}?text=${encodeURIComponent(
    menuConfig.whatsappMessage || 'Olá! Vim do site MD Stúdio Play.'
  )}`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-[#0e0f13] border-l border-white/10 flex flex-col shadow-2xl text-neutral-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <MdStudioLogo size="sm" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Área do Cliente Button (Destaque Principal) */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomerAreaOpen(true);
                  onClose();
                }}
                className="w-full px-4 py-2.5 rounded-full bg-black border border-white hover:border-[#55c21b] text-white flex items-center justify-between transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(85,194,27,0.3)] active:scale-95 group"
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#55c21b"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform"
                  >
                    <circle cx="12" cy="7.5" r="4.2" />
                    <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
                  </svg>
                  <span className="font-bold text-white text-sm">Área do Cliente</span>
                </div>
                <span className="text-[10px] text-neutral-300 uppercase bg-white/10 px-2 py-0.5 rounded-full">
                  Acessar
                </span>
              </button>
            </div>

            {/* Quick Links / Dynamic Menu Items */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                Seções Principais
              </span>
              <div className="space-y-1">
                {[
                  { id: 'playbacks', label: 'PlayBacks' },
                  { id: 'midi_variados', label: 'MIDI Variados' },
                  { id: 'midi_gospel', label: 'MIDI Gospel' },
                  { id: 'flyer_show', label: 'Flyer Show' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onSelectTab) {
                        onSelectTab(item.id as any);
                      }
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-extrabold transition-all text-left cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-amber-500/20 text-[#f59e0b] border border-amber-500/30'
                        : 'hover:bg-white/[0.06] text-neutral-200 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {activeTab === item.id && (
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Outros Links */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                Mais Opções
              </span>
              <div className="space-y-1">
                {menuConfig.items
                  .filter((item) => item.visible)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.category) {
                          onSelectCategory(item.category);
                        }
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/[0.06] text-neutral-200 hover:text-white transition-colors text-left cursor-pointer"
                    >
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Categorias */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                Categorias de Ritmos
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.filter((c) => c.toUpperCase() !== 'TODOS').map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat);
                      onClose();
                    }}
                    className="text-left px-2.5 py-1.5 rounded-md bg-white/[0.02] hover:bg-white/[0.06] text-xs text-neutral-300 hover:text-white transition-colors truncate cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Entry Shortcut */}
            <div className="pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(true);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#55c21b] group-hover:scale-110 transition-transform" />
                  <span>Plataforma Administrativa</span>
                </div>
                <span className="text-[10px] text-neutral-400 uppercase bg-black/40 px-2 py-0.5 rounded">
                  Admin
                </span>
              </button>
            </div>

            {/* Support */}
            {menuConfig.enableCustomerSupport && (
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                  Atendimento Oficial
                </span>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <div className="text-xs">
                    <div className="font-bold">Suporte via WhatsApp</div>
                    <div className="text-emerald-400/80 text-[11px]">Seg a Sáb: 08h às 22h</div>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
