import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  User,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Download,
  ExternalLink,
  ArrowLeft,
  Music,
  ShoppingBag,
  Clock,
  ShieldCheck,
  RefreshCw,
  FolderDown,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { PlaybackPack } from '../types';
import { Order } from '../types/admin';

export const CustomerAreaModal: React.FC = () => {
  const {
    isCustomerAreaOpen,
    setIsCustomerAreaOpen,
    customerUser,
    logoutCustomer,
    pendingWhatsAppPhone,
    setPendingWhatsAppPhone,
    pendingWhatsAppCode,
    sendWhatsAppValidationCode,
    loginCustomerWithWhatsApp,
    loginCustomerDirectWithPhone,
    orders,
    updateOrderStatus,
    setIsAdminMode,
    themeConfig,
  } = useStore();

  // WhatsApp form state & view control
  const [viewMode, setViewMode] = useState<'login' | 'dashboard'>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [whatsappDirectUrl, setWhatsappDirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'downloads' | 'orders'>('downloads');

  // Automatically show dashboard with downloads if customer is authenticated, otherwise show login
  useEffect(() => {
    if (isCustomerAreaOpen) {
      if (customerUser) {
        setViewMode('dashboard');
        setActiveTab('downloads');
      } else {
        setViewMode('login');
      }
      setIsCodeSent(false);
      setCode('');
      setError(null);
      setSuccessInfo(null);
      setWhatsappDirectUrl(null);
      if (pendingWhatsAppPhone) {
        setPhone(formatPhone(pendingWhatsAppPhone));
      }
    }
  }, [isCustomerAreaOpen, customerUser, pendingWhatsAppPhone]);

  if (!isCustomerAreaOpen) return null;

  // Helpers for phone formatting
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (!digits.length) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError(null);
  };

  // Step 1: Send WhatsApp Code
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Por favor digite um número de WhatsApp válido com DDD (ex: 27 99650-9853).');
      return;
    }

    setError(null);
    setLoading(true);

    // Generate code and format WhatsApp dispatch URL synchronously inside user click
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const intlPhone = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits : `55${cleanDigits}`;
    // Exact format required from Image 02:
    const message = `*Código de autenticação* da MD Stúdio Play\n${generatedCode}`;
    const directUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;

    // Automatically trigger WhatsApp in a new tab/native app right from user gesture
    try {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    } catch (popupErr) {
      console.warn('Popup blocked, fallback provided in UI button:', popupErr);
    }

    try {
      const res = await sendWhatsAppValidationCode(phone, generatedCode);
      if (res.success) {
        setIsCodeSent(true);
        setCode(''); // Input starts completely blank: customer receives on WhatsApp and types here
        setWhatsappDirectUrl(res.whatsappUrl || directUrl);
        setSuccessInfo(`Código enviado com sucesso para o WhatsApp ${phone}!`);
      } else {
        setError(res.error || 'Erro ao enviar código para o WhatsApp informado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao solicitar código no WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Validate code & Log In
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginCustomerWithWhatsApp(phone, code);
      if (res.success) {
        setIsCodeSent(false);
        setSuccessInfo('Acesso autorizado! Bem-vindo à sua Área do Cliente.');
        setViewMode('dashboard');
      } else {
        setError(res.error || 'Código incorreto. Verifique os 6 dígitos.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar código.');
    } finally {
      setLoading(false);
    }
  };

  // Clean digits helper
  const cleanDigits = (v: string = '') => v.replace(/\D/g, '');

  // Filter orders for the logged-in customer (matching phone or email)
  const userOrders = customerUser
    ? orders.filter((o) => {
        const orderPhoneDigits = cleanDigits(o.customerPhone);
        const userPhoneDigits = cleanDigits(customerUser.phone);
        if (orderPhoneDigits && userPhoneDigits && orderPhoneDigits === userPhoneDigits) {
          return true;
        }
        if (
          customerUser.email &&
          o.customerEmail?.toLowerCase() === customerUser.email.toLowerCase()
        ) {
          return true;
        }
        return false;
      })
    : [];

  const completedOrders = userOrders.filter(
    (o) => o.status === 'completed' || o.payment_status === 'approved' || o.order_status === 'PAGAMENTO APROVADO'
  );
  const pendingOrders = userOrders.filter(
    (o) =>
      (o.status === 'pending' ||
        o.payment_status === 'pending' ||
        o.payment_status === 'in_process' ||
        o.order_status === 'AGUARDANDO PAGAMENTO' ||
        o.order_status === 'PAGAMENTO EM ANÁLISE') &&
      o.status !== 'completed' &&
      o.payment_status !== 'approved'
  );

  // Extract packs with access granted from completed orders
  const authorizedPacks: { pack: PlaybackPack; order: Order }[] = [];
  const seenPackIds = new Set<string>();

  completedOrders.forEach((order) => {
    if (Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const pack = item.pack || item;
        const packId = pack.id || `pack_${Math.random()}`;
        if (!seenPackIds.has(packId)) {
          seenPackIds.add(packId);
          authorizedPacks.push({
            pack: {
              id: packId,
              title: pack.title || 'Produto Adquirido',
              artist: pack.artist || '',
              genre: pack.genre || 'Playback',
              originalPrice: pack.originalPrice || 57.99,
              discountPrice: pack.discountPrice || 57.99,
              image: pack.image || pack.coverImage || '/md_studio_logo.jpg',
              releaseYear: pack.releaseYear || 2026,
              tracks: Array.isArray(pack.tracks) ? pack.tracks : [],
              postSaleUrl: pack.postSaleUrl || (order.post_sale_urls && order.post_sale_urls[0]),
            },
            order,
          });
        }
      });
    }

    if (authorizedPacks.length === 0 && Array.isArray(order.post_sale_urls) && order.post_sale_urls.length > 0) {
      order.post_sale_urls.forEach((url, idx) => {
        const pseudoId = `postsale_${order.id}_${idx}`;
        if (!seenPackIds.has(pseudoId)) {
          seenPackIds.add(pseudoId);
          authorizedPacks.push({
            pack: {
              id: pseudoId,
              title: (order.items?.[idx] as any)?.pack?.title || (order.items?.[idx] as any)?.title || 'Coletânea Completa',
              artist: '',
              genre: 'Playbacks & Multitracks',
              originalPrice: order.total || 57.99,
              discountPrice: order.total || 57.99,
              image: '/md_studio_logo.jpg',
              releaseYear: 2026,
              tracks: [],
              postSaleUrl: url,
            },
            order,
          });
        }
      });
    }
  });

  const handleSimulatePaymentApproval = (orderId: string) => {
    updateOrderStatus(orderId, 'completed');
    setSuccessInfo('Pagamento confirmado com sucesso! Downloads liberados.');
  };

  const handleDownloadFile = (pack: PlaybackPack) => {
    const fileContent = `MD STUDIO PRODUÇÕES - LICENÇA E LIBERAÇÃO OFICIAL
=============================================================
PRODUTO: ${pack.title}
ARTISTA: ${pack.artist || 'Vários'}
GÊNERO: ${pack.genre}
FORMATO: Multitrack Áudio Masterizado 320kbps + Stems Separadas
CLIENTE: ${customerUser?.name || 'Cliente VIP'}
WHATSAPP DE ACESSO: ${customerUser?.phone || phone}
DATA DE LIBERAÇÃO: ${new Date().toLocaleString()}
STATUS DO PAGAMENTO: CONFIRMADO ✅
=============================================================
FAIXAS INCLUÍDAS:
${pack.tracks.map((t, i) => `${i + 1}. ${t.title} (${t.duration}) - Guia & Playback`).join('\n')}
=============================================================
Acesso permanente aos arquivos multitrack na nuvem autorizado.`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pack.title.replace(/\s+/g, '_')}_Multitracks_320kbps.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07080a]/95 backdrop-blur-md animate-in fade-in duration-200">
      {viewMode === 'login' || !customerUser ? (
        /* =========================================================================
           POPUP DE ENTRADA NA ÁREA DO CLIENTE (Design Idêntico à Imagem Solicitada)
           ========================================================================= */
        <div className="w-full max-w-[420px] bg-[#111215] border border-white/[0.08] rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black relative overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Subtle top ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#38b019]/10 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsCustomerAreaOpen(false)}
            className="absolute top-5 right-5 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top User Icon Badge with glowing border */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#0e210a] border border-[#2b6416] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(45,155,20,0.35)]">
              <User className="w-7 h-7 text-[#4ade1b]" strokeWidth={2.2} />
            </div>
            <h2 className="text-2xl sm:text-[26px] font-black text-white tracking-tight">
              Área do Cliente
            </h2>
            <p className="text-xs text-neutral-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
              Acesso exclusivo para downloads dos seus playbacks e multitracks adquiridos
            </p>
          </div>

          {/* Active session shortcut if customer was already logged in */}
          {customerUser && !isCodeSent && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between text-xs">
              <div className="text-left text-neutral-300">
                <span className="text-neutral-400 block text-[10px]">Sessão ativa conectada:</span>
                <strong className="text-white text-xs">{customerUser.phone || customerUser.email}</strong>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Ver Downloads →
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successInfo && !error && (
            <div className="mb-4 p-3 rounded-xl bg-[#55c21b]/10 border border-[#55c21b]/30 text-[#55c21b] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#55c21b]" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Step 1: Input WhatsApp Number (Exact replica of image) */}
          {!isCodeSent ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2 text-left">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 0 0000-0000"
                  className="w-full px-4 py-3.5 bg-[#0e1014] border-2 border-[#38b019] rounded-xl text-base text-white placeholder-neutral-500 font-medium outline-none focus:border-[#4ee328] transition-all tracking-wide"
                />
              </div>

              {/* Action Button: Send Code */}
              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center shadow-md ${
                  phone.replace(/\D/g, '').length >= 10
                    ? 'bg-[#386b16] hover:bg-[#46841c] text-[#d6f7a8] hover:text-white cursor-pointer active:scale-[0.99]'
                    : 'bg-[#253e14] text-[#61823d] cursor-not-allowed opacity-90'
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#d6f7a8]" />
                ) : (
                  <MessageCircle className="w-4 h-4 mr-2" />
                )}
                <span>Enviar Código para o WhatsApp</span>
              </button>
            </form>
          ) : (
            /* Step 2: Validate 6-digit Code received on WhatsApp */
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Código de Validação de 6 Dígitos
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCodeSent(false)}
                    className="text-[11px] text-[#4ade1b] hover:underline cursor-pointer"
                  >
                    Alterar número
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="w-full text-center py-3 bg-[#0e1014] border-2 border-[#38b019] rounded-xl text-2xl font-black text-white outline-none focus:border-[#4ee328] transition-colors tracking-[0.4em]"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 text-center">
                  Digite os 6 dígitos recebidos no WhatsApp <strong className="text-white">{phone}</strong>
                </p>
              </div>

              {/* Action Button: Verify & Enter */}
              <button
                type="submit"
                disabled={loading || code.trim().length < 6}
                className="w-full py-3.5 rounded-xl bg-[#386b16] hover:bg-[#46841c] text-[#d6f7a8] hover:text-white font-extrabold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#d6f7a8]" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Confirmar e Entrar na Área do Cliente</span>
              </button>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={() => handleSendCode()}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Não recebeu? <span className="text-[#4ade1b] underline">Reenviar código para o WhatsApp</span>
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.08] my-6" />

          {/* Footer Back Link & Admin Portal Switch */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCustomerAreaOpen(false)}
              className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a Loja Virtual</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCustomerAreaOpen(false);
                setIsAdminMode(true);
              }}
              className="text-[11px] text-neutral-500 hover:text-neutral-400 transition-colors cursor-pointer"
            >
              Acesso Restrito do Administrador
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
           PAINEL DO CLIENTE AUTENTICADO (Downloads Liberados após Confirmação)
           ========================================================================= */
        <div className="w-full max-w-3xl bg-[#101216] border border-white/10 rounded-3xl shadow-2xl shadow-black relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#13161c]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#55c21b]/15 border border-[#55c21b]/30 text-[#55c21b] flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <circle cx="12" cy="7.5" r="4.2" />
                  <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">Área do Cliente</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#55c21b]/20 text-[#55c21b] border border-[#55c21b]/30">
                    Acesso Conectado
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  WhatsApp: <strong className="text-white">{customerUser.phone || phone}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  logoutCustomer();
                  setViewMode('login');
                  setPhone('');
                }}
                title="Sair da Área do Cliente"
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Sair</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerAreaOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 sm:px-6 pt-4 border-b border-white/5 flex items-center gap-4 bg-[#0d0e12]">
            <button
              type="button"
              onClick={() => setActiveTab('downloads')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'downloads'
                  ? 'border-[#55c21b] text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FolderDown className="w-4 h-4 text-[#55c21b]" />
              <span>Meus Downloads & Playbacks ({authorizedPacks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-[#55c21b] text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-[#55c21b]" />
              <span>Histórico de Pedidos ({userOrders.length})</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {activeTab === 'downloads' ? (
              <div>
                {/* Status Notice */}
                {authorizedPacks.length > 0 ? (
                  <div className="mb-5 p-3.5 rounded-2xl bg-[#55c21b]/10 border border-[#55c21b]/30 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#55c21b] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        Pagamento Aprovado · Acesso Vitalício Liberado!
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Faça o download de todos os seus playbacks masterizados em 320kbps e multitracks com stems individuais.
                      </p>
                    </div>
                  </div>
                ) : pendingOrders.length > 0 ? (
                  <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-400">
                      <Clock className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Pagamento Pendente · Aguardando Confirmação do Mercado Pago
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Seu pedido foi registrado! Assim que o pagamento via PIX for confirmado pelo Mercado Pago, seus downloads serão liberados instantaneamente nesta tela.
                    </p>
                    <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Este produto ainda não está disponível para download.</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">
                      Nenhum playback adquirido ainda
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
                      Realize sua compra na loja informando este WhatsApp para que seus downloads fiquem disponíveis aqui após a confirmação.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCustomerAreaOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#55c21b] hover:bg-[#48a816] text-black font-extrabold text-xs transition-all cursor-pointer"
                    >
                      Explorar Catálogo de Playbacks
                    </button>
                  </div>
                )}

                {/* List of Products / Packs with Instant Downloads (Exact match to uploaded design) */}
                <div className="space-y-3 pt-1">
                  <div className="text-xs sm:text-sm font-black text-[#00d06c] uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00d06c]" />
                      <span>MEUS PRODUTOS</span>
                    </div>
                    {authorizedPacks.length > 0 && (
                      <span className="text-[10px] font-bold text-neutral-400">
                        {authorizedPacks.length} {authorizedPacks.length === 1 ? 'PRODUTO LIBERADO' : 'PRODUTOS LIBERADOS'}
                      </span>
                    )}
                  </div>

                  {pendingOrders.length > 0 && authorizedPacks.length === 0 && (
                    <div className="space-y-2">
                      {pendingOrders.map((ord) => (
                        <div key={ord.id} className="p-4 rounded-2xl bg-[#0e1014] border border-amber-500/20 text-left space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono text-neutral-400">{ord.orderNumber}</span>
                            <span className="text-[10px] font-bold text-amber-400 uppercase">AGUARDANDO PAGAMENTO</span>
                          </div>
                          <p className="text-xs text-neutral-400 italic">Este produto ainda não está disponível para download.</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {authorizedPacks.map(({ pack, order }) => (
                      <div
                        key={pack.id}
                        className="p-4 sm:p-5 rounded-2xl bg-[#0e1014] border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-xl"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>✓ PAGAMENTO APROVADO</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                              <span>✓ PRODUTO LIBERADO</span>
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-white truncate">
                            {pack.title}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-1">
                            {pack.artist ? `${pack.artist} · ` : ''}Multitrack + Stems em 320kbps (Acesso Vitalício)
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {pack.postSaleUrl ? (
                            <a
                              href={pack.postSaleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 rounded-2xl bg-[#00d06c] hover:bg-[#00b85f] text-black font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                            >
                              <Download className="w-4 h-4 text-black" />
                              <span>BAIXAR PRODUTO</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(pack)}
                              className="px-5 py-2.5 rounded-2xl bg-[#00d06c] hover:bg-[#00b85f] text-black font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                            >
                              <Download className="w-4 h-4 text-black" />
                              <span>BAIXAR PRODUTO</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Tab: Histórico de Pedidos */
              <div className="space-y-3">
                {userOrders.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-8">
                    Nenhum pedido registrado para este número.
                  </p>
                ) : (
                  userOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ord.status === 'completed' || ord.payment_status === 'approved' || ord.order_status === 'PAGAMENTO APROVADO'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : ord.status === 'cancelled' || ord.payment_status === 'rejected' || ord.order_status === 'PAGAMENTO REJEITADO'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {ord.status === 'completed' || ord.payment_status === 'approved' || ord.order_status === 'PAGAMENTO APROVADO'
                              ? 'PAGO'
                              : ord.status === 'cancelled' || ord.payment_status === 'rejected' || ord.order_status === 'PAGAMENTO REJEITADO'
                              ? 'PAGAMENTO NÃO APROVADO'
                              : 'AGUARDANDO PAGAMENTO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {ord.date} · {ord.items.length} produto(s) · {ord.paymentMethod.toUpperCase()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-white">
                          R$ {ord.total.toFixed(2).replace('.', ',')}
                        </span>
                        {ord.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSimulatePaymentApproval(ord.id)}
                            className="block text-[11px] text-[#55c21b] font-bold hover:underline mt-1 cursor-pointer"
                          >
                            Liberar Pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-white/5 bg-[#0e1014] flex items-center justify-between text-xs text-neutral-400">
            <span>MD Stúdio Playbacks · Todos os direitos reservados</span>
            <button
              type="button"
              onClick={() => setIsCustomerAreaOpen(false)}
              className="text-white hover:text-[#55c21b] font-bold transition-colors cursor-pointer"
            >
              Continuar Navegando
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
