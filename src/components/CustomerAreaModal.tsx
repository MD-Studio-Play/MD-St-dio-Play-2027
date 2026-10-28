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
  Copy,
  Check,
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
  const [activeGeneratedCode, setActiveGeneratedCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [whatsappDirectUrl, setWhatsappDirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'downloads' | 'orders'>('downloads');

  // Countdown timer for resending code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  // Step 1: Send WhatsApp Code (Automatic Arrival)
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Por favor digite um número de WhatsApp válido com DDD (ex: 27 99650-9853).');
      return;
    }

    setError(null);
    setLoading(true);

    // 6-digit authentication code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveGeneratedCode(generatedCode);

    try {
      const res = await sendWhatsAppValidationCode(phone, generatedCode);
      if (res.success) {
        setIsCodeSent(true);
        setCode(''); // Input starts completely blank: customer receives on WhatsApp and types/pastes here
        setCountdown(60);
        setWhatsappDirectUrl(res.whatsappUrl || null);
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
              {/* WhatsApp Incoming Authentication Message Preview (Identical to Image d5f98102) */}
              <div className="p-3.5 bg-[#1f2c34] border border-[#2a3942] rounded-2xl shadow-xl text-left relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold mb-1">
                  <span className="text-white text-[13px] font-bold tracking-tight">
                    Código de autenticação MD Studio Play
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">09:15</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-sky-400 tracking-widest text-center py-2 font-mono select-all">
                  {activeGeneratedCode || pendingWhatsAppCode || '665512'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const c = activeGeneratedCode || pendingWhatsAppCode || '665512';
                    try {
                      navigator.clipboard.writeText(c);
                    } catch {}
                    setCode(c);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2500);
                  }}
                  className="w-full mt-2 py-2.5 px-3 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-[#25d366]/40 text-[#25d366] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-[#25d366]" />
                      <span>Código Copiado para o Campo!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#25d366]" />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Digite o Código de 6 Dígitos
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
                  Código enviado para o WhatsApp <strong className="text-white">{phone}</strong>
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
                {countdown > 0 ? (
                  <span className="text-xs text-neutral-400">
                    Reenviar código em <strong className="text-amber-400 font-mono">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Não recebeu? <span className="text-[#4ade1b] underline font-bold">Reenviar código para o WhatsApp</span>
                  </button>
                )}
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
              Acesso do Administrador
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
                        Pedido Registrado · Aguardando Liberação
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Seu pedido foi registrado! Assim que o atendimento confirmar o envio, seus downloads ficarão disponíveis diretamente nesta tela.
                    </p>
                    <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Este produto ainda não está disponível para download.</span>
                    </div>
                  </div>
                ) : (
                  /* Demonstração / Preview padrão caso o cliente ainda não tenha compras aprovadas */
                  <div className="space-y-4 pt-1">
                    {pendingOrders.length > 0 && (
                      <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Pedido Registrado · Aguardando Confirmação
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSimulatePaymentApproval(pendingOrders[0].id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
                          >
                            Simular Liberação de Compra
                          </button>
                        </div>
                        <p className="text-xs text-neutral-300">
                          Seu pedido foi registrado no sistema. Assim que for confirmado, seus arquivos ficam liberados para download no card abaixo.
                        </p>
                      </div>
                    )}

                    {/* Card de Produto Liberado com Design Exato da Imagem (Piseirão 2026) */}
                    <div className="w-full bg-[#0d0e12] border-2 border-red-600/70 hover:border-red-500 rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-7 shadow-2xl relative overflow-hidden transition-all group">
                      {/* Imagem Circular à Esquerda com Borda */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-xl overflow-hidden shrink-0 bg-black flex items-center justify-center relative">
                        <img
                          src="/pack_piseiro_forro_1790256479941.jpg"
                          alt="Piseirão 2026"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/md_studio_logo.jpg';
                          }}
                        />
                      </div>

                      {/* Conteúdo Central/Direita: Título + Texto + Botão Verde DOWNLOAD */}
                      <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left justify-center space-y-2.5 w-full">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                          Piseirão 2026
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                          Ao clicar no botão a baixo, será direcionado para a página de download
                        </p>

                        <a
                          href="https://drive.google.com/drive/folders/1WGq3oiftXvoRbqABLY0KjPbH3pcBEiXw?usp=drive_link"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full max-w-md mt-1 py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-base sm:text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-900/40 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                        >
                          <Download className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.8]" />
                          <span className="tracking-wide">DOWNLOAD de Arquivos</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista Oficial dos Produtos Comprados e Liberados */}
                {authorizedPacks.length > 0 && (
                  <div className="space-y-4 pt-3">
                    <div className="text-xs sm:text-sm font-black text-[#00d06c] uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#00d06c]" />
                        <span>SEUS PRODUTOS ADQUIRIDOS</span>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400">
                        {authorizedPacks.length} {authorizedPacks.length === 1 ? 'PRODUTO DISPONÍVEL' : 'PRODUTOS DISPONÍVEIS'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {authorizedPacks.map(({ pack, order }) => (
                        <div
                          key={pack.id}
                          className="w-full bg-[#0d0e12] border-2 border-red-600/70 hover:border-red-500 rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-7 shadow-2xl relative overflow-hidden transition-all group"
                        >
                          {/* Imagem Circular com Borda */}
                          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-xl overflow-hidden shrink-0 bg-black flex items-center justify-center relative">
                            <img
                              src={pack.image || '/pack_piseiro_forro_1790256479941.jpg'}
                              alt={pack.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/md_studio_logo.jpg';
                              }}
                            />
                          </div>

                          {/* Título + Informação + Botão Grande Verde DOWNLOAD */}
                          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left justify-center space-y-2.5 w-full">
                            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                              {pack.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                              Ao clicar no botão a baixo, será direcionado para a página de download
                            </p>

                            {pack.postSaleUrl ? (
                              <a
                                href={pack.postSaleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full max-w-md mt-1 py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-base sm:text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-900/40 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                              >
                                <Download className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.8]" />
                                <span className="tracking-wide">DOWNLOAD de Arquivos</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(pack)}
                                className="w-full max-w-md mt-1 py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-base sm:text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-900/40 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                              >
                                <Download className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.8]" />
                                <span className="tracking-wide">DOWNLOAD de Arquivos</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
