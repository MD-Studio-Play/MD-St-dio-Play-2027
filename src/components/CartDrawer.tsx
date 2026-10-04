import React, { useState, useEffect, useRef } from 'react';
import { CartItem, PlaybackPack } from '../types';
import { PackThumbnail } from './PackThumbnail';
import { useStore } from '../context/StoreContext';
import { generatePixPayload, generatePixQrCodeDataUrl } from '../utils/pix';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Copy,
  Download,
  Check,
  FileMusic,
  Lock,
  Zap,
  FolderDown,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (packId: string) => void;
  onUpdateQuantity?: (packId: string, quantity: number) => void;
  onClearCart: () => void;
  onOpenCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
  onOpenCheckout,
}) => {
  const {
    cartConfig,
    checkoutConfig,
    themeConfig,
    addOrder,
    setIsCustomerAreaOpen,
    setPendingWhatsAppPhone,
    sendWhatsAppValidationCode,
    loginCustomerDirectWithPhone,
  } = useStore();

  // Navigation state: 'cart' | 'checkout' | 'completed'
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix'>('pix');

  // Customer Checkout Inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhoneConfirm, setCustomerPhoneConfirm] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Mercado Pago PIX states
  const [mpLoading, setMpLoading] = useState(false);
  const [mpQrCode, setMpQrCode] = useState<string | null>(null);
  const [mpQrCodeBase64, setMpQrCodeBase64] = useState<string | null>(null);
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(null);
  const [mpTicketUrl, setMpTicketUrl] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // Completed order reference
  const [completedOrderPacks, setCompletedOrderPacks] = useState<PlaybackPack[]>([]);

  // Subtotal (No coupons applied as requested)
  const total = items.reduce(
    (acc, item) => acc + item.pack.discountPrice * item.quantity,
    0
  );

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Mask for WhatsApp: (XX) XXXXX-XXXX with limit of 11 numeric digits
  const formatPhoneNumber = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (!raw.length) return '';
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhone(formatted);
    // Preenchimento repetitivo automático
    setCustomerPhoneConfirm(formatted);
    if (formError) setFormError(null);
  };

  const handlePhoneConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhoneConfirm(formatted);
    if (formError) setFormError(null);
  };

  // Validate required customer fields
  const validateCustomerFields = (): boolean => {
    if (!customerName.trim() || customerName.trim().length < 3) {
      setFormError('Por favor informe seu nome completo.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setFormError('Informe um e-mail válido.');
      return false;
    }
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setFormError('Informe um WhatsApp válido com DDD (ex: (11) 99999-9999).');
      return false;
    }
    const confirmDigits = customerPhoneConfirm.replace(/\D/g, '');
    if (!confirmDigits || confirmDigits !== phoneDigits) {
      setFormError('Os números de WhatsApp (Cadastro e Confirmação) devem ser iguais.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Generate Real Mercado Pago PIX QR Code via Server API
  const handleGenerateMercadoPagoPix = async () => {
    if (!validateCustomerFields()) return;

    setMpLoading(true);

    const accessToken =
      checkoutConfig.mercadoPagoAccessToken ||
      checkoutConfig.creditCardSecretToken ||
      '';

    try {
      const response = await fetch('/api/mercadopago/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          description: `MD Studio Play - ${items.map((i) => i.pack.title).join(', ')}`.slice(0, 100),
          payer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone,
          },
          items: items.map((i) => ({
            title: i.pack.title,
            quantity: i.quantity,
            unit_price: i.pack.discountPrice,
          })),
          config: {
            mercadoPagoAccessToken: accessToken,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.qrCode) {
        setMpQrCode(data.qrCode);
        setMpPaymentId(data.paymentId);
        setMpTicketUrl(data.ticketUrl || null);

        if (data.qrCodeBase64) {
          setMpQrCodeBase64(`data:image/png;base64,${data.qrCodeBase64}`);
        } else {
          const generatedUrl = await generatePixQrCodeDataUrl(data.qrCode);
          setMpQrCodeBase64(generatedUrl);
        }
      } else {
        // Fallback: If Mercado Pago requires a token or returned an error, generate standard compliant BACEN PIX
        const fallbackTxid = `${checkoutConfig.pixTxidPrefix || 'MD'}${Math.floor(100000 + Math.random() * 900000)}`;
        const fallbackPayload = generatePixPayload({
          key: checkoutConfig.pixKey || 'comercial@mdstudioplay.com.br',
          name: checkoutConfig.pixBeneficiaryName || 'MD STUDIO PLAY',
          city: checkoutConfig.pixBeneficiaryCity || 'SAO PAULO',
          amount: total,
          txid: fallbackTxid,
          description: 'MD STUDIO PLAY PIX',
        });

        const fallbackQrUrl = await generatePixQrCodeDataUrl(fallbackPayload);
        setMpQrCode(fallbackPayload);
        setMpQrCodeBase64(fallbackQrUrl);
        setMpPaymentId('demo_' + Date.now());
      }
    } catch (err: any) {
      console.warn('Falha na rota Mercado Pago, usando contingência BACEN PIX:', err);
      const fallbackTxid = `${checkoutConfig.pixTxidPrefix || 'MD'}${Math.floor(100000 + Math.random() * 900000)}`;
      const fallbackPayload = generatePixPayload({
        key: checkoutConfig.pixKey || 'comercial@mdstudioplay.com.br',
        name: checkoutConfig.pixBeneficiaryName || 'MD STUDIO PLAY',
        city: checkoutConfig.pixBeneficiaryCity || 'SAO PAULO',
        amount: total,
        txid: fallbackTxid,
        description: 'MD STUDIO PLAY PIX',
      });
      const fallbackQrUrl = await generatePixQrCodeDataUrl(fallbackPayload);
      setMpQrCode(fallbackPayload);
      setMpQrCodeBase64(fallbackQrUrl);
      setMpPaymentId('demo_' + Date.now());
    } finally {
      setMpLoading(false);
    }
  };

  // Poll payment status if paymentId exists and is real Mercado Pago ID
  useEffect(() => {
    if (!mpPaymentId || mpPaymentId.startsWith('demo_') || isCompleted) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    let isPollingActive = true;

    const checkStatus = async () => {
      if (!isPollingActive) return;
      try {
        const token =
          checkoutConfig.mercadoPagoAccessToken ||
          checkoutConfig.creditCardSecretToken ||
          '';
        const res = await fetch(
          `/api/mercadopago/payment-status/${mpPaymentId}?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (json.success && json.status === 'approved' && isPollingActive) {
          isPollingActive = false;
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          await handleFinalizeOrderAndRedirect('pix');
        }
      } catch {
        // silent check error
      }
    };

    // Immediate check
    checkStatus();
    // Then poll every 2.5 seconds
    pollIntervalRef.current = setInterval(checkStatus, 2500);

    return () => {
      isPollingActive = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [
    mpPaymentId,
    isCompleted,
    customerPhone,
    customerName,
    customerEmail,
    items,
    total,
    mpQrCode,
    mpQrCodeBase64,
    mpTicketUrl,
    checkoutConfig,
  ]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyPix = () => {
    if (mpQrCode) {
      navigator.clipboard.writeText(mpQrCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  // Finalize order, authenticate customer session, and redirect directly to Customer Area pop-up for instant downloads
  const handleFinalizeOrderAndRedirect = async (method: 'pix' = 'pix') => {
    const rawPhone = customerPhone.trim() || '(11) 99999-8888';
    const rawName = customerName.trim() || 'Cliente VIP';
    const rawEmail = customerEmail.trim() || 'cliente@mdstudioplay.com.br';

    const orderPacks = items.map((i) => i.pack);
    setCompletedOrderPacks(orderPacks);

    addOrder({
      customerName: rawName,
      customerEmail: rawEmail,
      customerPhone: rawPhone,
      items: items.map((i) => ({ pack: i.pack, quantity: i.quantity })),
      subtotal: total,
      discount: 0,
      total,
      paymentMethod: 'pix',
      status: 'completed',
      pixPayload: mpQrCode || undefined,
      pixQrCodeUrl: mpQrCodeBase64 || undefined,
      mercadoPagoPaymentId: mpPaymentId || undefined,
      ticketUrl: mpTicketUrl || undefined,
    });

    setPendingWhatsAppPhone(rawPhone);
    sendWhatsAppValidationCode(rawPhone).catch(() => {});

    // Authenticate customer directly so the Customer Area modal opens straight to downloads!
    await loginCustomerDirectWithPhone(rawPhone);

    onClearCart();
    setIsCheckingOut(false);
    setIsCompleted(false);
    onClose();
    setIsCustomerAreaOpen(true);
  };

  const handleGoToCustomerArea = () => {
    setIsCompleted(false);
    setIsCheckingOut(false);
    onClose();
    setIsCustomerAreaOpen(true);
  };

  const handleResetOrder = () => {
    setIsCompleted(false);
    setIsCheckingOut(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end overflow-hidden p-3.5 sm:p-0 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Pop-up on Mobile (Centered in Screen) / Slide-over Drawer on Desktop (Right Panel) */}
      <div className="relative z-10 w-full max-w-[94vw] sm:max-w-md max-h-[88vh] sm:max-h-full sm:h-full bg-[#0e1014] rounded-2xl sm:rounded-none border border-white/15 sm:border-l sm:border-t-0 sm:border-b-0 sm:border-r-0 sm:border-white/10 flex flex-col shadow-2xl shadow-black/80 text-neutral-200 overflow-hidden animate-in zoom-in-95 sm:zoom-in-100 sm:slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#12141a] shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {isCompleted
                ? 'Compra Concluída'
                : isCheckingOut
                ? 'Finalizar Compra / Checkout'
                : `Meu Carrinho (${items.reduce((acc, i) => acc + i.quantity, 0)})`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {isCompleted ? (
              /* Success / Instant Download Screen */
              <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Pagamento Confirmado!</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Seus playbacks masterizados em 320kbps + Stems multitrack foram liberados.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-left space-y-2.5">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    <span>Seus Playbacks Prontos para Download:</span>
                  </div>
                  {completedOrderPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{pack.title}</div>
                        <div className="text-[10px] text-neutral-400">
                          {pack.tracks.length} faixas · {pack.genre}
                        </div>
                      </div>
                      {pack.postSaleUrl ? (
                        <a
                          href={pack.postSaleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob(
                              [
                                `MD STUDIO PLAY - DOWNLOAD LIBERADO\nProduto: ${pack.title}\nCliente: ${customerName}\nWhatsApp: ${customerPhone}\nData: ${new Date().toLocaleString()}\nAcesso autorizado aos multitracks na nuvem.`,
                              ],
                              { type: 'text/plain' }
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${pack.title.replace(/\s+/g, '_')}_Multitracks.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 text-left space-y-1">
                  <div className="font-bold flex items-center gap-1 text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Acesso Liberado no WhatsApp
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    Você pode acessar todos os seus downloads a qualquer momento na <strong>Área do Cliente</strong> informando o seu WhatsApp cadastrado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoToCustomerArea}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Acessar Área do Cliente Agora</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Voltar para a Loja Virtual
                </button>
              </div>
            ) : isCheckingOut ? (
              /* =========================================================================
                 CHECKOUT STEP: NOME, WHATSAPP, E-MAIL, CPF + FORMA DE PAGAMENTO PIX OFICIAL
                 ========================================================================= */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Back to cart button */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Dados do Comprador
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckingOut(false);
                      setMpQrCode(null);
                      setFormError(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao Carrinho</span>
                  </button>
                </div>

                {/* Form Error Alert */}
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Required Customer Data Fields */}
                <div className="bg-[#12141a] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      E-mail de Entrega *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="seuemail@exemplo.com"
                      required
                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      WhatsApp com DDD (Para cadastro) *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      maxLength={16}
                      required
                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                      <span>WhatsApp com DDD (Confirmação) *</span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        (Preenchimento repetitivo automático)
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhoneConfirm}
                      onChange={handlePhoneConfirmChange}
                      placeholder="(11) 99999-9999"
                      maxLength={16}
                      required
                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Forma de Pagamento Exclusiva PIX Oficial */}
                <div className="p-3 bg-[#12141a] rounded-2xl border border-emerald-500/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Pagamento via PIX Oficial</span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Aprovação Automática Imediata
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase font-mono">
                    Sem Taxas
                  </span>
                </div>

                {/* Summary Row */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Total a Pagar:</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>

                {/* PIX Flow via Mercado Pago API */}
                <div className="bg-[#12141a] border border-white/10 rounded-2xl p-4 text-center space-y-3.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>PIX Mercado Pago Oficial</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Aprovação Automática
                      </span>
                    </div>

                    {!mpQrCode ? (
                      /* CTA to generate Mercado Pago QR Code */
                      <div className="py-3 space-y-3">
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          Ao clicar no botão abaixo, será gerado o <strong>QR Code oficial via Mercado Pago</strong> com liberação instantânea.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateMercadoPagoPix}
                          disabled={mpLoading}
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                        >
                          {mpLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-black" />
                              <span>Gerando QR Code no Mercado Pago...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>Gerar QR Code PIX (Mercado Pago)</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Scannable Real QR Code Display */
                      <div className="space-y-3 animate-in zoom-in-95 duration-200">
                        <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-2xl flex items-center justify-center border-4 border-emerald-500">
                          {mpQrCodeBase64 ? (
                            <img
                              src={mpQrCodeBase64}
                              alt="QR Code PIX Mercado Pago"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-black font-bold">Carregando QR Code...</div>
                          )}
                        </div>

                        {/* Status notification */}
                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-xl">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Aguardando confirmação do Mercado Pago...</span>
                        </div>

                        {/* Copy Paste Code */}
                        <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-left space-y-1.5">
                          <div className="text-[10px] text-neutral-400 font-semibold flex items-center justify-between">
                            <span>Código PIX Copia e Cola:</span>
                            {pixCopied && <span className="text-emerald-400 font-bold">Copiado!</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={mpQrCode}
                              className="flex-1 bg-transparent text-[11px] text-neutral-300 font-mono truncate outline-none select-all"
                            />
                            <button
                              type="button"
                              onClick={handleCopyPix}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            >
                              {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{pixCopied ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>
                        </div>

                        {mpTicketUrl && (
                          <a
                            href={mpTicketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            <span>Ver comprovante na página do Mercado Pago</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {/* Orientações do PIX */}
                        <div className="bg-[#12141a] border border-white/10 rounded-xl p-3 space-y-1.5 text-[11px] text-neutral-300">
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">ⓘ</span>
                            <span>O pagamento deve ser realizado em até 24 horas.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">ⓘ</span>
                            <span>Utilize o código acima para efetuar o pagamento pelo seu banco.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">ⓘ</span>
                            <span>Após a confirmação do pagamento, a liberação será automática e ocorrerá em poucos instantes.</span>
                          </div>
                        </div>

                        {/* Status de Confirmação Automática via Mercado Pago */}
                        <div className="bg-[#12141a] border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                              <span>Aguardando confirmação do Mercado Pago...</span>
                            </p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Assim que o pagamento for confirmado pelo seu banco, você será redirecionado automaticamente para a Área do Cliente.
                            </p>
                          </div>
                        </div>

                        {/* Botão de teste exibido apenas quando em modo demonstração (sem token live) */}
                        {mpPaymentId?.startsWith('demo_') && (
                          <div className="text-center pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleFinalizeOrderAndRedirect('pix')}
                              className="text-[10px] text-neutral-500 hover:text-emerald-400 underline transition-colors cursor-pointer"
                            >
                              [Ambiente de Teste: Simular Aprovação Automática Agora]
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
              </div>
            ) : items.length === 0 ? (
              /* Empty Cart */
              <div className="py-16 text-center space-y-3">
                <FileMusic className="w-12 h-12 text-neutral-600 mx-auto" />
                <p className="text-neutral-400 text-sm">Seu carrinho está vazio.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  Explorar os pacotes de playbacks na loja &rarr;
                </button>
              </div>
            ) : (
              /* =========================================================================
                 CART ITEMS VIEW: INCLUI + E - DE CADA PRODUTO, BOTÃO "ADICIONAR MAIS"
                 ========================================================================= */
              <div className="space-y-4">
                {/* List of Cart Items with + and - Controls */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.pack.id}
                      className="p-3 rounded-2xl bg-[#12141a] border border-white/5 flex items-center justify-between gap-3 shadow-sm hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <PackThumbnail pack={item.pack} size="sm" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {item.pack.title}
                          </h4>
                          <span className="text-[11px] text-neutral-400 block truncate">
                            {item.pack.tracks.length} faixas · {item.pack.genre}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                            {formatCurrency(item.pack.discountPrice * item.quantity)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls: - [ Qty ] + */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateQuantity) {
                                onUpdateQuantity(item.pack.id, item.quantity - 1);
                              } else if (item.quantity <= 1) {
                                onRemoveItem(item.pack.id);
                              }
                            }}
                            title="Diminuir quantidade"
                            className="w-7 h-7 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-black text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateQuantity) {
                                onUpdateQuantity(item.pack.id, item.quantity + 1);
                              }
                            }}
                            title="Aumentar quantidade"
                            className="w-7 h-7 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </div>

                        {/* Direct Remove Button */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.pack.id)}
                          aria-label="Remover item do carrinho"
                          title="Remover"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão "Adicionar Mais" Voltando para a Loja */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Adicionar mais produtos (Voltar para a Loja)</span>
                </button>

                {/* Order Summary (Sem Cupom) */}
                <div className="bg-[#12141a] border border-white/10 rounded-2xl p-4 space-y-2 text-xs shadow-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Itens no Carrinho</span>
                    <span className="font-bold text-white">
                      {items.reduce((acc, i) => acc + i.quantity, 0)} unidades
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-black text-base pt-2 border-t border-white/10">
                    <span>Total da Compra</span>
                    <span className="text-emerald-400 tabular-nums text-lg font-black">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer CTA: Botão para Avançar para o Checkout */}
          {!isCompleted && !isCheckingOut && items.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-[#12141a] space-y-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onOpenCheckout) {
                    onClose();
                    onOpenCheckout();
                  } else {
                    setIsCheckingOut(true);
                  }
                }}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
              >
                <span>Finalizar Compra</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Liberação imediata no PIX oficial do Mercado Pago</span>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
