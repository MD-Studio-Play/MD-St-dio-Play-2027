import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react';

export const TopBanner: React.FC = () => {
  const { bannerConfig } = useStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => (bannerConfig.countdownMinutes || 180) * 60);

  useEffect(() => {
    setTimeLeft((bannerConfig.countdownMinutes || 180) * 60);
    setIsDismissed(false);
  }, [bannerConfig.countdownMinutes, bannerConfig.text, bannerConfig.enabled]);

  useEffect(() => {
    if (!bannerConfig.showCountdown) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [bannerConfig.showCountdown]);

  if (!bannerConfig.enabled || isDismissed) {
    return null;
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        backgroundColor: bannerConfig.bgColor,
        color: bannerConfig.textColor,
      }}
      className="w-full relative px-4 py-2 sm:py-2.5 transition-all shadow-md z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs font-bold">
        {/* Left: Tag + Message */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {bannerConfig.highlightTag && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{bannerConfig.highlightTag}</span>
            </span>
          )}

          <p className="truncate text-[11px] sm:text-xs tracking-tight">
            {bannerConfig.text}
          </p>
        </div>

        {/* Right: Countdown + CTA Link + Close */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {bannerConfig.showCountdown && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/20 text-[11px] font-mono font-black">
              <Clock className="w-3 h-3" />
              <span>{timeString}</span>
            </div>
          )}

          {bannerConfig.linkLabel && (
            <a
              href={bannerConfig.linkUrl || '#'}
              className="px-2.5 py-1 rounded-md bg-black/30 hover:bg-black/50 transition-colors text-[11px] font-black flex items-center gap-1 group"
            >
              <span>{bannerConfig.linkLabel}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}

          {bannerConfig.isDismissible && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Fechar banner promocional"
              className="p-1 rounded-md hover:bg-black/20 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
