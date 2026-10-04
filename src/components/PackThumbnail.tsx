import React, { useState } from 'react';
import { PlaybackPack } from '../types';
import { Disc3 } from 'lucide-react';

interface PackThumbnailProps {
  pack: PlaybackPack;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PackThumbnail: React.FC<PackThumbnailProps> = ({
  pack,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12 md:w-14 md:h-14',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  }[size];

  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden border border-white/15 bg-neutral-900 shadow-md group-hover:scale-105 transition-transform duration-200 ${sizeClasses} ${className}`}
    >
      {!hasError && pack.image ? (
        <img
          src={pack.image}
          alt={pack.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-400">
          <Disc3 className="w-1/2 h-1/2 opacity-60" />
        </div>
      )}
    </div>
  );
};

