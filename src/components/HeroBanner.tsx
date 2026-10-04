import React from 'react';
import { useStore } from '../context/StoreContext';

const DEFAULT_BANNER_IMAGE = 'https://moriartdigital.com.br/mdstudio/wa_images/banner_(1).png?v=1l5lhuo';

export const HeroBanner: React.FC = () => {
  const { bannerConfig } = useStore();

  const imageUrl = bannerConfig?.imageUrl || DEFAULT_BANNER_IMAGE;
  const isEnabled = bannerConfig?.showImageBanner !== false;

  if (!isEnabled || !imageUrl) {
    return null;
  }

  const BannerContent = (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#111216] transition-all duration-300 hover:border-white/25 group">
      <img
        src={imageUrl}
        alt="MD Stúdio Playbacks - Banner Promocional"
        className="w-full h-auto object-cover max-h-[360px] rounded-2xl block transition-transform duration-500 group-hover:scale-[1.008]"
        loading="eager"
        decoding="async"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.endsWith('/banner.png')) {
            target.src = '/banner.png';
          }
        }}
      />
    </div>
  );

  return (
    <section aria-label="Banner de Destaque" className="w-full mb-4 sm:mb-6">
      {bannerConfig?.imageLinkUrl ? (
        <a
          href={bannerConfig.imageLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-opacity hover:opacity-95"
        >
          {BannerContent}
        </a>
      ) : (
        BannerContent
      )}
    </section>
  );
};
