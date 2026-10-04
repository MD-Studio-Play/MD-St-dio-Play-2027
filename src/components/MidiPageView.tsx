import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { PlaybackPack } from '../types';
import { Play, Pause, ArrowLeft, ListMusic, ExternalLink } from 'lucide-react';

interface MidiPageViewProps {
  type: 'variados' | 'gospel';
  onAddToCart: (item: any) => void;
  isInCart: boolean;
  onReturnToPlaybacks: () => void;
  packs: PlaybackPack[];
  isPlayingGlobal: boolean;
  currentPlayingPack: PlaybackPack | null;
  onPlayToggleGlobal: (pack: PlaybackPack) => void;
  cartPackIds: Set<string>;
}

export const MidiPageView: React.FC<MidiPageViewProps> = ({
  type,
  onAddToCart,
  isInCart,
  onReturnToPlaybacks,
}) => {
  const { midiVariadosConfig, midiGospelConfig } = useStore();
  const config = type === 'variados' ? midiVariadosConfig : midiGospelConfig;

  // Local audio preview playback with strict isolation between categories
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop and clean up audio immediately when switching between Variados and Gospel or changing audio URL
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlayingAudio(false);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
    };
  }, [type, config.audioPreviewUrl]);

  const handleToggleAudio = () => {
    const audioUrl = config.audioPreviewUrl?.trim();
    if (!audioUrl) return;

    if (!audioRef.current || audioRef.current.src !== audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
      audioRef.current.onerror = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
        })
        .catch((e) => {
          console.warn('Audio play notice:', e);
          setIsPlayingAudio(false);
        });
    }
  };

  const handleBuyMidiPack = () => {
    onAddToCart({
      id: type === 'variados' ? 'pack_midi_variados_vip_2026' : 'pack_midi_gospel_vip_2026',
      title: config.title,
      artist: 'MD Stúdio Produções',
      genre: type === 'variados' ? 'MIDI Variados' : 'MIDI Gospel',
      genres: [type === 'variados' ? 'MIDI Variados' : 'MIDI Gospel', 'Arranjos MIDI', 'Multitracks'],
      originalPrice: config.price * 1.5,
      discountPrice: config.price,
      image: config.circleImage,
      releaseYear: 2026,
      tracks: [],
      postSaleUrl: config.postSaleUrl,
    });
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isGospel = type === 'gospel';

  // Distinct styling based on category
  const themeBorder = isGospel ? 'border-2 border-[#facc15]' : 'border-2 border-cyan-400';
  const themeShadow = isGospel
    ? 'shadow-[0_0_50px_rgba(250,204,21,0.22)]'
    : 'shadow-[0_0_50px_rgba(6,182,212,0.25)]';
  const themeHighlightColor = isGospel ? 'text-[#facc15]' : 'text-[#00e5ff]';
  const audioShadow = isGospel
    ? 'shadow-[0_0_25px_rgba(250,204,21,0.18)]'
    : 'shadow-[0_0_25px_rgba(6,182,212,0.2)]';

  // Default fallback paragraphs if description is single line
  const descriptionParagraphs = (config.description || '')
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-in fade-in duration-300">
      {/* Return button header */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onReturnToPlaybacks}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Todos os PlayBacks</span>
        </button>
        <span
          className={`text-[11px] font-bold uppercase tracking-widest ${
            isGospel ? 'text-yellow-400' : 'text-cyan-400'
          }`}
        >
          MD STÚDIO · {isGospel ? 'MIDI GOSPEL' : 'MIDI VARIADOS'}
        </span>
      </div>

      {/* MAIN HERO CARD (100% Identical to image) */}
      <div
        className={`relative rounded-3xl bg-black ${themeBorder} p-6 sm:p-8 md:p-10 ${themeShadow} overflow-hidden`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT COLUMN: Square Card with Rounded Corners + Pill Badge with Yellow/Cyan Border */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            {/* Square Artwork with Rounded Corners and Glowing Border */}
            <div
              className={`relative w-full max-w-[420px] aspect-square rounded-[26px] ${themeBorder} overflow-hidden bg-black shadow-2xl group`}
            >
              <img
                src={config.circleImage || (isGospel ? '/midi_gospel_art.jpg' : '/midi_variados_art.jpg')}
                alt={config.title}
                className="w-full h-full object-cover rounded-[24px] group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = isGospel ? '/midi_gospel_art.jpg' : '/midi_variados_art.jpg';
                }}
              />
            </div>

            {/* Bottom Pill Badge below artwork with matching Border */}
            <div className="mt-5 w-full max-w-[420px]">
              <div
                className={`${themeBorder} bg-black px-6 py-3.5 rounded-xl font-bold text-white text-xs sm:text-sm tracking-widest uppercase text-center shadow-lg`}
              >
                {config.bottomPillText || 'MILHARES ARQUIVOS MIDI PROFISSIONAIS'}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Centered Texts, Audio Preview, and Vibrant Green Button */}
          <div className="lg:col-span-7 flex flex-col items-center text-center justify-center space-y-4 sm:space-y-5">
            {/* Top Star Tag in Gold/Yellow */}
            <div className="text-[#facc15] text-xs sm:text-sm md:text-base font-black tracking-widest uppercase flex items-center justify-center gap-1.5 drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]">
              <span>{config.topBadge || (isGospel ? '★ COLETÂNEA EXCLUSIVA DE ARRANJOS ★' : '★ COLETÂNEA EXCLUSIVA DE ARRANJOS MIDI ★')}</span>
            </div>

            {/* Title in Gold/Yellow matching image */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[28px] font-black text-[#facc15] uppercase tracking-tight leading-snug drop-shadow-[0_0_15px_rgba(250,204,21,0.35)]">
              {config.title || (isGospel ? 'COLETÂNEA MEGA PACK MIDI GOSPEL 2026' : 'COLETÂNEA MEGA PACK MIDI VARIADOSVIP 2026')}
            </h1>

            {/* 3 Description Paragraphs centered and bold white */}
            <div className="pt-1 space-y-2.5 sm:space-y-3 text-xs sm:text-sm md:text-[14.5px] text-white leading-relaxed font-bold max-w-xl mx-auto">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((para, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p>
                    Tenha acesso a uma coleção completa de arquivos MIDI{isGospel ? ' GOSPEL' : ''}, cuidadosamente organizada para músicos, tecladistas e produtores.
                  </p>
                  <p>
                    Chega de comprar MIDIs separados por preços elevados.
                  </p>
                  <p>
                    Tenha tudo reunido em uma única coletânea e faça o download de forma rápida, prática e organizada.
                  </p>
                </>
              )}
            </div>

            {/* Highlights in Yellow/Cyan matching image */}
            <div className="pt-2 text-center space-y-1">
              <p
                className={`text-sm sm:text-base md:text-lg font-black tracking-wide ${themeHighlightColor} drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]`}
              >
                {config.subHighlight1 || (isGospel ? 'Centenas de MIDIs GOSPEL em um único pacote!' : 'Centenas de MIDIs variados em um único pacote!')}
              </p>
              <p
                className={`text-sm sm:text-base md:text-lg font-black uppercase tracking-wider ${themeHighlightColor} drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]`}
              >
                {config.subHighlight2 || config.priceLabel || 'VALOR ESPECIAL DA COLETÂNEA'}
              </p>

              {/* Preço Especial Sempre Visível conforme solicitado */}
              <div className="flex items-center justify-center gap-2 pt-1 font-mono">
                <span className={`text-2xl sm:text-3xl font-black ${themeHighlightColor} drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]`}>
                  {formatBRL(config.price || 57.99)}
                </span>
                <span className="text-xs text-neutral-400 font-semibold">{config.priceSubtext || '/ no pix'}</span>
              </div>
            </div>

            {/* Audio Preview Box with matching Border */}
            <div
              className={`w-full max-w-xl mx-auto p-4 sm:p-5 rounded-2xl bg-black ${themeBorder} flex items-center gap-4 sm:gap-6 ${audioShadow} hover:bg-white/[0.02] transition-all relative overflow-hidden`}
            >
              {/* Subtle background ambient gradient specific to each category */}
              <div
                className={`absolute inset-0 pointer-events-none opacity-15 ${
                  isGospel
                    ? 'bg-gradient-to-r from-yellow-500/30 via-amber-500/10 to-transparent'
                    : 'bg-gradient-to-r from-cyan-500/30 via-blue-500/10 to-transparent'
                }`}
              />

              {/* Distinct Circular Play/Pause Button */}
              <button
                type="button"
                onClick={handleToggleAudio}
                title={isPlayingAudio ? 'Pausar Demonstração' : 'Ouvir Demonstração'}
                className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${
                  isGospel
                    ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black shadow-[0_0_28px_rgba(250,204,21,0.85)] hover:shadow-[0_0_38px_rgba(250,204,21,1)] border-2 border-yellow-200/60'
                    : 'bg-gradient-to-tr from-cyan-500 via-[#00e5ff] to-cyan-300 text-black shadow-[0_0_28px_rgba(0,229,255,0.85)] hover:shadow-[0_0_38px_rgba(0,229,255,1)] border-2 border-cyan-200/60'
                }`}
              >
                {isPlayingAudio ? (
                  <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black" />
                ) : (
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black ml-1" />
                )}
              </button>

              <div className="relative z-10 min-w-0 flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`font-black text-xs sm:text-sm md:text-base tracking-wide uppercase ${
                      isGospel ? 'text-yellow-400' : 'text-cyan-400'
                    }`}
                  >
                    {config.audioPreviewTitle || (isGospel ? 'DEMONSTRAÇÃO DE ÁUDIO — MIDI GOSPEL' : 'DEMONSTRAÇÃO DE ÁUDIO — MIDI VARIADOS')}
                  </span>
                  {isPlayingAudio && (
                    <span className="flex items-center gap-0.5">
                      <span className={`w-1 h-3 rounded-full animate-bounce ${isGospel ? 'bg-yellow-400' : 'bg-cyan-400'}`} style={{ animationDelay: '0ms' }} />
                      <span className={`w-1 h-4 rounded-full animate-bounce ${isGospel ? 'bg-yellow-400' : 'bg-cyan-400'}`} style={{ animationDelay: '150ms' }} />
                      <span className={`w-1 h-2 rounded-full animate-bounce ${isGospel ? 'bg-yellow-400' : 'bg-cyan-400'}`} style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-neutral-300 font-medium block mt-1">
                  {config.audioPreviewSubtitle || (isGospel ? 'Clique para ouvir uma amostra dos MIDI Gospel' : 'Clique para ouvir uma amostra dos ritmos variados')}
                </span>
                {isPlayingAudio && (
                  <span className={`text-[10px] font-bold tracking-wider uppercase block mt-1 ${isGospel ? 'text-yellow-400' : 'text-cyan-400'}`}>
                    ▶ Reproduzindo Áudio {isGospel ? 'Gospel' : 'Variados'}
                  </span>
                )}
              </div>
            </div>

            {/* Vibrant Green Purchase Button on two lines matching image */}
            <div className="w-full flex justify-center pt-2">
              <button
                type="button"
                onClick={handleBuyMidiPack}
                className="w-full max-w-md py-4 sm:py-5 px-8 rounded-2xl bg-[#1ec75f] hover:bg-[#18b554] text-white font-black text-base sm:text-lg uppercase tracking-wider flex flex-col items-center justify-center leading-tight cursor-pointer shadow-[0_0_35px_rgba(30,199,95,0.45)] hover:shadow-[0_0_50px_rgba(30,199,95,0.7)] active:scale-95 transition-all"
              >
                <span>{isInCart ? 'PRODUTO NO CARRINHO' : 'ADQUIRA A COLETÂNEA COMPLETA'}</span>
                <span className="mt-0.5 text-xs sm:text-sm font-extrabold text-white/95">
                  {isInCart ? '(ADICIONAR MAIS UM)' : `POR APENAS ${formatBRL(config.price || 57.99)}`}
                </span>
              </button>
            </div>

            {/* Botão da Lista de Músicas (Configurado no Admin) */}
            {config.tracklistUrl && (
              <div className="w-full flex justify-center pt-1">
                <a
                  href={config.tracklistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full max-w-md py-3 px-6 rounded-2xl ${themeBorder} bg-black/90 hover:bg-white/[0.08] ${themeHighlightColor} font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(0,0,0,0.6)] active:scale-95 cursor-pointer`}
                >
                  <ListMusic className="w-4 h-4 shrink-0" />
                  <span>{config.tracklistButtonText || 'VER LISTA COMPLETA DAS MÚSICAS'}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
