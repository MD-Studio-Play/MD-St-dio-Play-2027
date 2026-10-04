import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { MdStudioLogo } from '../MdStudioLogo';
import {
  Palette,
  Flag,
  Image as ImageIcon,
  Menu as MenuIcon,
  LayoutTemplate,
  ShoppingBag,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Clock,
  Eye,
  MessageCircle,
} from 'lucide-react';

export const AppearanceTab: React.FC = () => {
  const {
    themeConfig,
    setThemeConfig,
    bannerConfig,
    setBannerConfig,
    logoConfig,
    setLogoConfig,
    menuConfig,
    setMenuConfig,
    footerConfig,
    setFooterConfig,
    cartConfig,
    setCartConfig,
  } = useStore();

  const [activeSubSection, setActiveSubSection] = useState<
    'banner' | 'logo' | 'colors' | 'menu' | 'footer' | 'cart'
  >('banner');

  const [savedFeedback, setSavedFeedback] = useState(false);

  // New coupon form state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(15);

  // New menu item form state
  const [newMenuLabel, setNewMenuLabel] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('Piseiro');

  const showSaveNotice = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const COLOR_PALETTES = [
    { name: 'Verde JS (Original)', primary: '#55c21b', secondary: '#62dc20' },
    { name: 'Ciano Neon', primary: '#06b6d4', secondary: '#22d3ee' },
    { name: 'Magenta & Pink', primary: '#d946ef', secondary: '#e879f9' },
    { name: 'Dourado Vip', primary: '#f59e0b', secondary: '#fbbf24' },
    { name: 'Azul Elétrico', primary: '#3b82f6', secondary: '#60a5fa' },
    { name: 'Vermelho Fogo', primary: '#ef4444', secondary: '#f87171' },
    { name: 'Esmeralda Puro', primary: '#10b981', secondary: '#34d399' },
  ];

  const BG_PRESETS = [
    { name: 'Escuro Padrão', color: '#0b0c0e' },
    { name: 'Preto Absoluto', color: '#000000' },
    { name: 'Grafite Carvão', color: '#121316' },
    { name: 'Azul Noturno', color: '#090d16' },
  ];

  // Coupon handlers
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (cartConfig.coupons.some((c) => c.code === cleanCode)) {
      return;
    }
    setCartConfig({
      ...cartConfig,
      coupons: [
        ...cartConfig.coupons,
        { code: cleanCode, discountPercent: Number(newCouponDiscount), active: true },
      ],
    });
    setNewCouponCode('');
    showSaveNotice();
  };

  const handleToggleCoupon = (code: string) => {
    setCartConfig({
      ...cartConfig,
      coupons: cartConfig.coupons.map((c) =>
        c.code === code ? { ...c, active: !c.active } : c
      ),
    });
    showSaveNotice();
  };

  const handleDeleteCoupon = (code: string) => {
    setCartConfig({
      ...cartConfig,
      coupons: cartConfig.coupons.filter((c) => c.code !== code),
    });
    showSaveNotice();
  };

  // Menu items handlers
  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuLabel) return;
    setMenuConfig({
      ...menuConfig,
      items: [
        ...menuConfig.items,
        {
          id: `menu_${Date.now()}`,
          label: newMenuLabel.trim(),
          category: newMenuCategory,
          visible: true,
        },
      ],
    });
    setNewMenuLabel('');
    showSaveNotice();
  };

  const handleToggleMenuItem = (id: string) => {
    setMenuConfig({
      ...menuConfig,
      items: menuConfig.items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      ),
    });
    showSaveNotice();
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuConfig({
      ...menuConfig,
      items: menuConfig.items.filter((item) => item.id !== id),
    });
    showSaveNotice();
  };

  return (
    <div className="space-y-6">
      {/* Subsections navigation tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#111216] border border-white/[0.08] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubSection('banner')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'banner'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Banner no Topo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('logo')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'logo'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Logotipo & Nome</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('colors')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'colors'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Cores & Botões</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('menu')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'menu'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MenuIcon className="w-3.5 h-3.5" />
          <span>Menu de Conteúdos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('footer')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'footer'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span>Rodapé</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('cart')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubSection === 'cart'
              ? 'bg-[#55c21b] text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Carrinho & Cupons</span>
        </button>
      </div>

      {/* Save Notification */}
      {savedFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#55c21b] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Alteração salva com sucesso e aplicada ao vivo!</span>
        </div>
      )}

      {/* SECTION 1: Banner no Topo */}
      {activeSubSection === 'banner' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#55c21b]" />
                <span>Configuração do Banner no Topo</span>
              </h4>
              <p className="text-xs text-neutral-400">
                Aparece no topo de todas as páginas para avisos urgentes, promoções e cupons.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-neutral-300">
                {bannerConfig.enabled ? 'Banner Ativado' : 'Banner Desativado'}
              </span>
              <input
                type="checkbox"
                checked={bannerConfig.enabled}
                onChange={(e) => {
                  setBannerConfig({ ...bannerConfig, enabled: e.target.checked });
                  showSaveNotice();
                }}
                className="w-4 h-4 accent-[#55c21b] cursor-pointer"
              />
            </label>
          </div>

          {/* Banner Live Preview */}
          <div>
            <div className="text-xs font-semibold text-neutral-400 mb-1.5 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>Pré-visualização do Banner em Tempo Real:</span>
            </div>
            <div
              style={{
                backgroundColor: bannerConfig.bgColor,
                color: bannerConfig.textColor,
              }}
              className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-md"
            >
              <div className="flex items-center gap-2">
                {bannerConfig.highlightTag && (
                  <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] uppercase font-black">
                    {bannerConfig.highlightTag}
                  </span>
                )}
                <span>{bannerConfig.text}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {bannerConfig.showCountdown && (
                  <span className="px-2 py-0.5 rounded bg-black/20 font-mono text-[11px]">
                    03:42:15
                  </span>
                )}
                {bannerConfig.linkLabel && (
                  <span className="px-2 py-0.5 rounded bg-black/30 text-[10px] uppercase">
                    {bannerConfig.linkLabel} &rarr;
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Texto Principal do Banner
              </label>
              <textarea
                rows={2}
                value={bannerConfig.text}
                onChange={(e) => {
                  setBannerConfig({ ...bannerConfig, text: e.target.value });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Tag de Destaque
                </label>
                <input
                  type="text"
                  value={bannerConfig.highlightTag}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, highlightTag: e.target.value });
                    showSaveNotice();
                  }}
                  placeholder="Ex: SUPER OFERTA, LANÇAMENTO"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.linkLabel}
                    onChange={(e) => {
                      setBannerConfig({ ...bannerConfig, linkLabel: e.target.value });
                      showSaveNotice();
                    }}
                    placeholder="VER OFERTAS"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Link do Botão
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.linkUrl}
                    onChange={(e) => {
                      setBannerConfig({ ...bannerConfig, linkUrl: e.target.value });
                      showSaveNotice();
                    }}
                    placeholder="#"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color & Timer options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Cor de Fundo do Banner
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bannerConfig.bgColor}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, bgColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bannerConfig.bgColor}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, bgColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-white uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Cor do Texto
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bannerConfig.textColor}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, textColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bannerConfig.textColor}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, textColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-white uppercase font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-300">
                <input
                  type="checkbox"
                  checked={bannerConfig.showCountdown}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, showCountdown: e.target.checked });
                    showSaveNotice();
                  }}
                  className="w-4 h-4 accent-[#55c21b]"
                />
                <span>Exibir Contador Regressivo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-300">
                <input
                  type="checkbox"
                  checked={bannerConfig.isDismissible}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, isDismissible: e.target.checked });
                    showSaveNotice();
                  }}
                  className="w-4 h-4 accent-[#55c21b]"
                />
                <span>Permitir cliente fechar o banner (X)</span>
              </label>
            </div>
          </div>

          {/* Sub-block: Banner Gráfico / Imagem no Topo */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#55c21b]" />
                  <span>Banner Gráfico de Destaque (Topo do Site)</span>
                </h5>
                <p className="text-[11px] text-neutral-400">
                  Banner visual que fica no topo da loja (recomendado: 1200 x 350 px).
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-neutral-300">
                  {bannerConfig.showImageBanner !== false ? 'Ativado' : 'Desativado'}
                </span>
                <input
                  type="checkbox"
                  checked={bannerConfig.showImageBanner !== false}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, showImageBanner: e.target.checked });
                    showSaveNotice();
                  }}
                  className="w-4 h-4 accent-[#55c21b] cursor-pointer"
                />
              </label>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-400 font-semibold">
                    URL da Imagem do Banner
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerConfig({
                        ...bannerConfig,
                        imageUrl: 'https://moriartdigital.com.br/mdstudio/wa_images/banner_(1).png?v=1l5lhuo',
                        showImageBanner: true,
                      });
                      showSaveNotice();
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Restaurar Oficial Moriart
                  </button>
                </div>
                <input
                  type="text"
                  value={bannerConfig.imageUrl || ''}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, imageUrl: e.target.value });
                    showSaveNotice();
                  }}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Link ao Clicar no Banner (Opcional)
                </label>
                <input
                  type="text"
                  value={bannerConfig.imageLinkUrl || ''}
                  onChange={(e) => {
                    setBannerConfig({ ...bannerConfig, imageLinkUrl: e.target.value });
                    showSaveNotice();
                  }}
                  placeholder="https://wa.me/... ou link interno"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30 text-xs"
                />
              </div>
            </div>

            {/* Live Banner Image Preview */}
            {bannerConfig.imageUrl && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-400">
                  Pré-visualização do Banner Gráfico:
                </span>
                <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/50 max-h-[220px]">
                  <img
                    src={bannerConfig.imageUrl}
                    alt="Prévia do Banner"
                    className="w-full h-auto object-cover max-h-[220px] rounded-xl block"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/banner.png')) {
                        target.src = '/banner.png';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Logotipo & Identidade */}
      {activeSubSection === 'logo' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#55c21b]" />
              <span>Logotipo & Identidade Visual</span>
            </h4>
            <p className="text-xs text-neutral-400">
              Personalize a marca da loja exibida no cabeçalho e rodapé.
            </p>
          </div>

          {/* Official Preset Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-amber-500/40">
                <img src="/md_studio_logo.jpg" alt="MD Studio" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Logotipo Oficial: MD STÚDIO - PLAY VS</div>
                <div className="text-[11px] text-amber-300">Emblema 3D Prata & Dourado com equalizador sonoro</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogoConfig({
                  mode: 'image',
                  brandName: 'MD STÚDIO',
                  highlightPrefix: 'MD',
                  imageUrl: '/md_studio_logo.jpg',
                  slogan: 'MD Stúdio - Playbacks Profissionais, Multitracks & Ritmos Exclusivos',
                });
                showSaveNotice();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-colors cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
            >
              Aplicar Logotipo Oficial
            </button>
          </div>

          {/* Mode Switch */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setLogoConfig({ ...logoConfig, mode: 'image', imageUrl: '/md_studio_logo.jpg' });
                showSaveNotice();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                logoConfig.mode === 'image'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-black/30 text-neutral-400 hover:text-white'
              }`}
            >
              Logotipo por Imagem (Emblema)
            </button>
            <button
              type="button"
              onClick={() => {
                setLogoConfig({ ...logoConfig, mode: 'text' });
                showSaveNotice();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                logoConfig.mode === 'text'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-black/30 text-neutral-400 hover:text-white'
              }`}
            >
              Logotipo em Texto Estilizado
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {logoConfig.mode === 'text' ? (
              <>
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Prefixo Destacado (Dourado/Prata)
                  </label>
                  <input
                    type="text"
                    value={logoConfig.highlightPrefix}
                    onChange={(e) => {
                      setLogoConfig({ ...logoConfig, highlightPrefix: e.target.value });
                      showSaveNotice();
                    }}
                    placeholder="MD"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-white/30 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Nome Principal da Marca
                  </label>
                  <input
                    type="text"
                    value={logoConfig.brandName}
                    onChange={(e) => {
                      setLogoConfig({ ...logoConfig, brandName: e.target.value });
                      showSaveNotice();
                    }}
                    placeholder="STÚDIO"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-white/30 font-bold"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Caminho ou URL da Imagem do Logotipo
                </label>
                <input
                  type="text"
                  value={logoConfig.imageUrl}
                  onChange={(e) => {
                    setLogoConfig({ ...logoConfig, imageUrl: e.target.value });
                    showSaveNotice();
                  }}
                  placeholder="/md_studio_logo.jpg"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white font-mono outline-none focus:border-white/30"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-neutral-400 mb-1 font-semibold">
                Slogan / Descrição Curta
              </label>
              <input
                type="text"
                value={logoConfig.slogan}
                onChange={(e) => {
                  setLogoConfig({ ...logoConfig, slogan: e.target.value });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Logo Live Preview */}
          <div className="p-4 bg-black/50 border border-white/5 rounded-xl">
            <span className="text-[11px] text-neutral-400 block mb-3 font-semibold">
              Prévia ao Vivo do Logotipo:
            </span>
            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10 inline-block">
              {logoConfig.imageUrl === '/md_studio_logo.jpg' || !logoConfig.imageUrl ? (
                <MdStudioLogo size="lg" />
              ) : logoConfig.mode === 'image' && logoConfig.imageUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logoConfig.imageUrl}
                    alt="Logo"
                    className="h-12 w-12 rounded-full object-cover border border-amber-500/40"
                  />
                  <div>
                    <div className="font-['Syne',sans-serif] font-black text-xl text-white">
                      {logoConfig.brandName}
                    </div>
                    <div className="text-xs text-neutral-400">{logoConfig.slogan}</div>
                  </div>
                </div>
              ) : (
                <span className="font-['Syne',sans-serif] tracking-tight text-2xl font-black">
                  <span style={{ color: themeConfig.primaryColor }}>
                    {logoConfig.highlightPrefix}
                  </span>{' '}
                  {logoConfig.brandName}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Cores & Botões */}
      {activeSubSection === 'colors' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-6">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#55c21b]" />
              <span>Personalização de Cores e Estilo dos Botões</span>
            </h4>
            <p className="text-xs text-neutral-400">
              Defina a paleta global do e-commerce. As alterações afetam imediatamente os botões, preços e elementos interativos.
            </p>
          </div>

          {/* Presets Grid */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              Paletas de Cores Prontas:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.name}
                  type="button"
                  onClick={() => {
                    setThemeConfig({
                      ...themeConfig,
                      primaryColor: pal.primary,
                      secondaryColor: pal.secondary,
                    });
                    showSaveNotice();
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    themeConfig.primaryColor === pal.primary
                      ? 'border-white bg-white/10 shadow-md'
                      : 'border-white/10 hover:border-white/30 bg-black/30'
                  }`}
                >
                  <div
                    style={{ backgroundColor: pal.primary }}
                    className="w-7 h-7 rounded-full shadow-md"
                  />
                  <span className="text-[10px] text-neutral-300 font-semibold text-center line-clamp-1">
                    {pal.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Hex Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Cor Primária (Destaques & Botão Comprar)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeConfig.primaryColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, primaryColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={themeConfig.primaryColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, primaryColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-28 bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Cor Secundária (Hover & Gradientes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeConfig.secondaryColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, secondaryColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={themeConfig.secondaryColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, secondaryColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-28 bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Cor de Fundo da Loja
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeConfig.backgroundColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, backgroundColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={themeConfig.backgroundColor}
                  onChange={(e) => {
                    setThemeConfig({ ...themeConfig, backgroundColor: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-28 bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Button Shape & Buy Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1.5 font-semibold">
                Formato dos Botões de Ação
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setThemeConfig({ ...themeConfig, buttonShape: 'rounded' });
                    showSaveNotice();
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    themeConfig.buttonShape === 'rounded'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-black/30 text-neutral-400'
                  }`}
                >
                  Arredondado Suave (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemeConfig({ ...themeConfig, buttonShape: 'pill' });
                    showSaveNotice();
                  }}
                  className={`px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    themeConfig.buttonShape === 'pill'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-black/30 text-neutral-400'
                  }`}
                >
                  Pílula 100%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemeConfig({ ...themeConfig, buttonShape: 'square' });
                    showSaveNotice();
                  }}
                  className={`px-3 py-2 rounded-none text-xs font-bold transition-all cursor-pointer ${
                    themeConfig.buttonShape === 'square'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-black/30 text-neutral-400'
                  }`}
                >
                  Quadrado
                </button>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Texto do Botão de Compra no Card
              </label>
              <input
                type="text"
                value={themeConfig.buyButtonText}
                onChange={(e) => {
                  setThemeConfig({ ...themeConfig, buyButtonText: e.target.value });
                  showSaveNotice();
                }}
                placeholder="Ex: Comprar, Adicionar, Adquirir"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-white/30 font-bold"
              />
            </div>
          </div>

          {/* Button Live Preview */}
          <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold">
              Pré-visualização do Botão de Compra:
            </span>
            <button
              type="button"
              style={{
                backgroundColor: themeConfig.primaryColor,
              }}
              className={`px-5 py-2 text-black font-black text-xs shadow-md ${
                themeConfig.buttonShape === 'pill'
                  ? 'rounded-full'
                  : themeConfig.buttonShape === 'square'
                  ? 'rounded-none'
                  : 'rounded-lg'
              }`}
            >
              {themeConfig.buyButtonText}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: Menu de Conteúdos */}
      {activeSubSection === 'menu' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MenuIcon className="w-4 h-4 text-[#55c21b]" />
              <span>Menu de Conteúdos & Suporte</span>
            </h4>
            <p className="text-xs text-neutral-400">
              Configure as opções que aparecem no menu lateral da loja e os canais de contato.
            </p>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-300">
              Itens Atuais do Menu Lateral:
            </span>
            {menuConfig.items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{item.label}</span>
                  {item.category && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-neutral-400">
                      Filtro: {item.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={() => handleToggleMenuItem(item.id)}
                      className="w-3.5 h-3.5 accent-[#55c21b]"
                    />
                    <span>{item.visible ? 'Visível' : 'Oculto'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteMenuItem(item.id)}
                    className="p-1 rounded text-neutral-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add menu item form */}
          <form
            onSubmit={handleAddMenuItem}
            className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 text-xs"
          >
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Adicionar Item ao Menu
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newMenuLabel}
                onChange={(e) => setNewMenuLabel(e.target.value)}
                placeholder="Nome do item (ex: Melhores de 2026)"
                required
                className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
              />
              <select
                value={newMenuCategory}
                onChange={(e) => setNewMenuCategory(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none"
              >
                <option value="Todos">Todos os Playbacks</option>
                <option value="Arrocha">Arrocha</option>
                <option value="Axé Bahia">Axé Bahia</option>
                <option value="Forró">Forró</option>
                <option value="Vaquejada">Vaquejada</option>
                <option value="Piseiro">Piseiro</option>
                <option value="Modão">Modão</option>
                <option value="Reggae">Reggae</option>
                <option value="Sertanejo">Sertanejo</option>
                <option value="MPB">MPB</option>
                <option value="Pop Rock">Pop Rock</option>
                <option value="Pagode">Pagode</option>
                <option value="Brega">Brega</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#55c21b] text-black font-extrabold rounded-lg cursor-pointer"
            >
              + Adicionar Item
            </button>
          </form>

          {/* WhatsApp Support Config */}
          <div className="pt-3 border-t border-white/10 space-y-3 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Canal de Atendimento WhatsApp</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">
                  Número com DDD (sem caracteres especiais)
                </label>
                <input
                  type="text"
                  value={menuConfig.whatsappNumber}
                  onChange={(e) => {
                    setMenuConfig({ ...menuConfig, whatsappNumber: e.target.value });
                    showSaveNotice();
                  }}
                  placeholder="5511999998888"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">
                  Mensagem Padrão de Início de Conversa
                </label>
                <input
                  type="text"
                  value={menuConfig.whatsappMessage}
                  onChange={(e) => {
                    setMenuConfig({ ...menuConfig, whatsappMessage: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Rodapé */}
      {activeSubSection === 'footer' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-[#55c21b]" />
              <span>Personalização do Rodapé</span>
            </h4>
            <p className="text-xs text-neutral-400">
              Gerencie redes sociais, CNPJ, avisos de direitos autorais e dados da empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Razão Social / Nome da Empresa
              </label>
              <input
                type="text"
                value={footerConfig.companyName}
                onChange={(e) => {
                  setFooterConfig({ ...footerConfig, companyName: e.target.value });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                CNPJ
              </label>
              <input
                type="text"
                value={footerConfig.cnpj}
                onChange={(e) => {
                  setFooterConfig({ ...footerConfig, cnpj: e.target.value });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-neutral-400 mb-1 font-semibold">
                Texto de Direitos Autorais / Copyright
              </label>
              <textarea
                rows={2}
                value={footerConfig.copyrightText}
                onChange={(e) => {
                  setFooterConfig({ ...footerConfig, copyrightText: e.target.value });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="pt-3 border-t border-white/10 space-y-3 text-xs">
            <span className="font-bold text-white block">
              Links das Redes Sociais Oficiais:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={footerConfig.instagramUrl}
                  onChange={(e) => {
                    setFooterConfig({ ...footerConfig, instagramUrl: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">YouTube URL</label>
                <input
                  type="text"
                  value={footerConfig.youtubeUrl}
                  onChange={(e) => {
                    setFooterConfig({ ...footerConfig, youtubeUrl: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">TikTok URL</label>
                <input
                  type="text"
                  value={footerConfig.tiktokUrl}
                  onChange={(e) => {
                    setFooterConfig({ ...footerConfig, tiktokUrl: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Kwai URL</label>
                <input
                  type="text"
                  value={footerConfig.kwaiUrl}
                  onChange={(e) => {
                    setFooterConfig({ ...footerConfig, kwaiUrl: e.target.value });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: Carrinho & Cupons */}
      {activeSubSection === 'cart' && (
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#55c21b]" />
              <span>Gerenciamento do Carrinho & Cupons Ativos</span>
            </h4>
            <p className="text-xs text-neutral-400">
              Cadastre códigos promocionais de desconto e mensagens de entrega imediata.
            </p>
          </div>

          {/* Active Coupons List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-300">
              Cupons Promocionais Cadastrados:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cartConfig.coupons.map((c) => (
                <div
                  key={c.code}
                  className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-white bg-white/10 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {c.discountPercent}% OFF
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(c.code)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        c.active
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {c.active ? 'Ativo' : 'Pausado'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(c.code)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Coupon Form */}
          <form
            onSubmit={handleAddCoupon}
            className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-2.5 text-xs"
          >
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Criar Novo Cupom de Desconto
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-neutral-400 mb-1">Código do Cupom</label>
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="Ex: PROMO2026"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Porcentagem de Desconto (%)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-bold text-emerald-400"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#55c21b] text-black font-extrabold rounded-lg cursor-pointer"
            >
              Cadastrar Cupom
            </button>
          </form>

          {/* Extra PIX discount & Guarantee Badge */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Desconto Automático Extra no PIX (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={cartConfig.pixDiscountExtra}
                onChange={(e) => {
                  setCartConfig({
                    ...cartConfig,
                    pixDiscountExtra: Number(e.target.value),
                  });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Texto do Selo de Garantia no Rodapé do Carrinho
              </label>
              <input
                type="text"
                value={cartConfig.guaranteeBadgeText}
                onChange={(e) => {
                  setCartConfig({
                    ...cartConfig,
                    guaranteeBadgeText: e.target.value,
                  });
                  showSaveNotice();
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
