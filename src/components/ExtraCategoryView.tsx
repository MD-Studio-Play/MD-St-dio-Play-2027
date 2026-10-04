import React from 'react';
import { PlaybackPack } from '../types';
import { PackCard } from './PackCard';
import { TopMenuTab } from './Header';
import { Music2, Sparkles, Layers, Image, ArrowLeft, Disc, CheckCircle } from 'lucide-react';

interface ExtraCategoryViewProps {
  activeTab: TopMenuTab;
  onReturnToPlaybacks: () => void;
  packs: PlaybackPack[];
  isPlaying: boolean;
  currentPlayingPack: PlaybackPack | null;
  onPlayToggle: (pack: PlaybackPack) => void;
  onAddToCart: (pack: PlaybackPack) => void;
  cartPackIds: Set<string>;
}

export const ExtraCategoryView: React.FC<ExtraCategoryViewProps> = ({
  activeTab,
  onReturnToPlaybacks,
  packs,
  isPlaying,
  currentPlayingPack,
  onPlayToggle,
  onAddToCart,
  cartPackIds,
}) => {
  if (activeTab === 'playbacks') return null;

  // Configuration for each specialized tab
  const tabConfig = {
    midi_variados: {
      badge: 'COLEÇÃO EXCLUSIVA',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
      title: 'MIDI Variados & Multitracks Instrumentais',
      description:
        'Arquivos MIDI e multitracks com stems individuais (Bateria, Baixo, Teclados, Metais, Guia e Back Vocal). Compatíveis com Korg, Yamaha, Roland, Reaper e Kontakt.',
      icon: Music2,
      accentColor: '#f59e0b',
      filterKeyword: 'MIDI',
    },
    midi_gospel: {
      badge: 'GOSPEL & ADORAÇÃO',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      title: 'MIDI Gospel & Playbacks Cristãos',
      description:
        'Playbacks e MIDIs de louvor, adoração congregacional, hinos clássicos da Harpa Cristã e lançamentos da música gospel brasileira com e sem guia vocal.',
      icon: Disc,
      accentColor: '#22c55e',
      filterKeyword: 'Gospel',
    },
    flyer_show: {
      badge: 'ARTES EDITÁVEIS PARA SHOWS',
      badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-500/30',
      title: 'Flyer Show & Cartazes Profissionais',
      description:
        'Packs de artes visuais e cartazes de shows para cantores, bandas e eventos. Arquivos em alta definição prontos para edição no Photoshop (PSD) e Canva.',
      icon: Image,
      accentColor: '#38bdf8',
      filterKeyword: 'Flyer',
    },
  }[activeTab];

  if (!tabConfig) return null;

  const Icon = tabConfig.icon;

  // Filter or prioritize packs for this tab
  const matchingPacks = packs.filter((p) => {
    const titleMatch = p.title.toLowerCase().includes(tabConfig.filterKeyword.toLowerCase());
    const genreMatch = (p.genre || '').toLowerCase().includes(tabConfig.filterKeyword.toLowerCase());
    const allGenresMatch = (p.genres || []).some((g) =>
      g.toLowerCase().includes(tabConfig.filterKeyword.toLowerCase())
    );
    return titleMatch || genreMatch || allGenresMatch;
  });

  // If no specifically filtered items exist yet, display all packs with the dedicated header so customers still see full catalog
  const displayPacks = matchingPacks.length > 0 ? matchingPacks : packs;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Category Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16171d] via-[#101115] to-[#0b0c0f] border border-white/10 p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient background */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: tabConfig.accentColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border tracking-wider ${tabConfig.badgeColor}`}
              >
                {tabConfig.badge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: tabConfig.accentColor }} />
              <span>{tabConfig.title}</span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {tabConfig.description}
            </p>

            {/* Features pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-300">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download imediato pós-pagamento</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Liberação na Área do Cliente</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>PIX Oficial Instantâneo</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex md:flex-col items-start md:items-end justify-between gap-3">
            <button
              type="button"
              onClick={onReturnToPlaybacks}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para PlayBacks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Packs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f59e0b]" />
            <span>Produtos Disponíveis em {tabConfig.title.split('&')[0]}</span>
          </h3>
          <span className="text-xs text-neutral-400">
            {displayPacks.length} itens encontrados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {displayPacks.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              isPlaying={isPlaying && currentPlayingPack?.id === pack.id}
              onPlayToggle={onPlayToggle}
              onAddToCart={onAddToCart}
              isInCart={cartPackIds.has(pack.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
