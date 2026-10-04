import React, { useState } from 'react';
import { PlaybackPack, Track } from '../types';
import { PackThumbnail } from './PackThumbnail';
import { useStore } from '../context/StoreContext';
import { ChevronDown, ChevronUp, Play, Pause, Check, Music2 } from 'lucide-react';

interface PackCardProps {
  pack: PlaybackPack;
  isPlaying: boolean;
  onPlayToggle: (pack: PlaybackPack, track?: Track) => void;
  onAddToCart: (pack: PlaybackPack) => void;
  isInCart?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  isPlaying,
  onPlayToggle,
  onAddToCart,
  isInCart = false,
}) => {
  const { themeConfig } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getButtonRadiusClass = () => {
    if (themeConfig.buttonShape === 'pill') return 'rounded-full';
    if (themeConfig.buttonShape === 'square') return 'rounded-none';
    return 'rounded-lg';
  };

  return (
    <div className="bg-[#111216] border border-red-600 hover:border-red-500 rounded-2xl transition-all duration-200 overflow-hidden shadow-lg shadow-black/40 hover:shadow-[0_0_18px_rgba(220,38,38,0.25)] group">
      {/* Main Card Row */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Thumbnail & Title Lockup */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <PackThumbnail pack={pack} size="md" />

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-[14px] sm:text-[15px] leading-snug truncate group-hover:text-emerald-400/90 transition-colors">
              {pack.title}
            </h3>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer mt-0.5"
            >
              <span>{isExpanded ? 'Ocultar lista' : 'Ver lista'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Price, Play Preview, Comprar Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Price Stack */}
          <div className="text-right flex flex-col justify-center">
            <span className="text-red-500 line-through text-[11px] sm:text-xs font-semibold tabular-nums leading-tight">
              {formatCurrency(pack.originalPrice)}
            </span>
            <span
              style={{ color: themeConfig.primaryColor }}
              className="font-bold text-xs sm:text-sm tabular-nums leading-tight"
            >
              {formatCurrency(pack.discountPrice)}
            </span>
          </div>

          {/* Audio Preview Play Button */}
          <button
            type="button"
            onClick={() => onPlayToggle(pack)}
            title={isPlaying ? 'Pausar prévia' : 'Ouvir prévia'}
            aria-label={isPlaying ? 'Pausar prévia' : 'Ouvir prévia'}
            style={
              isPlaying
                ? {
                    borderColor: themeConfig.primaryColor,
                    color: themeConfig.primaryColor,
                    backgroundColor: `${themeConfig.primaryColor}15`,
                  }
                : undefined
            }
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'shadow-md animate-pulse'
                : 'border-white/30 hover:border-white text-white hover:bg-white/5'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Comprar Button with configured shape and text */}
          <button
            type="button"
            onClick={() => onAddToCart(pack)}
            className={`cursor-pointer px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm ${getButtonRadiusClass()} ${
              isInCart
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-800/60'
                : 'bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm shadow-[#16a34a]/30'
            }`}
          >
            {isInCart ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span className="hidden xs:inline">No Carrinho</span>
              </>
            ) : (
              <>
                <span>{themeConfig.buyButtonText || 'Comprar'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Tracklist Accordion ("Ver lista") */}
      {isExpanded && (
        <div className="border-t border-red-950/60 bg-[#0c0d10]/95 px-3.5 py-3 text-xs">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Music2
                style={{ color: themeConfig.primaryColor }}
                className="w-3.5 h-3.5"
              />
              <span className="font-semibold text-neutral-300">
                Faixas inclusas ({pack.tracks.length} músicas)
              </span>
            </div>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 border-l-2 border-red-800/80 pl-3 py-1 my-1">
            {pack.tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between py-0.5 text-xs font-mono group/track hover:bg-white/[0.03] px-1 -mx-1 rounded transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  <span className="text-neutral-200 font-medium shrink-0">
                    {track.number}. {track.title}
                  </span>
                  <span className="text-neutral-400 shrink-0 select-none">—</span>
                  <span className="text-sky-400 font-medium truncate">
                    {track.artist || 'Demo Track'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.05] text-[11px] text-neutral-400">
            <span>Formato: Playback MP3 320kbps</span>
          </div>
        </div>
      )}
    </div>
  );
};
