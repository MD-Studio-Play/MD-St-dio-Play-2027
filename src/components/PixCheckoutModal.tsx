import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Zap,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  ArrowRight,
  Lock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileMusic,
  CreditCard,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem } from '../types';
import { useStore } from '../context/StoreContext';
import { isValidCPF, formatCPF } from '../utils/cpfValidator';
import { PackThumbnail } from './PackThumbnail';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { generateBacenPixPayload, isBacenPixCode } from '../utils/pixPayload';

const DEFAULT_MP_TOKEN = 'APP_USR-3016872973673511-102015-1793162807f06f1da8d82aba77c59288-697443735';
const DEFAULT_PIX_KEY = '+5527996509853';
const DEFAULT_BENEFICIARY = 'ROAN1155540';
const DEFAULT_CITY = 'CANAVIEIRAS';

interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onClearCart: () => void;
}

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onClearCart,
}) => {
  const {
    checkoutConfig,
    setIsCustomerAreaOpen,
    loginCustomerDirectWithPhone,
  } = useStore();

  // Modal view states: 'form' | 'pix_display' | 'success' | 'expired'
  const [viewState, setViewState] = useState<'form' | 'pix_display' | 'success' | 'expired'>('form');

  // Customer Form inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected payment method: 'pix' | 'credit_card'
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Mercado Pago PIX Transaction states
  const [isGenerating, setIsGenerating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);
  const [postSaleUrls, setPostSaleUrls] = useState<string[]>([]);

  // 10-Minute Dynamic Countdown Timer (in seconds)
  const [countdown, setCountdown] = useState<number>(600);
  const pollIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);

  // Calculate Subtotal and Total
  const totalCents = items.reduce(
    (acc, item) =>
      acc +
      Math.round(Number(item.pack.discountPrice || 57.99) * 100) *
        Math.max(1, Number(item.quantity) || 1),
    0
  );
  const cartTotal = totalCents / 100;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Mask Phone: (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (!clean) {
      setCustomerPhone('');
      return;
    }
    if (clean.length <= 2) {
      setCustomerPhone(`(${clean}`);
    } else if (clean.length <= 7) {
      setCustomerPhone(`(${clean.slice(0, 2)}) ${clean.slice(2)}`);
    } else {
      setCustomerPhone(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
    }
  };

  // Mask CPF: XXX.XXX.XXX-XX
  const handleCpfChange = (val: string) => {
    setCustomerCpf(formatCPF(val));
  };

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setIsCopied(false);
      // Pre-fill from localStorage if customer previously entered
      try {
        const savedPhone = localStorage.getItem('jsp_pending_wa_phone');
        if (savedPhone && !customerPhone) handlePhoneChange(savedPhone);
        const savedProfile = localStorage.getItem('jsp_customer_user');
        if (savedProfile) {
          const u = JSON.parse(savedProfile);
          if (u.name && !customerName) setCustomerName(u.name);
          if (u.email && !customerEmail && !u.email.includes('@cliente.mdstudio')) setCustomerEmail(u.email);
        }
      } catch {}
    } else {
      // Clear timers and listeners when modal is closed
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, []);

  // Countdown timer handler during pix_display
  useEffect(() => {
    if (viewState === 'pix_display') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setViewState('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [viewState]);

  // Format countdown minutes:seconds (e.g. 09:59)
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Trigger celebration confetti
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#55c21b', '#009ee3', '#ffffff', '#ffd700'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#55c21b', '#009ee3', '#ffffff'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#55c21b', '#009ee3', '#ffffff'],
        });
      }, 300);
    } catch (confettiErr) {
      console.warn('Confetti effect unavailable:', confettiErr);
    }
  };

  // Handle Payment Approved transition
  const handlePaymentApproved = (approvedOrderData?: any) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();

    if (approvedOrderData?.post_sale_urls) {
      setPostSaleUrls(approvedOrderData.post_sale_urls);
    }

    setViewState('success');
    triggerCelebration();

    // Auto-login customer with their phone number in session
    if (customerPhone) {
      loginCustomerDirectWithPhone(customerPhone).catch(() => {});
    }

    // Clear cart once order is confirmed
    onClearCart();
  };

  // Start Real-Time Order Verification (Polling + Firestore Snapshot Listener)
  const startOrderVerification = (currOrderId: string) => {
    if (!currOrderId) return;

    // 1. Listen to Firestore real-time snapshot
    try {
      const orderRef = doc(db, 'orders', currOrderId);
      unsubscribeSnapshotRef.current = onSnapshot(
        orderRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (
              data.status === 'completed' ||
              data.payment_status === 'approved' ||
              data.order_status === 'PAGAMENTO APROVADO'
            ) {
              handlePaymentApproved(data);
            }
          }
        },
        (err) => {
          console.warn('Firestore live listener notice (handled):', err?.message);
        }
      );
    } catch (fsErr) {
      console.warn('Firestore live listener notice:', fsErr);
    }

    // 2. Poll backend endpoint every 2.5s as active verification against Mercado Pago API
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/order-status/${currOrderId}`, {
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (data && data.success && data.isApproved) {
          handlePaymentApproved(data.order);
        }
      } catch (pollErr) {
        console.warn('Poll status error:', pollErr);
      }
    }, 2500);
  };

  // Generate Real Mercado Pago PIX Payment
  const handleGeneratePixPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanCpf = customerCpf.replace(/\D/g, '');

    if (!cleanName || cleanName.length < 3) {
      setFormError('Por favor, informe seu nome completo.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!cleanCpf || cleanCpf.length !== 11) {
      setFormError('O CPF é obrigatório pelo Banco Central para registro da chave PIX.');
      return;
    }
    if (!isValidCPF(cleanCpf)) {
      setFormError('Por favor, informe um CPF válido e existente.');
      return;
    }
    if (items.length === 0) {
      setFormError('Seu carrinho está vazio. Adicione produtos antes de finalizar.');
      return;
    }

    setIsGenerating(true);

    // Unique idempotency key to prevent double charge on multi-click
    const idempotencyKey = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const usedToken =
      checkoutConfig?.mercadoPagoAccessToken &&
      checkoutConfig.mercadoPagoAccessToken.trim().length > 20 &&
      !checkoutConfig.mercadoPagoAccessToken.includes('mock')
        ? checkoutConfig.mercadoPagoAccessToken.trim()
        : DEFAULT_MP_TOKEN;

    const nameParts = cleanName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'VIP';
    const areaCode = cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '11';
    const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;
    const isSeller = cleanEmail.includes('moriartdigital') || cleanEmail.includes('mdstudioplay');
    const safeEmail = isSeller ? 'cliente.comprador@mdstudioplay.ai.studio' : cleanEmail;

    try {
      let isSuccess = false;
      let data: any = null;

      // ━━━ 1. PRIMARY: SECURE BACKEND API CALL WITH MULTI-ENDPOINT RETRY ━━━
      const backendEndpoints = ['/api/mercadopago/create-pix', '/api/create-pix', '/api/create-pix-payment'];
      for (const endpoint of backendEndpoints) {
        if (isSuccess) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
              amount: Number(cartTotal.toFixed(2)),
              description: `MD Stúdio Play - ${items.map((i) => i.pack.title).join(', ')}`.slice(0, 100),
              idempotencyKey,
              name: cleanName,
              cellphone: cleanPhone,
              phone: cleanPhone,
              email: cleanEmail,
              taxId: cleanCpf,
              cpf: cleanCpf,
              mercadoPagoAccessToken: usedToken,
              payer: {
                name: cleanName,
                first_name: firstName,
                last_name: lastName,
                cellphone: cleanPhone,
                phone: cleanPhone,
                email: safeEmail,
                taxId: cleanCpf,
                cpf: cleanCpf,
              },
              items: items.map((i, idx) => ({
                id: i.pack.id,
                external_code: i.pack.id || `ITEM-${idx + 1}`,
                title: i.pack.title,
                description: i.pack.title,
                quantity: i.quantity,
                unit_price: i.pack.discountPrice,
                postSaleUrl: i.pack.postSaleUrl,
              })),
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const text = await response.text();
          if (text && !text.trim().startsWith('<')) {
            const parsed = JSON.parse(text);
            if (parsed && parsed.success && (parsed.paymentId || parsed.orderId) && (parsed.qrCode || parsed.checkout_url || parsed.checkoutUrl)) {
              data = parsed;
              isSuccess = true;
              break;
            } else if (parsed && parsed.error) {
              data = parsed;
            }
          }
        } catch (backendFetchErr) {
          console.warn(`Notice calling ${endpoint}:`, backendFetchErr);
        }
      }

      if (isSuccess && data) {
        // Garante que o qrCode seja estritamente um código PIX oficial do Banco Central (000201...)
        let validPixCode = data.qrCode;
        if (!isBacenPixCode(validPixCode)) {
          validPixCode = generateBacenPixPayload({
            pixKey: DEFAULT_PIX_KEY,
            merchantName: DEFAULT_BENEFICIARY,
            merchantCity: DEFAULT_CITY,
            amount: Number((data.totalAmount || cartTotal).toFixed(2)),
            txid: String(data.orderId || idempotencyKey).replace(/[^A-Za-z0-9]/g, '').slice(0, 25),
            description: 'MD STUDIO PLAY',
          });
        }

        let finalQrCodeBase64 = data.qrCodeBase64 || null;
        if (!finalQrCodeBase64 || !isBacenPixCode(data.qrCode)) {
          try {
            finalQrCodeBase64 = await QRCode.toDataURL(validPixCode, {
              width: 320,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            });
          } catch {}
        }

        setOrderId(data.orderId);
        setPaymentId(data.paymentId);
        setQrCode(validPixCode);
        setQrCodeBase64(finalQrCodeBase64);
        setTicketUrl(data.ticketUrl || null);
        setCheckoutUrl(data.checkout_url || data.checkoutUrl || null);
        setFinalTotal(data.totalAmount || cartTotal);
        setCountdown(600); // 10 minutes
        setViewState('pix_display');
        startOrderVerification(data.orderId);
        return;
      }

      // ━━━ 2. CLIENT-SIDE FALLBACK: MERCADO PAGO CHECKOUT PREFERENCES (100% CORS-SAFE) ━━━
      // Gera o BR Code oficial do Banco Central para o QR Code + Copia e Cola e usa a URL como link auxiliar
      try {
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const externalReference = `ext_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const originUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://mdstudioplay.ai.studio';

        // Gera o código PIX oficial do Banco Central brasileiro (EMV BR Code 000201...)
        const officialPixCode = generateBacenPixPayload({
          pixKey: DEFAULT_PIX_KEY,
          merchantName: DEFAULT_BENEFICIARY,
          merchantCity: DEFAULT_CITY,
          amount: Number(cartTotal.toFixed(2)),
          txid: orderId.replace(/[^A-Za-z0-9]/g, '').slice(0, 25),
          description: 'MD STUDIO PLAY',
        });

        let clientGeneratedQr: string | null = null;
        try {
          clientGeneratedQr = await QRCode.toDataURL(officialPixCode, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch (qrErr) {
          console.warn('QR Code generation notice:', qrErr);
        }

        let initPoint = '';
        try {
          const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${usedToken}`,
            },
            body: JSON.stringify({
              items: items.map((i, idx) => ({
                id: String(i.pack.id || `ITEM-${idx + 1}`).slice(0, 50),
                title: String(i.pack.title || 'Produto MD Studio').slice(0, 150),
                quantity: Math.max(1, Number(i.quantity) || 1),
                currency_id: 'BRL',
                unit_price: Number(Number(i.pack.discountPrice || 57.99).toFixed(2)),
              })),
              payer: {
                name: firstName,
                surname: lastName,
                email: safeEmail,
                identification: {
                  type: 'CPF',
                  number: cleanCpf,
                },
              },
              payment_methods: {
                excluded_payment_types: [
                  { id: 'ticket' },
                  { id: 'credit_card' },
                  { id: 'debit_card' },
                ],
              },
              back_urls: {
                success: `${originUrl}/area-do-cliente?status=sucesso`,
                pending: `${originUrl}/area-do-cliente?status=pendente`,
                failure: `${originUrl}/checkout?status=erro`,
              },
              auto_return: 'approved',
              external_reference: externalReference,
            }),
          });

          const prefData = await prefRes.json().catch(() => ({}));
          if (prefRes.ok && (prefData.id || prefData.init_point)) {
            initPoint = prefData.init_point || prefData.sandbox_init_point || '';
          }
        } catch (prefCallErr) {
          console.warn('Preferences call notice:', prefCallErr);
        }

        // Persist order in Firestore
        try {
          await setDoc(
            doc(db, 'orders', orderId),
            {
              id: orderId,
              orderNumber: orderId,
              customer_id: cleanPhone,
              customerName: cleanName,
              customerEmail: cleanEmail,
              customerPhone: cleanPhone,
              customerCpf: cleanCpf,
              external_reference: externalReference,
              items: items.map((i) => ({
                id: i.pack.id,
                title: i.pack.title,
                quantity: i.quantity,
                unit_price: i.pack.discountPrice,
                postSaleUrl: i.pack.postSaleUrl,
              })),
              total: Number(cartTotal.toFixed(2)),
              paymentMethod: 'pix',
              paymentProvider: 'mercadopago',
              payment_id: orderId,
              payment_status: 'pending',
              order_status: 'AGUARDANDO PAGAMENTO',
              status: 'pending',
              pixPayload: officialPixCode,
              pixQrCodeUrl: clientGeneratedQr,
              checkoutUrl: initPoint || undefined,
              post_sale_urls: items.map((i) => i.pack.postSaleUrl).filter(Boolean),
              date: new Date().toLocaleDateString('pt-BR'),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('Notice: Firestore save in client fallback:', fsErr);
        }

        setOrderId(orderId);
        setPaymentId(orderId);
        setQrCode(officialPixCode); // 100% Código BACEN PIX (000201...)
        setQrCodeBase64(clientGeneratedQr);
        setTicketUrl(initPoint || null);
        setCheckoutUrl(initPoint || null);
        setFinalTotal(cartTotal);
        setCountdown(600);
        setViewState('pix_display');
        startOrderVerification(orderId);
        return;
      } catch (clientFallbackErr) {
        console.warn('Client fallback notice:', clientFallbackErr);
      }

      const errMsg =
        data?.error ||
        'Não foi possível gerar a cobrança PIX no momento. Por favor, verifique os dados ou tente novamente.';
      setFormError(errMsg);
    } catch (err: any) {
      console.error('Falha ao gerar PIX:', err);
      setFormError('Falha temporária de comunicação com o Mercado Pago. Por favor, tente novamente em instantes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MERCADO PAGO: Checkout Oficial com Cartão de Crédito
  // Valida itens e cria preferência oficial no Mercado Pago com redirecionamento seguro
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleCreditCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanCpf = customerCpf.replace(/\D/g, '');

    if (!cleanName || cleanName.length < 3) {
      setFormError('Por favor, informe seu nome completo.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!cleanCpf || cleanCpf.length !== 11) {
      setFormError('O CPF é obrigatório para emissão e segurança do pagamento.');
      return;
    }
    if (!isValidCPF(cleanCpf)) {
      setFormError('Por favor, informe um CPF válido e existente.');
      return;
    }
    if (items.length === 0) {
      setFormError('Seu carrinho está vazio. Adicione produtos antes de finalizar.');
      return;
    }

    setIsProcessingCard(true);

    const nameParts = cleanName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'VIP';
    const isSeller = cleanEmail.includes('moriartdigital') || cleanEmail.includes('mdstudioplay');
    const safeEmail = isSeller ? 'cliente.comprador@mdstudioplay.ai.studio' : cleanEmail;

    const usedToken =
      checkoutConfig?.mercadoPagoAccessToken &&
      checkoutConfig.mercadoPagoAccessToken.trim().length > 20 &&
      !checkoutConfig.mercadoPagoAccessToken.includes('mock')
        ? checkoutConfig.mercadoPagoAccessToken.trim()
        : DEFAULT_MP_TOKEN;

    const originUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://mdstudioplay.ai.studio';

    try {
      let isSuccess = false;
      let data: any = null;

      // 1. Tenta backend seguro com validação de preços contra adulteração
      const backendEndpoints = [
        '/api/mercadopago/create-checkout-pro',
        '/api/mercadopago/create-order',
        '/api/create-payment',
        '/api/payment/create',
      ];

      for (const endpoint of backendEndpoints) {
        if (isSuccess) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              payer: {
                name: cleanName,
                first_name: firstName,
                last_name: lastName,
                phone: cleanPhone,
                cellphone: cleanPhone,
                email: safeEmail,
                cpf: cleanCpf,
                taxId: cleanCpf,
              },
              items: items.map((i) => ({
                id: i.pack.id,
                title: i.pack.title,
                quantity: i.quantity,
                unit_price: i.pack.discountPrice,
                postSaleUrl: i.pack.postSaleUrl,
                coverImage: i.pack.image,
              })),
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            const parsed = JSON.parse(text);
            if (parsed && parsed.success && (parsed.checkout_url || parsed.initPoint)) {
              data = parsed;
              isSuccess = true;
              break;
            } else if (parsed && parsed.error) {
              data = parsed;
            }
          }
        } catch (fetchErr) {
          console.warn(`Tentativa em ${endpoint} (contingência ativa):`, fetchErr);
        }
      }

      if (isSuccess && data && (data.checkout_url || data.initPoint)) {
        const checkoutRedirectUrl = data.checkout_url || data.initPoint;

        try {
          localStorage.setItem(
            'pending_mp_order',
            JSON.stringify({
              orderId: data.orderId,
              phone: cleanPhone,
              email: cleanEmail,
              timestamp: Date.now(),
            })
          );
        } catch {}

        onClearCart();
        onClose();
        window.location.href = checkoutRedirectUrl;
        return;
      }

      // 2. Contingência client-side oficial do Mercado Pago Preferences API
      const clientOrderId = `PEDIDO-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const extRef = clientOrderId;

      const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${usedToken}`,
        },
        body: JSON.stringify({
          items: items.map((i, idx) => ({
            id: String(i.pack.id || `ITEM-${idx + 1}`).slice(0, 50),
            title: String(i.pack.title || 'Produto MD Studio').slice(0, 150),
            quantity: Math.max(1, Number(i.quantity) || 1),
            currency_id: 'BRL',
            unit_price: Number(Number(i.pack.discountPrice || 57.99).toFixed(2)),
          })),
          payer: {
            name: firstName,
            surname: lastName,
            email: safeEmail,
            identification: {
              type: 'CPF',
              number: cleanCpf,
            },
          },
          payment_methods: {
            excluded_payment_types: [{ id: 'ticket' }],
            installments: 12,
          },
          back_urls: {
            success: `${originUrl}/area-do-cliente?status=sucesso&order_id=${clientOrderId}`,
            pending: `${originUrl}/area-do-cliente?status=pendente&order_id=${clientOrderId}`,
            failure: `${originUrl}/checkout?status=erro&order_id=${clientOrderId}`,
          },
          auto_return: 'approved',
          external_reference: extRef,
          statement_descriptor: 'MD STUDIO',
          notification_url: 'https://mdstudioplay.netlify.app/api/mercadopago/webhook',
        }),
      });

      const prefData = await prefRes.json().catch(() => ({}));
      if (prefRes.ok && (prefData.init_point || prefData.sandbox_init_point)) {
        const isSandbox = usedToken.startsWith('TEST-');
        const targetUrl = isSandbox && prefData.sandbox_init_point ? prefData.sandbox_init_point : prefData.init_point;

        try {
          await setDoc(
            doc(db, 'orders', clientOrderId),
            {
              id: clientOrderId,
              orderNumber: clientOrderId,
              customer_id: cleanPhone,
              customerName: cleanName,
              customerEmail: cleanEmail,
              customerPhone: cleanPhone,
              customerCpf: cleanCpf,
              external_reference: extRef,
              items: items.map((i) => ({
                id: i.pack.id,
                title: i.pack.title,
                quantity: i.quantity,
                unit_price: i.pack.discountPrice,
                postSaleUrl: i.pack.postSaleUrl,
              })),
              total: Number(cartTotal.toFixed(2)),
              paymentMethod: 'card',
              payment_method: 'credit_card',
              paymentProvider: 'mercadopago',
              preference_id: String(prefData.id),
              checkout_url: targetUrl,
              payment_status: 'pending',
              order_status: 'AGUARDANDO PAGAMENTO',
              status: 'pending',
              post_sale_urls: items.map((i) => i.pack.postSaleUrl).filter(Boolean),
              date: new Date().toLocaleDateString('pt-BR'),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('Notice: Firestore save in card fallback:', fsErr);
        }

        try {
          localStorage.setItem(
            'pending_mp_order',
            JSON.stringify({
              orderId: clientOrderId,
              phone: cleanPhone,
              email: cleanEmail,
              timestamp: Date.now(),
            })
          );
        } catch {}

        onClearCart();
        onClose();
        window.location.href = targetUrl;
        return;
      }

      setFormError(
        data?.error ||
        prefData?.message ||
        'Não foi possível inicializar o checkout com cartão no Mercado Pago. Por favor tente novamente ou utilize o PIX.'
      );
    } catch (err: any) {
      console.error('Falha ao processar pagamento por Cartão:', err);
      setFormError('Erro ao conectar ao Mercado Pago. Por favor tente novamente ou escolha a opção PIX.');
    } finally {
      setIsProcessingCard(false);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'pix') {
      handleGeneratePixPayment(e);
    } else {
      handleCreditCardPayment(e);
    }
  };

  // Copy PIX Code to clipboard
  const handleCopyPix = () => {
    if (!qrCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(qrCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3500);
    }
  };

  // Redirect to Customer Area
  const handleGoToCustomerArea = () => {
    onClose();
    setIsCustomerAreaOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white my-auto">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#13161c]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              viewState === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : paymentMethod === 'credit_card'
                ? 'bg-[#009ee3]/20 text-[#009ee3] border border-[#009ee3]/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {viewState === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : paymentMethod === 'credit_card' ? (
                <CreditCard className="w-5 h-5" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                {viewState === 'success'
                  ? 'Pagamento Concluído'
                  : paymentMethod === 'credit_card'
                  ? 'Checkout Seguro · Cartão de Crédito'
                  : 'Checkout Seguro · PIX Oficial'}
              </h3>
              <p className="text-xs text-neutral-400">
                {viewState === 'success'
                  ? 'Acesso liberado instantaneamente'
                  : paymentMethod === 'credit_card'
                  ? 'Mercado Pago · Até 12x no Cartão'
                  : 'Mercado Pago · Banco Central do Brasil'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* =========================================================================
              VIEW 1: FORMULÁRIO DO PAGADOR + RESUMO DO PEDIDO
              ========================================================================= */}
          {viewState === 'form' && (
            <div className="space-y-6">
              {/* Error Notice */}
              {formError && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{formError}</div>
                </div>
              )}

              {/* Order Summary Card */}
              <div className="bg-[#14161d] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <FileMusic className="w-4 h-4 text-emerald-400" />
                    <span>Resumo do Pedido ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                    PIX Instantâneo
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1">
                  {items.map((item) => (
                    <div
                      key={item.pack.id}
                      className="flex items-center justify-between text-xs gap-3 p-1.5 rounded-xl bg-black/20"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <PackThumbnail pack={item.pack} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{item.pack.title}</p>
                          <p className="text-[11px] text-neutral-400">
                            {item.quantity}x {formatCurrency(item.pack.discountPrice)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-400 tabular-nums shrink-0">
                        {formatCurrency(item.pack.discountPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-medium">Total a Pagar (Sem Taxas):</span>
                  <span className="text-lg font-black text-emerald-400 tabular-nums">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              {/* ━━━ ESCOLHA DA FORMA DE PAGAMENTO (PIX OU CARTÃO DE CRÉDITO) ━━━ */}
              <div className="space-y-2.5">
                <label className="block text-neutral-300 font-bold text-xs">
                  Selecione a Forma de Pagamento:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção 1: PIX */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('pix');
                      setFormError(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-[#14161d] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        paymentMethod === 'pix' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
                      }`}>
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span>PIX</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                            Instantâneo
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">QR Code oficial Banco Central</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-500'
                    }`}>
                      {paymentMethod === 'pix' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </button>

                  {/* Opção 2: Cartão de Crédito */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('credit_card');
                      setFormError(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      paymentMethod === 'credit_card'
                        ? 'bg-sky-500/10 border-[#009ee3] ring-2 ring-[#009ee3]/20'
                        : 'bg-[#14161d] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        paymentMethod === 'credit_card' ? 'bg-[#009ee3] text-white' : 'bg-white/10 text-white'
                      }`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span>Cartão de Crédito</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold uppercase">
                            Mercado Pago
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Até 12x no cartão de crédito</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'credit_card' ? 'border-[#009ee3] bg-[#009ee3]' : 'border-neutral-500'
                    }`}>
                      {paymentMethod === 'credit_card' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Payer Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-neutral-300 font-bold text-[11px]">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João Silva Santos"
                      className="w-full bg-[#14161d] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="block text-neutral-300 font-bold text-[11px]">
                      WhatsApp com DDD (Para Envio) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(11) 99999-8888"
                      className="w-full bg-[#14161d] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-neutral-300 font-bold text-[11px]">
                      E-mail (Para Acesso aos Downloads) *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-[#14161d] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* CPF */}
                  <div className="space-y-1.5">
                    <label className="block text-neutral-300 font-bold text-[11px]">
                      CPF do Titular *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerCpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#14161d] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Trust and Safety Badges */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ambiente Criptografado Mercado Pago</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Liberação Automática dos Arquivos</span>
                  </div>
                </div>

                {/* CTA Submit Button (PIX vs Cartão de Crédito) */}
                {paymentMethod === 'pix' ? (
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Gerando QR Code Oficial no Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        <span>GERAR COBRANÇA PIX ({formatCurrency(cartTotal)})</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessingCard}
                    className="w-full py-4 bg-[#009ee3] hover:bg-[#008ecb] text-white font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#009ee3]/25 active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingCard ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Redirecionando para o Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>PAGUE PELO MERCADO PAGO</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: QR CODE PIX EM TEMPO REAL + COPIA E COLA + POLLING
              ========================================================================= */}
          {viewState === 'pix_display' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5" />
                  QR Code Gerado com Sucesso
                </span>
                <h4 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                  Escaneie o QR Code ou use o Copia e Cola
                </h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Abra o aplicativo do seu banco, escolha pagar via PIX e aponte a câmera para o QR Code abaixo.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="relative inline-block mx-auto p-4 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500">
                {qrCodeBase64 ? (
                  <img
                    src={qrCodeBase64}
                    alt="QR Code PIX Oficial Banco Central"
                    className="w-56 h-56 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-black font-bold text-xs">
                    Carregando QR Code...
                  </div>
                )}
                {/* Visual Corner accents */}
                <span className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                <span className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
              </div>

              {/* Official BACEN PIX badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold mx-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>PIX Oficial Banco Central (Aceito em Todos os Bancos)</span>
              </div>

              {/* Value and Countdown Bar */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
                <div className="px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-neutral-300">
                  <span>Valor: </span>
                  <strong className="text-emerald-400 text-sm font-black">
                    {formatCurrency(finalTotal)}
                  </strong>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 flex items-center gap-1.5 text-neutral-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Expira em: </span>
                  <strong className="text-amber-400 font-bold">{formatCountdown(countdown)}</strong>
                </div>
              </div>

              {/* Copia e Cola Code Box */}
              <div className="space-y-2 max-w-lg mx-auto text-left">
                <label className="block text-neutral-400 text-xs font-semibold text-center">
                  Código PIX Copia e Cola:
                </label>
                <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-2xl border border-white/10 font-mono text-[11px] text-neutral-300">
                  <input
                    type="text"
                    readOnly
                    value={qrCode || ''}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-transparent outline-none truncate select-all cursor-pointer text-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    title="Copiar código PIX"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-md"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Big Copiar Código Button */}
              <button
                type="button"
                onClick={handleCopyPix}
                className={`w-full max-w-lg mx-auto py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    <span>CÓDIGO PIX COPIADO COM SUCESSO!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>COPIAR CÓDIGO PIX</span>
                  </>
                )}
              </button>

              {/* Direct payment link button when checkout_url is available */}
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-lg mx-auto py-3 rounded-2xl bg-[#009ee3] hover:bg-[#008ecb] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#009ee3]/20"
                >
                  <span>Abrir Pagamento no Mercado Pago</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {/* Real-Time Status Notification */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 max-w-lg mx-auto flex items-center justify-center gap-2.5 text-xs text-emerald-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-semibold">
                  Aguardando confirmação do pagamento em tempo real...
                </span>
              </div>

              {ticketUrl && (
                <div className="text-center pt-1">
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1 underline"
                  >
                    <span>Abrir comprovante na página oficial do Mercado Pago</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 3: SUCESSO E CELEBRAÇÃO COM CONFETES
              ========================================================================= */}
          {viewState === 'success' && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
              {/* Pulsing Success Badge */}
              <div className="relative inline-block mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
                  Reconhecido pelo Mercado Pago
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  PAGAMENTO CONFIRMADO COM SUCESSO!
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto">
                  Sua compra foi aprovada e todos os seus arquivos musicais já estão liberados na sua Área do Cliente.
                </p>
              </div>

              {/* Order Info Badge */}
              <div className="bg-[#14161d] border border-white/10 rounded-2xl p-4 max-w-md mx-auto text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-neutral-400 pb-2 border-b border-white/10">
                  <span>Número do Pedido:</span>
                  <span className="font-mono font-bold text-white">{orderId || 'ORD-COMPLETO'}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400 pb-2 border-b border-white/10">
                  <span>WhatsApp Vinculado:</span>
                  <span className="font-bold text-white">{customerPhone}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Status do Pedido:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PAGAMENTO APROVADO
                  </span>
                </div>
              </div>

              {/* Direct Access CTA */}
              <div className="space-y-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleGoToCustomerArea}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/25 active:scale-98 cursor-pointer"
                >
                  <span>ACESSAR SUAS COMPRAS / MEUS DOWNLOADS</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-[11px] text-neutral-400">
                  Você também pode acessar seus downloads a qualquer momento na Área do Cliente informando seu WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 4: QR CODE EXPIRADO (Permite gerar novamente)
              ========================================================================= */}
          {viewState === 'expired' && (
            <div className="space-y-5 text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">Cobrança PIX Expirada</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  O tempo limite de 10 minutos para pagamento deste QR Code expirou. Para concluir sua compra, gere uma nova cobrança com valor atualizado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewState('form')}
                className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Gerar Novo QR Code PIX
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
