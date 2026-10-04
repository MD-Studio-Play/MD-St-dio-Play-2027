import React from 'react';
import { PlaybackPack, Track } from '../types';
import { PackThumbnail } from './PackThumbnail';
import { Play, Pause, Volume2, VolumeX, X, ShoppingCart, Music } from 'lucide-react';

interface AudioPlayerBarProps {
  pack: PlaybackPack | null;
  track?: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  onPlayToggle: () => void;
  onVolumeChange: (val: number) => void;
  onClose: () => void;
  onAddToCart: (pack: PlaybackPack) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  pack,
  track,
  isPlaying,
  progress,
  volume,
  onPlayToggle,
  onVolumeChange,
  onClose,
  onAddToCart,
}) => {
  if (!pack) return null;

  const currentSeconds = Math.floor((progress / 100) * 32);
  const totalSeconds = 32;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0f13]/95 backdrop-blur-md border-t border-white/10 px-4 py-2.5 sm:py-3 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Pack Artwork & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial md:w-72">
          <PackThumbnail pack={pack} size="sm" />
          <div className="truncate min-w-0">
            <div className="text-white font-bold text-xs sm:text-sm truncate leading-tight">
              {track ? track.title : pack.title}
            </div>
            <div className="text-neutral-400 text-[11px] truncate flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-400 font-medium">{pack.genre}</span>
              <span>·</span>
              <span>{track ? track.artist : pack.artist}</span>
            </div>
          </div>
        </div>

        {/* Center: Controls & Audio Progress */}
        <div className="flex-1 max-w-lg hidden sm:flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onPlayToggle}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Simulated Animated Waveform Bars */}
            <div className="flex items-end gap-0.5 h-5 px-2">
              {[40, 75, 55, 90, 30, 85, 60, 100, 45, 70, 35, 80, 65, 95].map((height, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlaying ? 'bg-[#55c21b]' : 'bg-neutral-600'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, (height * ((i % 3) + 1)) % 100)}%` : '20%',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="w-full flex items-center gap-2 text-[10px] text-neutral-400 tabular-nums">
            <span>{formatTime(currentSeconds)}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-[#55c21b] transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>

        {/* Right: Buy Button, Volume, Close */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile Play Toggle */}
          <button
            type="button"
            onClick={onPlayToggle}
            className="sm:hidden w-8 h-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Volume control */}
          <div className="hidden lg:flex items-center gap-2 text-neutral-400">
            <button
              type="button"
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.6)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 accent-[#55c21b] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Comprar este Pacote */}
          <button
            type="button"
            onClick={() => onAddToCart(pack)}
            className="bg-[#55c21b] hover:bg-[#63dc20] text-black font-extrabold text-xs px-3 sm:px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Comprar</span>
          </button>

          {/* Close Player */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar player"
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
