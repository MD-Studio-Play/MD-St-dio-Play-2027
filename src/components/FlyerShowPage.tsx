import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FlyerItem } from '../types';
import {
  ShoppingCart,
  Download,
  Check,
  CheckCircle,
  Sparkles,
  ExternalLink,
  X,
  Eye,
  Layers,
  FileCode2,
  Palette,
  ArrowLeft,
} from 'lucide-react';

const flyerMainPackImg = '/flyer_main_pack_1790608448982.jpg';
const flyerArrochaImg = '/flyer_arrocha_show_1790608491358.jpg';
const flyerForroImg = '/flyer_forro_arraia_1790608465989.jpg';
const flyerGospelImg = '/flyer_gospel_show_1790608478189.jpg';

export const resolveFlyerImage = (url?: string): string => {
  if (!url) return flyerMainPackImg;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.includes('flyer_arrocha_show')) return flyerArrochaImg;
  if (url.includes('flyer_forro_arraia')) return flyerForroImg;
  if (url.includes('flyer_gospel_show')) return flyerGospelImg;
  if (url.includes('flyer_main_pack')) return flyerMainPackImg;
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/');
  }
  return url;
};

interface FlyerShowPageProps {
  onAddToCart: (item: any) => void;
  isInCart: boolean;
  onReturnToPlaybacks?: () => void;
}

