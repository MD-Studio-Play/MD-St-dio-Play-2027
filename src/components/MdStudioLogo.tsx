import React from 'react';

interface MdStudioLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const MdStudioLogo: React.FC<MdStudioLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-8', title: 'text-sm', sub: 'text-[9px]' },
    md: { img: 'w-10 h-10 sm:w-11 sm:h-11', title: 'text-base sm:text-lg', sub: 'text-[10px]' },
    lg: { img: 'w-14 h-14 sm:w-16 sm:h-16', title: 'text-xl sm:text-2xl', sub: 'text-xs' },
    xl: { img: 'w-24 h-24 sm:w-28 sm:h-28', title: 'text-3xl sm:text-4xl', sub: 'text-sm' },
  };

  const { img, title, sub } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`}>
      {/* Circular Emblem Container */}
      <div className={`relative ${img} shrink-0 rounded-full p-0.5 bg-gradient-to-b from-neutral-700 via-amber-500/40 to-neutral-900 shadow-lg shadow-amber-500/10 transition-transform group-hover:scale-105 duration-200 overflow-hidden`}>
        <img
          src="/md_studio_logo.jpg"
          alt="MD Stúdio Logo"
          className="w-full h-full object-cover rounded-full bg-black"
          onError={(e) => {
            // Fallback to stylized SVG if image is still loading
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1.5 font-['Syne',sans-serif] font-black tracking-tight">
            <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-black">
              MD
            </span>
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-black tracking-wider">
              STÚDIO
            </span>
          </div>
          <div className={`flex items-center gap-1.5 text-neutral-400 font-mono tracking-widest font-semibold uppercase mt-0.5 ${sub}`}>
            <span className="text-neutral-300">PLAY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
            <span className="text-amber-400">VS</span>
          </div>
        </div>
      )}
    </div>
  );
};
