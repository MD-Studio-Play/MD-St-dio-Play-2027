/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PlaybackPack, Track, CartItem } from './types';
import { ITEMS_PER_PAGE } from './data/packs';
import { audioPlayer } from './utils/audioSynth';
import { useStore } from './context/StoreContext';
import { Header, TopMenuTab } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { PackCard } from './components/PackCard';
import { Pagination } from './components/Pagination';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { CartDrawer } from './components/CartDrawer';
import { MenuDrawer } from './components/MenuDrawer';
import { CookieModal } from './components/CookieModal';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/admin/AdminPanel';
import { CustomerAreaModal } from './components/CustomerAreaModal';
import { ExtraCategoryView } from './components/ExtraCategoryView';
import { FlyerShowPage } from './components/FlyerShowPage';
import { MidiPageView } from './components/MidiPageView';
import { CheckoutModal } from './components/CheckoutModal';
import { SearchX, Sparkles } from 'lucide-react';

export default function App() {
  const {
    packs,
    isAdminMode,
    setIsAdminMode,
    themeConfig,
    setIsCustomerAreaOpen,
  } = useStore();

  // Public Storefront State
  const [activeTopTab, setActiveTopTab] = useState<TopMenuTab>('playbacks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);

  // Audio Player State
  const [currentPlayingPack, setCurrentPlayingPack] = useState<PlaybackPack | null>(null);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [volume, setVolume] = useState(0.6);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartPackIds = useMemo(() => new Set(cartItems.map((i) => i.pack.id)), [cartItems]);

  // Drawers & Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutInitialView, setCheckoutInitialView] = useState<'checkout' | 'success' | 'pending' | 'error'>('checkout');

  // Handle direct payment routes (/pagamento/sucesso, /pagamento/pendente, /pagamento/erro, /checkout, /area-do-cliente)
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('/area-do-cliente') || hash.includes('area-do-cliente')) {
      setIsCustomerAreaOpen(true);
    } else if (path.includes('/pagamento/sucesso') || hash.includes('sucesso')) {
      setCheckoutInitialView('success');
      setIsCheckoutModalOpen(true);
    } else if (path.includes('/pagamento/pendente') || hash.includes('pendente')) {
      setCheckoutInitialView('pending');
      setIsCheckoutModalOpen(true);
    } else if (path.includes('/pagamento/erro') || hash.includes('erro')) {
      setCheckoutInitialView('error');
      setIsCheckoutModalOpen(true);
    } else if (path.includes('/checkout') || hash.includes('checkout')) {
      setCheckoutInitialView('checkout');
      setIsCheckoutModalOpen(true);
    }
  }, [setIsCustomerAreaOpen]);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to audio player events
  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe((playing, packId, progress) => {
      setIsPlaying(playing);
      setPlaybackProgress(progress);
    });
    return () => unsubscribe();
  }, []);

  // Filtered packs based on dynamic packs from StoreContext
  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      const query = searchQuery.trim().toLowerCase();
      const allGenres = pack.genres && pack.genres.length > 0 ? pack.genres : [pack.genre];
      const matchesSearch =
        !query ||
        pack.title?.toLowerCase().includes(query) ||
        pack.artist?.toLowerCase().includes(query) ||
        pack.genre?.toLowerCase().includes(query) ||
        allGenres.some((g) => (g || '').toLowerCase().includes(query)) ||
        (Array.isArray(pack.tracks) && pack.tracks.some((t) => (t?.title || '').toLowerCase().includes(query)));

      const normCat = selectedCategory.toUpperCase();
      const packGenreUpper = (pack.genre || '').toUpperCase();
      const allGenresUpper = allGenres.map((g) => (g || '').toUpperCase());
      const packTitleUpper = pack.title.toUpperCase();

      const hasMatchingGenre = (kw: string) =>
        packGenreUpper.includes(kw) || allGenresUpper.some((g) => g.includes(kw));

      const matchesCategory =
        normCat === 'TODOS' ||
        packGenreUpper === normCat ||
        allGenresUpper.includes(normCat) ||
        pack.genre.toLowerCase() === selectedCategory.toLowerCase() ||
        allGenres.some((g) => g.toLowerCase() === selectedCategory.toLowerCase()) ||
        (normCat.includes('ARROCHA') && (hasMatchingGenre('ARROCHA') || hasMatchingGenre('SERESTA'))) ||
        (normCat.includes('AXÉ') && (hasMatchingGenre('AXÉ') || hasMatchingGenre('AXE') || hasMatchingGenre('BAHIA'))) ||
        (normCat.includes('FORRÓ') && (hasMatchingGenre('FORRÓ') || hasMatchingGenre('FORRO'))) ||
        (normCat.includes('VAQUEJADA') && (hasMatchingGenre('VAQUEJADA') || packTitleUpper.includes('VAQUEJADA') || packTitleUpper.includes('VAQUEIRO'))) ||
        (normCat.includes('PISEIRO') && (hasMatchingGenre('PISEIRO') || hasMatchingGenre('PISADINHA'))) ||
        (normCat.includes('MODÃO') && (hasMatchingGenre('MODÃO') || hasMatchingGenre('MODAO') || packTitleUpper.includes('MODÃO') || packTitleUpper.includes('MODAO'))) ||
        (normCat.includes('REGGAE') && (hasMatchingGenre('REGGAE') || packTitleUpper.includes('REGGAE'))) ||
        (normCat.includes('SERTANEJO') && (hasMatchingGenre('SERTANEJO') || packTitleUpper.includes('SERTANEJO'))) ||
        (normCat.includes('MPB') && (hasMatchingGenre('MPB') || packTitleUpper.includes('MPB') || packTitleUpper.includes('VIOLÃO'))) ||
        (normCat.includes('POP ROCK') && (hasMatchingGenre('POP') || hasMatchingGenre('ROCK') || packTitleUpper.includes('POP') || packTitleUpper.includes('ROCK'))) ||
        (normCat.includes('PAGODE') && (hasMatchingGenre('PAGODE') || hasMatchingGenre('SAMBA') || packTitleUpper.includes('PAGODE'))) ||
        (normCat.includes('BREGA') && (hasMatchingGenre('BREGA') || packTitleUpper.includes('BREGA')));

      return matchesSearch && matchesCategory;
    });
  }, [packs, searchQuery, selectedCategory]);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Pagination calculation
  const totalItems = filteredPacks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const displayedPacks = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredPacks.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredPacks, validCurrentPage]);

  // Handler for playing/pausing pack preview
  const handlePlayToggle = (pack: PlaybackPack, track?: Track) => {
    if (currentPlayingPack?.id === pack.id && (!track || currentPlayingTrack?.id === track.id)) {
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.resume(pack.sampleRhythm || 'piseiro', pack.audioUrl);
      }
    } else {
      setCurrentPlayingPack(pack);
      setCurrentPlayingTrack(track || null);
      audioPlayer.play(pack.id, pack.sampleRhythm || 'piseiro', pack.audioUrl);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioPlayer.setVolume(vol);
  };

  const handleClosePlayer = () => {
    audioPlayer.stop();
    setCurrentPlayingPack(null);
    setCurrentPlayingTrack(null);
  };

  // Cart operations
  const handleAddToCart = (pack: PlaybackPack) => {
    const existingIndex = cartItems.findIndex((item) => item.pack.id === pack.id);
    if (existingIndex > -1) {
      setToastMessage(`"${pack.title}" já está no carrinho!`);
      setIsCartOpen(true);
    } else {
      setCartItems((prev) => [...prev, { pack, quantity: 1 }]);
      setToastMessage(`"${pack.title}" adicionado ao carrinho!`);
      setIsCartOpen(true);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveCartItem = (packId: string) => {
    setCartItems((prev) => prev.filter((item) => item.pack.id !== packId));
  };

  const handleUpdateQuantity = (packId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(packId);
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.pack.id === packId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut Ctrl+Alt+A and URL param ?admin=true to enter Admin
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('painel') === 'true') {
        setIsAdminMode(true);
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminMode(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsAdminMode]);

  // If Admin mode is toggled, render the full Administrative Platform
  if (isAdminMode) {
    return <AdminPanel />;
  }

  return (
    <div
      style={{ backgroundColor: themeConfig.backgroundColor || '#0b0c0e' }}
      className="min-h-screen text-[#e1e3e7] flex flex-col selection:bg-emerald-500 selection:text-black transition-colors duration-200"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#55c21b] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartItems.length}
        activeTab={activeTopTab}
        onSelectTab={(tab) => {
          setActiveTopTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 w-full mt-2">
        {activeTopTab === 'playbacks' ? (
          <>
            {/* Banner no Topo do Site */}
            <HeroBanner />

            {/* Category Pills Filter Row */}
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Search status or active category indicator */}
            {(searchQuery || selectedCategory.toUpperCase() !== 'TODOS') && (
              <div className="flex items-center justify-between pb-3 pt-1 text-xs text-neutral-400">
                <div>
                  Exibindo resultados para{' '}
                  {searchQuery && (
                    <span className="text-white font-medium">"{searchQuery}"</span>
                  )}
                  {searchQuery && selectedCategory.toUpperCase() !== 'TODOS' && ' em '}
                  {selectedCategory.toUpperCase() !== 'TODOS' && (
                    <span className="font-semibold text-amber-400">
                      {selectedCategory}
                    </span>
                  )}
                  {' '}({totalItems} encontrados)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('TODOS');
                  }}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* 3-Column Responsive Grid matching design */}
            {displayedPacks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mt-2">
                {displayedPacks.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    isPlaying={isPlaying && currentPlayingPack?.id === pack.id}
                    onPlayToggle={handlePlayToggle}
                    onAddToCart={handleAddToCart}
                    isInCart={cartItems.some((item) => item.pack.id === pack.id)}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-20 text-center space-y-3 bg-[#111216] border border-white/5 rounded-2xl my-6">
                <SearchX className="w-12 h-12 text-neutral-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum pacote encontrado</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Não encontramos nenhum pacote correspondente à sua busca. Cadastre novos no Painel Admin ou tente outros termos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('TODOS');
                  }}
                  style={{ backgroundColor: themeConfig.primaryColor }}
                  className="px-4 py-2 text-black font-extrabold text-xs rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Ver todos os pacotes
                </button>
              </div>
            )}

            {/* Pagination bar */}
            {totalItems > 0 && (
              <Pagination
                currentPage={validCurrentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={handlePageChange}
              />
            )}
          </>
        ) : activeTopTab === 'midi_variados' ? (
          <MidiPageView
            type="variados"
            onAddToCart={handleAddToCart}
            isInCart={cartItems.some((i) => i.pack.id === 'pack_midi_variados_vip_2026')}
            onReturnToPlaybacks={() => {
              setActiveTopTab('playbacks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            packs={filteredPacks}
            isPlayingGlobal={isPlaying}
            currentPlayingPack={currentPlayingPack}
            onPlayToggleGlobal={handlePlayToggle}
            cartPackIds={cartPackIds}
          />
        ) : activeTopTab === 'midi_gospel' ? (
          <MidiPageView
            type="gospel"
            onAddToCart={handleAddToCart}
            isInCart={cartItems.some((i) => i.pack.id === 'pack_midi_gospel_vip_2026')}
            onReturnToPlaybacks={() => {
              setActiveTopTab('playbacks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            packs={filteredPacks}
            isPlayingGlobal={isPlaying}
            currentPlayingPack={currentPlayingPack}
            onPlayToggleGlobal={handlePlayToggle}
            cartPackIds={cartPackIds}
          />
        ) : activeTopTab === 'flyer_show' ? (
          <FlyerShowPage
            onAddToCart={handleAddToCart}
            isInCart={cartItems.some((i) => i.pack.id === 'pack_flyer_150_mega')}
            onReturnToPlaybacks={() => {
              setActiveTopTab('playbacks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <ExtraCategoryView
            activeTab={activeTopTab}
            onReturnToPlaybacks={() => {
              setActiveTopTab('playbacks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            packs={filteredPacks}
            isPlaying={isPlaying}
            currentPlayingPack={currentPlayingPack}
            onPlayToggle={handlePlayToggle}
            onAddToCart={handleAddToCart}
            cartPackIds={cartPackIds}
          />
        )}
      </main>

      {/* Floating Audio Preview Player */}
      <AudioPlayerBar
        pack={currentPlayingPack}
        track={currentPlayingTrack}
        isPlaying={isPlaying}
        progress={playbackProgress}
        volume={volume}
        onPlayToggle={() => {
          if (currentPlayingPack) {
            handlePlayToggle(currentPlayingPack, currentPlayingTrack || undefined);
          }
        }}
        onVolumeChange={handleVolumeChange}
        onClose={handleClosePlayer}
        onAddToCart={handleAddToCart}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onOpenCheckout={() => {
          setCheckoutInitialView('checkout');
          setIsCheckoutModalOpen(true);
        }}
      />

      {/* Professional Mercado Pago Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        items={cartItems}
        onClearCart={handleClearCart}
        initialView={checkoutInitialView}
      />

      {/* Side Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSearchQuery('');
          setActiveTopTab('playbacks');
        }}
        activeTab={activeTopTab}
        onSelectTab={(tab) => {
          setActiveTopTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Customer Area Modal */}
      <CustomerAreaModal />

      {/* Cookie Preferences Modal */}
      <CookieModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />

      {/* Footer */}
      <Footer onOpenCookiePreferences={() => setIsCookieModalOpen(true)} />
    </div>
  );
}