export const FlyerShowPage: React.FC<FlyerShowPageProps> = ({
  onAddToCart,
  isInCart,
  onReturnToPlaybacks,
}) => {
  const { flyerShowConfig } = useStore();
  const [selectedPreviewFlyer, setSelectedPreviewFlyer] = useState<FlyerItem | null>(null);

  const handleBuyPack = () => {
    onAddToCart({
      id: 'pack_flyer_150_mega',
      title: flyerShowConfig.title || 'Mega Coletânea Designer - Pack 150+ Flyers Editáveis',
      artist: 'MD Stúdio Design',
      genre: 'Flyer Show',
      genres: ['Flyer Show', 'Design Gráfico', 'Artes Editáveis'],
      originalPrice: flyerShowConfig.originalPrice || 97.0,
      discountPrice: flyerShowConfig.discountPrice || 57.99,
      image: resolveFlyerImage(flyerShowConfig.coverImage),
      releaseYear: 2026,
      tracks: [],
      postSaleUrl:
        flyerShowConfig.postSaleUrl ||
        'https://drive.google.com/drive/folders/1UdFKQtVtrGIcvS6U087ntO8-NYg8c2g1?usp=drive_link',
    });
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Return to Main Storefront Button at Top */}
      {onReturnToPlaybacks && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onReturnToPlaybacks}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#11161d] hover:bg-[#161d26] text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 font-extrabold text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shadow-lg shadow-cyan-950/40 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para a Loja de Playbacks & Ritmos</span>
          </button>
        </div>
      )}

      {/* Top Header of the Page identical to image */}
      <div className="text-center space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <div className="h-[1.5px] w-8 sm:w-24 md:w-36 bg-gradient-to-r from-transparent to-[#22d3ee]" />
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-[#22d3ee] tracking-wider uppercase text-center drop-shadow-[0_0_20px_rgba(34,211,238,0.45)]">
            {flyerShowConfig.headerTitle || 'FLYER PARA SHOW & EVENTOS'}
          </h1>
          <div className="h-[1.5px] w-8 sm:w-24 md:w-36 bg-gradient-to-l from-transparent to-[#22d3ee]" />
        </div>
        <p className="text-[11px] sm:text-xs md:text-sm text-neutral-400 font-bold uppercase tracking-widest text-center px-4">
          {flyerShowConfig.headerSubtitle ||
            'FLYERS PROFISSIONAIS DE ALTA CONVERSÃO PARA DIVULGAR SEU SHOW OU EVENTO.'}
        </p>
      </div>

      {/* Main Container Card with Glowing Cyan Border matching image */}
      <div className="relative rounded-3xl bg-[#090d12]/95 border-2 border-cyan-500/40 p-4 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Top Product Hero Block (2 Columns: Left Mockup Cover + Right Info/Pricing) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Flyer Cover Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] group">
              <img
                src={resolveFlyerImage(flyerShowConfig.coverImage)}
                alt={flyerShowConfig.title}
                className="w-full h-auto object-cover rounded-2xl group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = flyerMainPackImg;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Right Column: Promotional Details & Pricing */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              {/* Badge: SUPER PACK PROMOCIONAL */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{flyerShowConfig.badgeText || 'SUPER PACK PROMOCIONAL'}</span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight mt-3">
                {flyerShowConfig.title || 'MEGA COLETÂNEA DESIGNER - PACK 150+ FLYERS EDITÁVEIS'}
              </h2>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mt-2.5">
                {flyerShowConfig.description ||
                  'Transforme suas divulgações em segundos! Tenha acesso ao acervo profissional definitivo preferido pelos maiores produtores e cantores de shows do Brasil. Arquivos limpos e super organizados em camadas.'}
              </p>
            </div>

            {/* Checklist of Benefits (2 Columns with cyan checks) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-white/10">
              {(flyerShowConfig.features || []).map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-neutral-200">
                  <Check className="w-4 h-4 text-[#00e5ff] shrink-0 stroke-[3] mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>

            {/* Price and Cart Action Row */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Prices */}
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400 line-through font-mono">
                  {formatBRL(flyerShowConfig.originalPrice || 79.04)}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl sm:text-4xl font-black text-[#00e5ff] font-mono tracking-tight drop-shadow-[0_0_15px_rgba(0,229,255,0.45)]">
                    {formatBRL(flyerShowConfig.discountPrice || 49.9)}
                  </span>
                  {flyerShowConfig.discountTag && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{flyerShowConfig.discountTag}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleBuyPack}
                className="px-6 py-3.5 rounded-xl bg-[#00c8e5] hover:bg-[#00d8f7] text-black font-black text-sm uppercase flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_30px_rgba(0,200,229,0.45)] hover:shadow-[0_0_40px_rgba(0,200,229,0.65)] active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4 text-black stroke-[2.5]" />
                <span>{isInCart ? 'No Carrinho (Adicionar +1)' : 'Adicionar ao Carrinho'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Row of 7 Flyers identical to image */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Eye className="w-4 h-4" />
              <span>Modelos Inclusos no Pack (Clique para Ampliar)</span>
            </span>
            <span>7 Categorias Principais</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 sm:gap-3">
            {(flyerShowConfig.gallery || []).map((flyer) => (
              <div
                key={flyer.id}
                onClick={() => setSelectedPreviewFlyer(flyer)}
                className="group relative rounded-xl overflow-hidden border border-white/15 hover:border-cyan-400 transition-all cursor-pointer bg-black/60 shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] flex flex-col"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-900 relative">
                  <img
                    src={resolveFlyerImage(flyer.imageUrl)}
                    alt={flyer.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = flyerMainPackImg;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-2 py-1 rounded-md bg-cyan-500 text-black text-[10px] font-black uppercase shadow">
                      Ver Arte
                    </span>
                  </div>
                </div>
                <div className="p-1.5 bg-[#0b0f14] text-center border-t border-white/5">
                  <span className="block text-[11px] font-bold text-white truncate">
                    {flyer.title}
                  </span>
                  <span className="block text-[9px] text-cyan-400 truncate">
                    {flyer.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Large Centered Download Button: DOWNLOAD MODELO DEMO GRATIS */}
        <div className="mt-8 flex justify-center">
          <a
            href={flyerShowConfig.demoDownloadUrl || 'https://drive.google.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xl py-3.5 sm:py-4 px-6 rounded-2xl bg-black border-2 border-cyan-400 hover:border-cyan-300 hover:bg-cyan-950/40 text-white font-black text-sm sm:text-base uppercase flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(34,211,238,0.25)] hover:shadow-[0_0_35px_rgba(34,211,238,0.5)] cursor-pointer active:scale-98 text-center"
          >
            <Download className="w-5 h-5 text-white stroke-[2.5]" />
            <span>{flyerShowConfig.demoButtonText || 'DOWNLOAD MODELO DEMO GRATIS'}</span>
          </a>
        </div>

        {/* Bottom Return to Store Button */}
        {onReturnToPlaybacks && (
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-center">
            <button
              type="button"
              onClick={onReturnToPlaybacks}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 font-extrabold text-xs sm:text-sm cursor-pointer transition-all active:scale-95 group shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar ao Catálogo Completo de Playbacks & Ritmos</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal for Flyer Inspection */}
      {selectedPreviewFlyer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#0d1117] border-2 border-cyan-500/50 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {selectedPreviewFlyer.title}
                </h4>
                <span className="text-[10px] text-cyan-400 font-semibold uppercase">
                  {selectedPreviewFlyer.category} · Arquivo .PSD em Camadas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewFlyer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flyer Image Preview */}
            <div className="p-4 flex justify-center bg-black/50">
              <img
                src={resolveFlyerImage(selectedPreviewFlyer.imageUrl)}
                alt={selectedPreviewFlyer.title}
                className="max-h-[60vh] object-contain rounded-xl shadow-lg border border-white/10"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = flyerMainPackImg;
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-[#0a0d12]">
              <span className="text-xs text-neutral-400">
                Incluso no <strong className="text-white">Pack 150+ Flyers</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  handleBuyPack();
                  setSelectedPreviewFlyer(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#00c8e5] hover:bg-[#00d8f7] text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Comprar Pack Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
