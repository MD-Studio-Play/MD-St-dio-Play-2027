import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MdStudioLogo } from './MdStudioLogo';

interface FooterProps {
  onOpenCookiePreferences?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const { footerConfig, themeConfig, setIsAdminMode } = useStore();

  return (
    <footer className="w-full bg-[#08090b] border-t border-white/[0.06] pt-12 pb-14 px-4 sm:px-6 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        {/* MD STÚDIO Logo from StoreContext */}
        <div className="mb-8 flex flex-col items-center justify-center">
          <MdStudioLogo size="lg" className="mb-3" />
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            {footerConfig.slogan ||
              'A maior plataforma de playbacks profissionais, multitracks e ritmos do Brasil.'}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-neutral-400 py-3 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Zap style={{ color: themeConfig.primaryColor }} className="w-4 h-4" />
            <span>Envio Imediato via E-mail / WhatsApp</span>
          </div>
          <span className="hidden sm:inline text-neutral-600">·</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pagamento Seguro via PIX Oficial</span>
          </div>
          <span className="hidden sm:inline text-neutral-600">·</span>
          <span>Áudios Masterizados em 320kbps</span>
        </div>

        {/* Subtle Admin Access */}
        <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-center text-[11px] text-neutral-600">
          <button
            type="button"
            onClick={() => setIsAdminMode(true)}
            className="hover:text-neutral-400 transition-colors cursor-pointer"
          >
            Gestão Administrativa
          </button>
        </div>
      </div>
    </footer>
  );
};
