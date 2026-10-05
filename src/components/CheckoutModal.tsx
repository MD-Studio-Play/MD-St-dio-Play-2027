import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { PlaybackPack, CartItem } from '../types';
import { generatePixPayload, generatePixQrCodeDataUrl } from '../utils/pix';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Lock,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Info,
  Zap,
} from 'lucide-react';

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onClearCart: () => void;
  initialView?: 'checkout' | 'success' | 'pending' | 'error';
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onClearCart,
  initialView = 'checkout',
}) => {
  const {
    checkoutConfig,
    themeConfig,
    addOrder,
    setIsCustomerAreaOpen,
    loginCustomerDirectWithPhone,
    sendWhatsAppValidationCode,
    setPendingWhatsAppPhone,
  } = useStore();

  // Primary view state: 'checkout' | 'pix_display' | 'success' | 'pending' | 'error' | 'verifying'
  const [viewState, setViewState] = useState<'checkout' | 'pix_display' | 'success' | 'pending' | 'error' | 'verifying'>(
    initialView === 'success'
      ? 'verifying'
      : initialView === 'pending'
      ? 'pending'
      : initialView === 'error'
      ? 'error'
      : 'checkout'
  );

  // Payment Method: PIX Exclusivo
  const [paymentMethod, setPaymentMethod] = useState<'pix'>('pix');

  // Customer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhoneConfirm, setCustomerPhoneConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'refused' | 'communication'>('refused');

  // Processing & Verification States
  const [buttonState, setButtonState] = useState<'idle' | 'processing' | 'waiting_confirmation' | 'approved'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // PIX State
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixTicketUrl, setPixTicketUrl] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(600); // 10 minutes

  // Completed Order Metadata
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    paymentMethod: string;
    date: string;
    items: any[];
    postSaleUrls: string[];
    ticketUrl?: string;
  } | null>(null);

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Clean URL parameters and hash to prevent persistent error/status locks
  const cleanUrlParams = () => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      const paramsToRemove = [
        'status',
        'collection_status',
        'payment_id',
        'collection_id',
        'external_reference',
        'preference_id',
        'payment_type',
        'merchant_order_id',
        'merchant_account_id',
        'processing_mode',
        'site_id',
      ];
      paramsToRemove.forEach((p) => {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      });
      if (url.hash.includes('erro') || url.hash.includes('sucesso') || url.hash.includes('pendente')) {
        url.hash = '';
        changed = true;
      }
      let targetPath = url.pathname;
      if (targetPath.includes('/pagamento/')) {
        targetPath = '/';
        changed = true;
      }
      if (changed) {
        window.history.replaceState(null, '', targetPath + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
      }
    } catch {}
  };

  // Check URL parameters when returning from Mercado Pago Checkout Pro or direct payment routes
  useEffect(() => {
    if (!isOpen) {
      setViewState('checkout');
      setFormError(null);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id') || urlParams.get('collection_id');
    const extRef = urlParams.get('external_reference');
    const statusParam = urlParams.get('status') || urlParams.get('collection_status');
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    const isSuccessRoute = path.includes('/pagamento/sucesso') || hash.includes('sucesso') || statusParam === 'approved';
    const isPendingRoute = path.includes('/pagamento/pendente') || hash.includes('pendente') || statusParam === 'pending';
    const isErrorRoute = path.includes('/pagamento/erro') || hash.includes('erro') || statusParam === 'rejected' || statusParam === 'failure';
    const isCancelRoute = path.includes('/pagamento/cancelado') || statusParam === 'null';

    if (isSuccessRoute) {
      setViewState('verifying');
      verifyPaymentOnBackend(paymentId, extRef);
    } else if (isPendingRoute) {
      setViewState('pending');
      if (paymentId || extRef) {
        verifyPaymentOnBackend(paymentId, extRef);
      }
    } else if (isErrorRoute) {
      setErrorType('refused');
      setFormError('A operadora ou o Mercado Pago não autorizou a transação.');
      setViewState('error');
    } else if (isCancelRoute) {
      setViewState('checkout');
      setFormError('Pagamento cancelado no Mercado Pago. Você pode tentar novamente quando desejar.');
      cleanUrlParams();
    } else if (initialView === 'success') {
      setViewState('verifying');
      verifyPaymentOnBackend(paymentId, extRef);
    } else if (initialView === 'pending') {
      setViewState('pending');
    } else if (initialView === 'error') {
      setErrorType('refused');
      setViewState('error');
    } else {
      setViewState('checkout');
    }
  }, [isOpen, initialView]);

  const verifyPaymentOnBackend = async (paymentId: string | null, externalReference: string | null) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/mercadopago/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, externalReference }),
      });
      const data = await res.json();

      if (data.verified && data.order) {
        setCompletedOrder({
          orderId: data.order.id || data.externalReference || externalReference || '#ORD-CONFIRMADO',
          total: data.amount || data.order.total || totalAmount,
          paymentMethod: data.order.paymentMethod || 'PIX (Mercado Pago)',
          date: new Date().toLocaleDateString('pt-BR'),
          items: data.order.items || items.map((i) => i.pack),
          postSaleUrls: data.order.post_sale_urls || [],
        });

        // Register in local StoreContext
        addOrder({
          ...data.order,
          status: 'completed',
          payment_status: 'approved',
          order_status: 'PAGAMENTO APROVADO',
        });

        if (data.order.customerPhone) {
          setPendingWhatsAppPhone(data.order.customerPhone);
          loginCustomerDirectWithPhone(data.order.customerPhone).catch(() => {});
        }

        try {
          onClearCart();
        } catch {}

        cleanUrlParams();
        setViewState('success');
      } else if (data.status === 'in_process' || data.status === 'pending') {
        setViewState('pending');
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        setErrorType('refused');
        setFormError('A operadora ou o Mercado Pago não autorizou a transação.');
        setViewState('error');
      } else {
        setViewState('checkout');
        setFormError('Aguardando confirmação do pagamento pelo Mercado Pago. Se já concluiu o pagamento, o pedido será liberado automaticamente após aprovação.');
      }
    } catch (err) {
      console.warn('Notice verifying order:', err);
      setErrorType('communication');
      setViewState('error');
      setFormError('Não foi possível verificar a aprovação do pagamento neste momento. Caso tenha pago, você poderá acessar seus produtos na Área do Cliente após aprovação.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Calculate Cart Total in cents to avoid float rounding errors (Anti-Tampering & Exact Centavos)
  const totalCents = items.reduce((acc, item) => {
    const pack = item?.pack || item;
    const price = Number(pack?.discountPrice ?? (item as any)?.price ?? (item as any)?.unit_price ?? 57.99);
    const qty = Math.max(1, Number(item?.quantity) || 1);
    return acc + Math.round(price * 100) * qty;
  }, 0);

  const totalAmount = totalCents / 100;

  // Real-time listener: Invalidate outdated QR code if cart total or items change
  const prevTotalRef = useRef<number>(totalAmount);
  const prevItemsLengthRef = useRef<number>(items.length);

  useEffect(() => {
    if (prevTotalRef.current !== totalAmount || prevItemsLengthRef.current !== items.length) {
      prevTotalRef.current = totalAmount;
      prevItemsLengthRef.current = items.length;
      if (viewState === 'pix_display') {
        setPixQrCode(null);
        setPixQrCodeBase64(null);
        setPixPaymentId(null);
        setViewState('checkout');
      }
    }
  }, [totalAmount, items.length, viewState]);

  // Confetti Animation when Payment is Confirmed by Mercado Pago
  useEffect(() => {
    if (viewState === 'success') {
      try {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 99999,
        };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });
        fire(0.2, {
          spread: 60,
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      } catch (err) {
        console.warn('Notice: confetti launch error:', err);
      }
    }
  }, [viewState]);

  // Direct redirection to /area-do-cliente on clicking "ACESSAR SUAS COMPRAS"
  const handleGoToCustomerArea = () => {
    if (customerPhone) {
      setPendingWhatsAppPhone(customerPhone);
      loginCustomerDirectWithPhone(customerPhone).catch(() => {});
    }
    cleanUrlParams();
    onClearCart();
    onClose();
    try {
      window.history.pushState(null, '', '/area-do-cliente');
    } catch {}
    setIsCustomerAreaOpen(true);
  };

  const handleClose = () => {
    cleanUrlParams();
    setFormError(null);
    setViewState('checkout');
    onClose();
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Phone masking: (XX) XXXXX-XXXX
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
    // Preenchimento repetitivo automático no campo de confirmação
    setCustomerPhoneConfirm(formatted);
    if (formError) setFormError(null);
  };

  const handlePhoneConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhoneConfirm(formatted);
    if (formError) setFormError(null);
  };

  // Validate customer inputs
  const validateCustomer = (): boolean => {
    if (!items || items.length === 0) {
      setFormError('Seu carrinho está vazio. Adicione pelo menos um pacote antes de prosseguir.');
      return false;
    }
    if (!customerName.trim() || customerName.trim().length < 3) {
      setFormError('Informe seu nome completo.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setFormError('Informe um e-mail válido para receber os links de acesso.');
      return false;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Informe um WhatsApp com DDD válido (ex: (11) 99999-9999).');
      return false;
    }
    const cleanConfirm = customerPhoneConfirm.replace(/\D/g, '');
    if (!cleanConfirm || cleanConfirm !== cleanPhone) {
      setFormError('Os números de WhatsApp (Cadastro e Confirmação) devem ser iguais.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Process PIX Payment (Real-Time Generation & Polling)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleGeneratePix = async (_forceNew: boolean = false) => {
    if (!validateCustomer()) return;

    setIsProcessing(true);
    setButtonState('processing');
    setFormError(null);

    const safeItems = (items && items.length > 0 ? items : [{
      pack: {
        id: 'pack_flyer_150_mega',
        title: 'Produto MD Stúdio Play',
        discountPrice: 57.99,
        image: '',
      },
      quantity: 1,
    }]).map((i) => {
      const pack = i?.pack || i;
      return {
        id: String(pack?.id || (i as any)?.id || 'pack_item'),
        title: String(pack?.title || (i as any)?.title || 'Produto MD Stúdio Play'),
        quantity: Math.max(1, Number(i?.quantity) || 1),
        unit_price: Number(pack?.discountPrice ?? (i as any)?.unit_price ?? (i as any)?.price ?? 57.99),
        postSaleUrl: (pack as any)?.postSaleUrl,
        image: (pack as any)?.image,
      };
    });

    const titles = safeItems.map((i) => i.title).join(', ');
    const description = `MD Stúdio Play - ${titles}`.slice(0, 100);
    const effectiveTotal = totalAmount > 0 ? totalAmount : safeItems.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);

    // Unique idempotency key per attempt (fresh for every generation)
    const idempotencyKey = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await fetch('/api/mercadopago/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: effectiveTotal,
          paymentMethodType: 'pix',
          description,
          idempotencyKey,
          payer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone,
          },
          items: safeItems,
        }),
      });

      const data = await response.json().catch(() => null);

      if (data && data.success && data.paymentId && data.qrCode) {
        setPixPaymentId(data.paymentId);
        setPixQrCode(data.qrCode);
        setPixTicketUrl(data.ticketUrl || null);

        if (data.qrCodeBase64) {
          setPixQrCodeBase64(data.qrCodeBase64.startsWith('data:') ? data.qrCodeBase64 : `data:image/png;base64,${data.qrCodeBase64}`);
        } else {
          const qrUrl = await generatePixQrCodeDataUrl(data.qrCode);
          setPixQrCodeBase64(qrUrl);
        }

        setCompletedOrder({
          orderId: data.orderId,
          total: data.totalAmount || effectiveTotal,
          paymentMethod: 'PIX',
          date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          items: items.map((i) => i?.pack || i),
          postSaleUrls: data.postSaleUrls || safeItems.map((i) => i.postSaleUrl).filter(Boolean) as string[],
          ticketUrl: data.ticketUrl,
        });

        setViewState('pix_display');
        setPixCountdown(600);
      } else {
        const errorMsg = data?.error || 'Não foi possível gerar o PIX neste momento. Estamos tentando estabelecer comunicação com o Mercado Pago.';
        setErrorType('communication');
        setFormError(errorMsg);
        setViewState('error');
      }
    } catch (err: any) {
      console.warn('Erro ao conectar com API do Mercado Pago:', err);
      setErrorType('communication');
      setFormError('Não foi possível gerar o PIX neste momento. Estamos tentando estabelecer comunicação com o Mercado Pago.');
      setViewState('error');
    } finally {
      setIsProcessing(false);
      setButtonState('idle');
    }
  };

  // Regeneration and recovery actions from error screen
  const handleRegeneratePixFromError = () => {
    cleanUrlParams();
    setFormError(null);
    if (validateCustomer()) {
      handleGeneratePix(true);
    } else {
      setViewState('checkout');
    }
  };

  const handleTryAgain = () => {
    cleanUrlParams();
    setFormError(null);
    setViewState('checkout');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PIX Real-Time Polling Engine & Countdown
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (viewState !== 'pix_display' || !pixPaymentId) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    // Countdown Timer
    timerIntervalRef.current = setInterval(() => {
      setPixCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling Mercado Pago Payment Status every 2.5s
    let isPolling = true;

    const pollStatus = async () => {
      if (!isPolling) return;
      try {
        const res = await fetch(`/api/mercadopago/payment-status/${pixPaymentId}`);
        const data = await res.json();

        if (data.success && data.status === 'approved' && isPolling) {
          isPolling = false;
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          // Add to local store orders
          addOrder({
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone,
            items: items.map((i) => ({ pack: i.pack, quantity: i.quantity })),
            subtotal: totalAmount,
            discount: 0,
            total: totalAmount,
            paymentMethod: 'pix',
            status: 'completed',
            payment_status: 'approved',
            order_status: 'PAGAMENTO APROVADO',
            pixPayload: pixQrCode || undefined,
            pixQrCodeUrl: pixQrCodeBase64 || undefined,
            mercadoPagoPaymentId: pixPaymentId,
            ticketUrl: pixTicketUrl || undefined,
          });

          // Authenticate customer WhatsApp session
          setPendingWhatsAppPhone(customerPhone);
          loginCustomerDirectWithPhone(customerPhone).catch(() => {});
          onClearCart();
          cleanUrlParams();

          // Move to Success Screen
          setViewState('success');
        } else if (data.success && (data.status === 'rejected' || data.status === 'cancelled')) {
          isPolling = false;
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setErrorType('refused');
          setFormError('O pagamento foi recusado ou cancelado pela instituição financeira no Mercado Pago.');
          setViewState('error');
        }
      } catch (err) {
        // silent check error
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 2500);

    return () => {
      isPolling = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [viewState, pixPaymentId, customerName, customerEmail, customerPhone, items, totalAmount]);

  const handleCopyPix = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl shadow-black relative overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#14161c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Checkout Seguro</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Mercado Pago Oficial
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">Ambiente criptografado com liberação imediata</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW 1: FORMULÁRIO DE CHECKOUT E MEIOS DE PAGAMENTO
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'checkout' && (
            <div className="space-y-6">
              {/* Order Summary Box */}
              <div className="bg-[#14161c] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <ShoppingBag className="w-4 h-4 text-yellow-400" />
                    <span>Resumo da Compra ({items.length} produto{items.length > 1 ? 's' : ''})</span>
                  </div>
                  <span className="text-xs font-extrabold text-white">Valor Unitário</span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {items.map((it) => (
                    <div key={it.pack.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <img
                          src={it.pack.image}
                          alt={it.pack.title}
                          className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">{it.pack.title}</p>
                          <p className="text-[10px] text-neutral-400">Qtd: {it.quantity}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-neutral-200 shrink-0">
                        {formatBRL(it.pack.discountPrice || 57.99)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.08] pt-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">Total a Pagar:</span>
                  <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">
                    {formatBRL(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Form Error Notice */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Identification Form */}
              <div className="bg-[#14161c] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Seus Dados para Entrega e Liberação</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      E-mail de Entrega *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      WhatsApp com DDD (Para cadastro) *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 flex items-center justify-between">
                      <span>WhatsApp com DDD (Confirmação) *</span>
                      <span className="text-[9px] text-emerald-400 font-medium">
                        (Preenchimento repetitivo automático)
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhoneConfirm}
                      onChange={handlePhoneConfirmChange}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method: Exclusivo PIX Oficial com Liberação Imediata */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block">Forma de Pagamento: PIX</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Liberação Automática Instantânea
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    Sem Taxas
                  </span>
                </div>
              </div>

              {/* PIX Details & Action Button */}
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-xl bg-[#14161c] border border-white/5 text-xs text-neutral-300 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      O QR Code e o código <strong>Copia e Cola</strong> são gerados via <strong>Mercado Pago</strong> com confirmação automática.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Seus arquivos e links para download são liberados na hora na sua <strong>Área do Cliente</strong> sem precisar enviar comprovante!
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGeneratePix()}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-[#1ec75f] hover:bg-[#18b554] text-white font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(30,199,95,0.4)] transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Gerando QR Code PIX Oficial...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      <span>GERAR PIX — {formatBRL(totalAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW 2: TELA DO PIX (QR Code, Copia e Cola & Polling em Tempo Real)
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'pix_display' && (
            <div className="space-y-5 text-center animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-[#14161c] border border-emerald-500/30 flex flex-col items-center space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                  <span className="text-base">⏳</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AGUARDANDO CONFIRMAÇÃO DO PAGAMENTO</span>
                </div>

                <p className="text-xs text-neutral-300 max-w-md">
                  Abra o app do seu banco, escolha <strong>Pagar com PIX</strong> e aponte a câmera para o QR Code abaixo ou clique em <strong>COPIAR CÓDIGO PIX</strong>:
                </p>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-emerald-500/40 my-1">
                  {pixQrCodeBase64 ? (
                    <img
                      src={pixQrCodeBase64}
                      alt="QR Code PIX Mercado Pago"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-black">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Value and Countdown Bar */}
                <div className="flex items-center justify-between w-full max-w-xs px-2 pt-1 text-xs">
                  <span className="font-bold text-neutral-400">Total da compra:</span>
                  <span className="font-black text-yellow-400 text-base sm:text-lg font-mono">{formatBRL(totalAmount)}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Código válido por: <strong className="text-white font-mono">{formatCountdown(pixCountdown)}</strong></span>
                </div>
              </div>

              {/* Botão Copiar Código PIX */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    pixCopied
                      ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                      : 'bg-[#1ec75f] hover:bg-[#18b554] text-white shadow-[#1ec75f]/30'
                  }`}
                >
                  {pixCopied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-black" />
                      <span>CÓDIGO PIX COPIADO COM SUCESSO!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>COPIAR CÓDIGO PIX (COPIA E COLA)</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-neutral-400">
                  Após pagar no seu banco, o sistema confirma o pagamento automaticamente em tempo real sem precisar enviar comprovante.
                </p>
              </div>

              {/* Live Polling Spinner Indicator */}
              <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-xs text-neutral-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span className="font-medium">🔄 Verificando confirmação do pagamento junto ao Mercado Pago...</span>
              </div>

              <button
                type="button"
                onClick={() => setViewState('checkout')}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Voltar para o carrinho / Alterar dados
              </button>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW 3: POP-UP DE PAGAMENTO APROVADO & CONFIRMADO
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'success' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-2 sm:py-3">
              {/* Emoji Festivo e Badge de Aprovação */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="text-6xl sm:text-7xl animate-bounce select-none">🎉</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PAGAMENTO APROVADO</span>
                </div>
              </div>

              {/* Mensagens Obrigatórias */}
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Pagamento confirmado!
                </h3>
                <p className="text-sm sm:text-base font-bold text-emerald-400">
                  Seu pagamento foi aprovado com sucesso.
                </p>
                <p className="text-xs sm:text-sm text-neutral-300">
                  Suas compras já estão disponíveis na Área do Cliente.
                </p>
              </div>

              {/* Informações Oficiais do Pedido */}
              <div className="bg-[#14161c] border border-white/[0.08] rounded-2xl p-4 sm:p-5 text-left text-xs space-y-2.5 shadow-xl">
                <div className="flex justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-neutral-400">Identificação do Pedido:</span>
                  <span className="font-bold text-white font-mono">{completedOrder?.orderId || '#ORD-CONFIRMADO'}</span>
                </div>

                <div className="flex justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-neutral-400">Status:</span>
                  <span className="font-black text-emerald-400 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PAGAMENTO APROVADO</span>
                  </span>
                </div>

                <div className="flex justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-neutral-400">Valor Total Pago:</span>
                  <span className="font-black text-yellow-400 font-mono text-sm sm:text-base">
                    {formatBRL(completedOrder?.total || totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-neutral-400">Data da Compra:</span>
                  <span className="font-bold text-white">{completedOrder?.date || new Date().toLocaleString('pt-BR')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400">WhatsApp Vinculado:</span>
                  <span className="font-bold text-white font-mono">{customerPhone}</span>
                </div>
              </div>

              {/* Lista dos Produtos Adquiridos com Links */}
              {completedOrder?.items && completedOrder.items.length > 0 && (
                <div className="space-y-2 text-left bg-black/40 p-4 rounded-2xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Produtos Prontos para Download:</span>
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">
                      {completedOrder.items.length} {completedOrder.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                    {completedOrder.items.map((it: any, idx: number) => {
                      const itemTitle = it.title || it.pack?.title || 'Produto Adquirido';
                      const postSale = it.postSaleUrl || it.pack?.postSaleUrl || completedOrder.postSaleUrls?.[idx] || completedOrder.postSaleUrls?.[0];
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#14161c] border border-white/5 gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{itemTitle}</span>
                          {postSale ? (
                            <a
                              href={postSale}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-lg bg-[#00d06c] hover:bg-[#00b85f] text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>BAIXAR</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10">Liberado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botão em Grande Destaque: "ACESSAR SUAS COMPRAS" */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoToCustomerArea}
                  className="w-full py-4 sm:py-4.5 rounded-2xl bg-[#00d06c] hover:bg-[#00b85f] text-black font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(0,208,108,0.5)] transition-all cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-6 h-6 text-black" />
                  <span>ACESSAR SUAS COMPRAS</span>
                </button>
              </div>

              {/* Link Secundário */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Continuar Navegando na Loja
                </button>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW: CONSULTANDO MERCADO PAGO (/pagamento/sucesso em verificação)
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'verifying' && (
            <div className="space-y-6 text-center py-8 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-400 text-blue-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Verificando com o Mercado Pago...</h3>
                <p className="text-xs text-neutral-300 mt-2 max-w-sm mx-auto leading-relaxed">
                  Aguarde um momento enquanto confirmamos a aprovação do seu pagamento em tempo real.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161c] border border-white/[0.08] text-xs text-neutral-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Liberação com segurança e entrega imediata dos seus playbacks.</span>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW 4: PÁGINA / TELA PENDENTE (/pagamento/pendente)
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'pending' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-400 text-yellow-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Pagamento em Análise</h3>
                <p className="text-xs text-neutral-300 mt-1 max-w-sm mx-auto">
                  Estamos aguardando a confirmação do seu pagamento pelo Mercado Pago.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161c] border border-white/[0.08] text-xs text-neutral-400 space-y-2">
                <p>Assim que a operadora aprovar, seus arquivos serão liberados automaticamente na Área do Cliente.</p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold pt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sincronizando status...</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setIsCustomerAreaOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs transition-colors cursor-pointer"
              >
                Acompanhar na Área do Cliente
              </button>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIEW 5: PÁGINA / TELA DE ERRO (/pagamento/erro)
             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {viewState === 'error' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
                  errorType === 'communication'
                    ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                    : 'bg-red-500/20 border-2 border-red-400 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                }`}>
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  errorType === 'communication'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  <span>{errorType === 'communication' ? '⚠️ Comunicação Mercado Pago' : '❌ Pagamento recusado'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {errorType === 'communication'
                    ? 'Não foi possível gerar o PIX neste momento.'
                    : 'Não foi possível aprovar o pagamento'}
                </h3>
                {errorType === 'communication' && (
                  <p className="text-xs sm:text-sm font-semibold text-amber-400">
                    Estamos tentando estabelecer comunicação com o Mercado Pago.
                  </p>
                )}
                <p className="text-xs text-neutral-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {formError || (errorType === 'communication'
                    ? 'Clique no botão abaixo para gerar uma nova cobrança segura.'
                    : 'A operadora não autorizou a transação ou os dados informados possuem divergência.')
                  }
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161c] border border-white/[0.08] text-xs text-neutral-300 leading-relaxed">
                {errorType === 'communication'
                  ? 'Seus itens e o valor total da compra foram preservados. Clique em "GERAR NOVO PIX" para efetuar uma nova tentativa segura.'
                  : 'Você pode tentar pagar via PIX Oficial ou conferir os dados e tentar novamente.'}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRegeneratePixFromError}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-[#1ec75f] hover:bg-[#18b554] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando PIX...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>GERAR NOVO PIX</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Voltar / Revisar Dados
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
