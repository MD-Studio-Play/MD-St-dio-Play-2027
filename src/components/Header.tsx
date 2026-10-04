import React from 'react';
import { Search, ShoppingCart, X, Menu } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export type TopMenuTab = 'playbacks' | 'midi_variados' | 'midi_gospel' | 'flyer_show';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenMenu: () => void;
  onOpenCart: () => void;
  cartCount: number;
  activeTab?: TopMenuTab;
  onSelectTab?: (tab: TopMenuTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMenu,
  onOpenCart,
  cartCount,
  activeTab = 'playbacks',
  onSelectTab,
}) => {
  const { setIsCustomerAreaOpen } = useStore();

  const handleTabClick = (tab: TopMenuTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };

  return (
    <header className="w-full bg-[#1b1c20] border-b border-white/[0.08] sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-3 md:gap-5">
          {/* LEFT: Official MD STÚDIO Logo (Round emblem + Rectangular box identical to image) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleTabClick('playbacks');
                onSearchChange('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="MD Stúdio Play - Página Inicial"
              className="flex items-center gap-2 group cursor-pointer"
            >
              {/* Circular Emblem with Gold Ring */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-gradient-to-b from-neutral-600 via-amber-400 to-neutral-900 shadow-md group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img
                  src="/md_studio_logo.jpg"
                  alt="MD Stúdio Logo"
                  className="w-full h-full object-cover rounded-full bg-black"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>

              {/* Rectangular Black Badge: MD STÚDIO / PLAY • VS */}
              <div className="bg-black border border-neutral-800 rounded px-2.5 py-1 flex flex-col justify-center leading-none shadow-sm">
                <div className="flex items-center gap-1 font-['Syne',sans-serif] font-black text-sm sm:text-[15px] tracking-tight">
                  <span className="text-white">MD</span>
                  <span className="text-[#f59e0b] tracking-wider">STÚDIO</span>
                </div>
                <div className="flex items-center gap-1.5 text-[8.5px] font-mono tracking-widest font-extrabold uppercase mt-0.5">
                  <span className="text-sky-300">PLAY</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-amber-400">VS</span>
                </div>
              </div>
            </button>
          </div>

          {/* CENTER-LEFT: Desktop Nav Menu Tabs (PlayBacks, MIDI Variados, MIDI Gospel, Flyer Show) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 shrink-0">
            {/* 1. PlayBacks (Highlighted Active by Default with Thick White Underline) */}
            <button
              type="button"
              onClick={() => handleTabClick('playbacks')}
              className={`text-sm xl:text-base font-extrabold transition-all cursor-pointer relative pb-1 tracking-tight ${
                activeTab === 'playbacks'
                  ? 'text-[#f59e0b]'
                  : 'text-white hover:text-[#f59e0b]'
              }`}
            >
              <span>PlayBacks</span>
              {activeTab === 'playbacks' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full" />
              )}
            </button>

            {/* 2. MIDI Variados */}
            <button
              type="button"
              onClick={() => handleTabClick('midi_variados')}
              className={`text-sm xl:text-base font-extrabold transition-all cursor-pointer relative pb-1 tracking-tight ${
                activeTab === 'midi_variados'
                  ? 'text-[#f59e0b]'
                  : 'text-white hover:text-[#f59e0b]'
              }`}
            >
              <span>MIDI Variados</span>
              {activeTab === 'midi_variados' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full" />
              )}
            </button>

            {/* 3. MIDI Gospel */}
            <button
              type="button"
              onClick={() => handleTabClick('midi_gospel')}
              className={`text-sm xl:text-base font-extrabold transition-all cursor-pointer relative pb-1 tracking-tight ${
                activeTab === 'midi_gospel'
                  ? 'text-[#f59e0b]'
                  : 'text-white hover:text-[#f59e0b]'
              }`}
            >
              <span>MIDI Gospel</span>
              {activeTab === 'midi_gospel' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full" />
              )}
            </button>

            {/* 4. Flyer Show */}
            <button
              type="button"
              onClick={() => handleTabClick('flyer_show')}
              className={`text-sm xl:text-base font-extrabold transition-all cursor-pointer relative pb-1 tracking-tight ${
                activeTab === 'flyer_show'
                  ? 'text-[#f59e0b]'
                  : 'text-white hover:text-[#f59e0b]'
              }`}
            >
              <span>Flyer Show</span>
              {activeTab === 'flyer_show' && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full" />
              )}
            </button>
          </nav>

          {/* CENTER-RIGHT: Search Bar (Dark pill container) */}
          <div className="flex-1 max-w-md min-w-[170px] sm:min-w-[220px]">
            <div className="relative flex items-center w-full bg-[#101115] border border-white/10 hover:border-white/20 focus-within:border-white/40 rounded-full px-3.5 py-2 transition-all shadow-inner">
              <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por música, artista, gênero..."
                className="w-full bg-transparent text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-neutral-400 hover:text-white cursor-pointer ml-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Área do Cliente & Green Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Button Área do Cliente (Black pill with white border and green user icon) */}
            <button
              type="button"
              onClick={() => setIsCustomerAreaOpen(true)}
              title="Acessar Área do Cliente"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black border border-white hover:border-[#22c55e] text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95 shrink-0"
            >
              {/* Green user profile icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 sm:w-[17px] sm:h-[17px] shrink-0"
              >
                <circle cx="12" cy="7.5" r="4.2" />
                <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
              </svg>
              <span className="font-extrabold text-white text-xs sm:text-sm whitespace-nowrap tracking-tight">
                Área do Cliente
              </span>
            </button>

            {/* Green Circular Shopping Cart Button (Exact replica of image) */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Abrir carrinho de compras"
              title="Ver Carrinho"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-md hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] active:scale-95 transition-all cursor-pointer relative"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.3]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-black bg-amber-400 text-[10px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow border border-black">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger menu toggle (only on small screens) */}
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menu de navegação"
              className="lg:hidden p-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* MOBILE / TABLET NAV ROW: The 4 tabs scrollable below for mobile users */}
        <div className="lg:hidden flex items-center gap-3 overflow-x-auto no-scrollbar pt-2.5 pb-0.5 border-t border-white/[0.06] mt-2">
          <button
            type="button"
            onClick={() => handleTabClick('playbacks')}
            className={`text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer relative pb-1 tracking-tight shrink-0 ${
              activeTab === 'playbacks'
                ? 'text-[#f59e0b]'
                : 'text-white hover:text-[#f59e0b]'
            }`}
          >
            <span>PlayBacks</span>
            {activeTab === 'playbacks' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('midi_variados')}
            className={`text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer relative pb-1 tracking-tight shrink-0 ${
              activeTab === 'midi_variados'
                ? 'text-[#f59e0b]'
                : 'text-white hover:text-[#f59e0b]'
            }`}
          >
            <span>MIDI Variados</span>
            {activeTab === 'midi_variados' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('midi_gospel')}
            className={`text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer relative pb-1 tracking-tight shrink-0 ${
              activeTab === 'midi_gospel'
                ? 'text-[#f59e0b]'
                : 'text-white hover:text-[#f59e0b]'
            }`}
          >
            <span>MIDI Gospel</span>
            {activeTab === 'midi_gospel' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('flyer_show')}
            className={`text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer relative pb-1 tracking-tight shrink-0 ${
              activeTab === 'flyer_show'
                ? 'text-[#f59e0b]'
                : 'text-white hover:text-[#f59e0b]'
            }`}
          >
            <span>Flyer Show</span>
            {activeTab === 'flyer_show' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
