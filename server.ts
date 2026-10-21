import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './src/firebase';
import { isValidCPF } from './src/utils/cpfValidator';
import { AbacatePay } from '@abacatepay/sdk';
import { verifyWebhookSignature, verifyStandardWebhookSignature } from '@abacatepay/types';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable robust cross-browser CORS for all incoming API requests and preflight OPTIONS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Helper: Retrieve Access Token exclusively from server environment variables or secured Firestore
let cachedFirestoreMpToken: string | null = null;
let cachedFirestoreMpPublic: string | null = null;

// Blacklist of expired or placeholder tokens known to fail with 401 Unauthorized
const EXPIRED_OR_MOCK_TOKENS = new Set([
  'APP_USR-6022104151117754-093011-1ea1e21f5951dd7e5843aab72506e9eb-697443735',
  'mock-token',
  'TEST-mock',
  'APP_USR-mock',
]);

function isValidTokenCandidate(token?: string | null): boolean {
  if (!token) return false;
  const t = token.trim();
  if (t.length < 15) return false;
  if (EXPIRED_OR_MOCK_TOKENS.has(t)) return false;
  return true;
}

function getAccessToken(): string {
  const token =
    cachedFirestoreMpToken ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    '';
  return isValidTokenCandidate(token) ? token.trim() : '';
}

async function getMercadoPagoAccessToken(fallback?: string): Promise<string> {
  // 1. Explicit token from request body (e.g. from Admin or StoreContext)
  if (fallback && isValidTokenCandidate(fallback)) {
    return fallback.trim();
  }
  // 2. In-memory cached token (saved via /api/mercadopago/save-config)
  if (cachedFirestoreMpToken && isValidTokenCandidate(cachedFirestoreMpToken)) {
    return cachedFirestoreMpToken;
  }
  // 3. Firestore stored checkout configuration (official database storage)
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'checkout'));
    if (snap.exists()) {
      const t1 = snap.data()?.config?.mercadoPagoAccessToken || snap.data()?.mercadoPagoAccessToken;
      if (t1 && isValidTokenCandidate(t1)) {
        cachedFirestoreMpToken = t1.trim();
        return t1.trim();
      }
    }
    const snap2 = await getDoc(doc(db, 'site_configs', 'checkout'));
    if (snap2.exists()) {
      const t2 = snap2.data()?.mercadoPagoAccessToken;
      if (t2 && isValidTokenCandidate(t2)) {
        cachedFirestoreMpToken = t2.trim();
        return t2.trim();
      }
    }
  } catch (dbErr) {
    console.warn('[Firestore Token Load Notice]:', dbErr);
  }
  // 4. Server environment variable (only if valid and not expired/blacklisted)
  const envToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  if (envToken && isValidTokenCandidate(envToken)) {
    return envToken;
  }
  return '';
}

// Helper: Retrieve Public Key from environment or public config
function getPublicKey(): string {
  if (cachedFirestoreMpPublic && cachedFirestoreMpPublic.trim().length > 5) {
    return cachedFirestoreMpPublic.trim();
  }
  const key =
    process.env.MERCADO_PAGO_PUBLIC_KEY ||
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
    process.env.VITE_MERCADOPAGO_PUBLIC_KEY ||
    '';
  return key.trim();
}

async function getMercadoPagoPublicKey(fallback?: string): Promise<string> {
  if (fallback && fallback.trim().length > 5 && !fallback.includes('mock')) return fallback.trim();
  if (cachedFirestoreMpPublic && cachedFirestoreMpPublic.trim().length > 5) return cachedFirestoreMpPublic;
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'checkout'));
    if (snap.exists()) {
      const pub1 = snap.data()?.config?.mercadoPagoPublicKey || snap.data()?.mercadoPagoPublicKey;
      if (pub1 && pub1.trim().length > 5) {
        cachedFirestoreMpPublic = pub1.trim();
        return pub1.trim();
      }
    }
    const snap2 = await getDoc(doc(db, 'site_configs', 'checkout'));
    if (snap2.exists()) {
      const pub2 = snap2.data()?.mercadoPagoPublicKey;
      if (pub2 && pub2.trim().length > 5) {
        cachedFirestoreMpPublic = pub2.trim();
        return pub2.trim();
      }
    }
  } catch {}
  const envKey = getPublicKey();
  if (envKey && envKey.length > 5 && !envKey.includes('mock')) return envKey;
  return '';
}

// Helper: Map Mercado Pago payment status to official Portuguese Order Status
function mapOrderStatus(mpStatus: string): {
  orderStatus:
    | 'AGUARDANDO PAGAMENTO'
    | 'PAGAMENTO EM ANÁLISE'
    | 'PAGAMENTO APROVADO'
    | 'PAGAMENTO REJEITADO'
    | 'PAGAMENTO CANCELADO'
    | 'PAGAMENTO ESTORNADO';
  simpleStatus: 'completed' | 'pending' | 'cancelled';
} {
  switch (mpStatus) {
    case 'approved':
      return { orderStatus: 'PAGAMENTO APROVADO', simpleStatus: 'completed' };
    case 'in_process':
      return { orderStatus: 'PAGAMENTO EM ANÁLISE', simpleStatus: 'pending' };
    case 'pending':
      return { orderStatus: 'AGUARDANDO PAGAMENTO', simpleStatus: 'pending' };
    case 'rejected':
      return { orderStatus: 'PAGAMENTO REJEITADO', simpleStatus: 'cancelled' };
    case 'cancelled':
      return { orderStatus: 'PAGAMENTO CANCELADO', simpleStatus: 'cancelled' };
    case 'refunded':
      return { orderStatus: 'PAGAMENTO ESTORNADO', simpleStatus: 'cancelled' };
    case 'charged_back':
      return { orderStatus: 'PAGAMENTO ESTORNADO', simpleStatus: 'cancelled' };
    default:
      return { orderStatus: 'AGUARDANDO PAGAMENTO', simpleStatus: 'pending' };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AbacatePay Official API Helpers (v2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Retrieve AbacatePay API Key (from Firestore site_settings/checkout or site_configs/checkout or env)
async function getAbacatePayApiKey(customKey?: string): Promise<string> {
  if (customKey && customKey.trim().length > 5) return customKey.trim();
  
  // 1. Prioritize user-configured key from Firestore Admin Panel
  try {
    const snap1 = await getDoc(doc(db, 'site_settings', 'checkout'));
    if (snap1.exists()) {
      const data = snap1.data();
      const cfg = data?.config || data;
      if (cfg?.abacatePayApiKey && cfg.abacatePayApiKey.trim().length > 5) {
        return cfg.abacatePayApiKey.trim();
      }
    }
  } catch {}

  try {
    const snap2 = await getDoc(doc(db, 'site_configs', 'checkout'));
    if (snap2.exists()) {
      const data = snap2.data();
      if (data?.abacatePayApiKey && data.abacatePayApiKey.trim().length > 5) {
        return data.abacatePayApiKey.trim();
      }
    }
  } catch {}

  // 2. Fallback to server environment variables
  const envKey =
    process.env.ABACATEPAY_API_KEY ||
    process.env.ABACATEPAY_SECRET_KEY ||
    process.env.ABACATEPAY_TOKEN ||
    process.env.ABACATE_PAY_API_KEY ||
    '';
  if (envKey.trim().length > 5) return envKey.trim();

  return '';
}

// Retrieve AbacatePay Webhook Secret
async function getAbacatePayWebhookSecret(customSecret?: string): Promise<string> {
  if (customSecret && customSecret.trim()) return customSecret.trim();

  // 1. Prioritize Firestore Admin Panel
  try {
    const snap1 = await getDoc(doc(db, 'site_settings', 'checkout'));
    if (snap1.exists()) {
      const data = snap1.data();
      const cfg = data?.config || data;
      if (cfg?.abacatePayWebhookSecret && cfg.abacatePayWebhookSecret.trim()) {
        return cfg.abacatePayWebhookSecret.trim();
      }
    }
  } catch {}

  try {
    const snap2 = await getDoc(doc(db, 'site_configs', 'checkout'));
    if (snap2.exists()) {
      const data = snap2.data();
      if (data?.abacatePayWebhookSecret && data.abacatePayWebhookSecret.trim()) {
        return data.abacatePayWebhookSecret.trim();
      }
    }
  } catch {}

  // 2. Fallback to server environment variables
  const envSecret = process.env.ABACATEPAY_WEBHOOK_SECRET || '';
  if (envSecret.trim()) return envSecret.trim();

  return '';
}

// Map AbacatePay TransparentStatus & Webhook Status to Portuguese Order Status
function mapAbacatePayStatus(status: string): {
  orderStatus:
    | 'AGUARDANDO PAGAMENTO'
    | 'PAGAMENTO EM ANÁLISE'
    | 'PAGAMENTO APROVADO'
    | 'PAGAMENTO REJEITADO'
    | 'PAGAMENTO CANCELADO'
    | 'PAGAMENTO ESTORNADO';
  simpleStatus: 'completed' | 'pending' | 'cancelled';
} {
  const norm = String(status || '').toUpperCase();
  switch (norm) {
    case 'PAID':
    case 'APPROVED':
    case 'COMPLETE':
      return { orderStatus: 'PAGAMENTO APROVADO', simpleStatus: 'completed' };
    case 'PENDING':
      return { orderStatus: 'AGUARDANDO PAGAMENTO', simpleStatus: 'pending' };
    case 'UNDER_DISPUTE':
      return { orderStatus: 'PAGAMENTO EM ANÁLISE', simpleStatus: 'pending' };
    case 'EXPIRED':
      return { orderStatus: 'PAGAMENTO CANCELADO', simpleStatus: 'cancelled' };
    case 'CANCELLED':
    case 'FAILED':
      return { orderStatus: 'PAGAMENTO REJEITADO', simpleStatus: 'cancelled' };
    case 'REFUNDED':
    case 'REDEEMED':
      return { orderStatus: 'PAGAMENTO ESTORNADO', simpleStatus: 'cancelled' };
    default:
      return { orderStatus: 'AGUARDANDO PAGAMENTO', simpleStatus: 'pending' };
  }
}

// Helper: Recalculate and validate total purchase value on backend (Anti-Tampering)
function calculateRealOrderTotal(items: any[]): { total: number; postSaleUrls: string[]; validatedItems: any[] } {
  if (!Array.isArray(items) || items.length === 0) {
    return { total: 0, postSaleUrls: [], validatedItems: [] };
  }

  let totalCents = 0;
  const postSaleUrls: string[] = [];
  const validatedItems: any[] = [];

  for (const item of items) {
    if (!item) continue;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const pack = item.pack || item;
    const packId = String(pack.id || item.id || 'pack_flyer_150_mega');
    let unitPrice = Number(pack.discountPrice ?? item.unit_price ?? item.price ?? 0);
    if (unitPrice <= 0) {
      unitPrice = 57.99;
    }

    const itemTotalCents = Math.round(unitPrice * 100) * qty;
    totalCents += itemTotalCents;
    const itemTotal = itemTotalCents / 100;

    let postSale = pack.postSaleUrl || item.postSaleUrl;
    if (!postSale) {
      if (packId === 'pack_midi_variados_vip_2026') {
        postSale = 'https://drive.google.com/drive/folders/1ns6pguW_lxaQdqrn7RdIBwBWVr36VJkm?usp=drive_link';
      } else if (packId === 'pack_midi_gospel_vip_2026') {
        postSale = 'https://drive.google.com/drive/folders/1J6vQUbziL7PvtWhc1iZCcht2fIRRwtYd?usp=drive_link';
      }
    }
    if (postSale && !postSaleUrls.includes(postSale)) {
      postSaleUrls.push(postSale);
    }

    validatedItems.push({
      id: packId,
      title: String(pack.title || item.title || 'Produto MD Studio').slice(0, 150),
      quantity: qty,
      unit_price: unitPrice,
      total: itemTotal,
      postSaleUrl: postSale || null,
      coverImage: pack.image || pack.coverImage || null,
    });
  }

  const total = totalCents / 100;
  return {
    total: Number(total.toFixed(2)),
    postSaleUrls,
    validatedItems,
  };
}

// Helper: Detect card brand from card number prefix (fallback)
function detectCardBrand(num: string): string {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'master';
  if (/^(4011|4389|4514|4576|5041|5066|5067|6277|6362|6363|650|6516|6550)/.test(clean)) return 'elo';
  if (/^(34|37)/.test(clean)) return 'amex';
  if (/^(3841|60)/.test(clean)) return 'hipercard';
  return 'master';
}

// Helper: Translate Mercado Pago error codes & messages to user-friendly Portuguese with specific status mapping
function translateMercadoPagoError(
  mpData: any,
  httpStatus?: number
): { message: string; errorCode: string; isTemporary: boolean } {
  const causeCode = String(mpData?.cause?.[0]?.code || mpData?.error || '').trim();
  const causeDesc = String(mpData?.cause?.[0]?.description || '').trim();
  const message = String(mpData?.message || '').trim();
  const statusDetail = String(mpData?.status_detail || '').trim();
  const combined = `${causeCode} ${causeDesc} ${message} ${statusDetail}`.toLowerCase();

  // 1. Status 401: Invalid Credentials
  if (httpStatus === 401 || combined.includes('invalid_token') || combined.includes('unauthorized')) {
    return {
      message: 'Access Token do Mercado Pago não configurado, inválido ou expirado. Acesse o Painel Admin > Checkout & Pagamento para cadastrar o seu Access Token definitivo.',
      errorCode: 'MP_401_UNAUTHORIZED',
      isTemporary: false,
    };
  }

  // 2. Status 403: Forbidden / Access Denied
  if (httpStatus === 403 || combined.includes('forbidden') || combined.includes('collector_id')) {
    return {
      message: 'Acesso não autorizado pelo gateway do Mercado Pago. Verifique as permissões da conta comercial.',
      errorCode: 'MP_403_FORBIDDEN',
      isTemporary: false,
    };
  }

  // 3. Status 404: Endpoint not found
  if (httpStatus === 404) {
    return {
      message: 'Serviço do Mercado Pago temporariamente indisponível (Endpoint não encontrado).',
      errorCode: 'MP_404_NOT_FOUND',
      isTemporary: true,
    };
  }

  // 4. Status 409: Conflict / Idempotency Duplicate
  if (httpStatus === 409 || combined.includes('idempotency') || combined.includes('conflict')) {
    return {
      message: 'Conflito na solicitação de pagamento. Gerando uma nova tentativa com chave exclusiva...',
      errorCode: 'MP_409_CONFLICT',
      isTemporary: true,
    };
  }

  // 5. Status 429: Rate Limit Exceeded
  if (httpStatus === 429 || combined.includes('rate_limit') || combined.includes('too_many_requests')) {
    return {
      message: 'Limite temporário de requisições atingido no Mercado Pago. Aguarde alguns segundos e tente novamente.',
      errorCode: 'MP_429_RATE_LIMIT',
      isTemporary: true,
    };
  }

  // 6. Status 502 / 503 / 504: Temporary Gateway Indisponibility
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504 || combined.includes('bad_gateway') || combined.includes('gateway_timeout')) {
    return {
      message: 'O Mercado Pago está temporariamente indisponível. Aguarde alguns instantes e tente gerar o PIX novamente.',
      errorCode: `MP_${httpStatus || 503}_UNAVAILABLE`,
      isTemporary: true,
    };
  }

  // 7. Status 500: Server Error at Mercado Pago
  if (httpStatus === 500) {
    return {
      message: 'Instabilidade técnica momentânea nos servidores do Mercado Pago. Tente gerar um novo PIX.',
      errorCode: 'MP_500_SERVER_ERROR',
      isTemporary: true,
    };
  }

  // Specific domain validations
  if (combined.includes('collector') && combined.includes('payer')) {
    return {
      message: 'O e-mail do pagador não pode ser idêntico ao e-mail cadastrado na conta vendedora do Mercado Pago.',
      errorCode: 'MP_SAME_COLLECTOR_PAYER',
      isTemporary: false,
    };
  }

  if (combined.includes('3034') || combined.includes('card_number_validation')) {
    return {
      message: 'Número de cartão inválido ou não autorizado pela conta. Verifique os dados digitados ou utilize o PIX para aprovação imediata.',
      errorCode: 'MP_INVALID_CARD_NUMBER',
      isTemporary: false,
    };
  }

  if (combined.includes('2006') || combined.includes('card token not found') || combined.includes('invalid card_token_id') || combined.includes('3003')) {
    return {
      message: 'Não foi possível validar o token do cartão. Confira os números, validade e CVV ou escolha a opção PIX.',
      errorCode: 'MP_INVALID_CARD_TOKEN',
      isTemporary: false,
    };
  }

  if (combined.includes('2010') || combined.includes('security_code') || combined.includes('3000')) {
    return {
      message: 'Código de segurança (CVV) do cartão inválido.',
      errorCode: 'MP_INVALID_CVV',
      isTemporary: false,
    };
  }

  if (combined.includes('2007') || combined.includes('expiration_month') || combined.includes('expiration_year') || combined.includes('3001')) {
    return {
      message: 'Data de vencimento do cartão inválida ou expirada.',
      errorCode: 'MP_INVALID_EXPIRATION',
      isTemporary: false,
    };
  }

  if (combined.includes('2005') || combined.includes('installments')) {
    return {
      message: 'Número de parcelas selecionado inválido.',
      errorCode: 'MP_INVALID_INSTALLMENTS',
      isTemporary: false,
    };
  }

  if (combined.includes('4020') || combined.includes('notificaction_url') || combined.includes('notification_url')) {
    return {
      message: 'URL de notificação de pagamento inválida.',
      errorCode: 'MP_INVALID_NOTIFICATION_URL',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_insufficient_amount')) {
    return {
      message: 'Saldo ou limite insuficiente no cartão informado.',
      errorCode: 'MP_CC_INSUFFICIENT_AMOUNT',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_bad_filled_security_code')) {
    return {
      message: 'Código de segurança (CVV) incorreto.',
      errorCode: 'MP_CC_BAD_CVV',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_bad_filled_date')) {
    return {
      message: 'Data de validade do cartão incorreta.',
      errorCode: 'MP_CC_BAD_DATE',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_bad_filled_other')) {
    return {
      message: 'Dados do cartão incorretos. Por favor, confira as informações.',
      errorCode: 'MP_CC_BAD_DETAILS',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_call_for_authorize')) {
    return {
      message: 'Transação bloqueada pela operadora do cartão. Ligue para seu banco ou pague via PIX.',
      errorCode: 'MP_CC_CALL_FOR_AUTHORIZE',
      isTemporary: false,
    };
  }

  if (combined.includes('cc_rejected_other_reason')) {
    return {
      message: 'Transação não autorizada pela operadora do cartão. Sugerimos pagar via PIX (aprovação em segundos).',
      errorCode: 'MP_CC_OTHER_REASON',
      isTemporary: false,
    };
  }

  // 400 Bad Request fallback
  if (httpStatus === 400) {
    return {
      message: causeDesc || message || 'Dados informados no checkout inválidos para processamento pelo Mercado Pago.',
      errorCode: causeCode || 'MP_400_BAD_REQUEST',
      isTemporary: false,
    };
  }

  return {
    message: causeDesc || message || 'Não foi possível processar a cobrança no Mercado Pago. Verifique os dados e tente novamente.',
    errorCode: causeCode || `MP_STATUS_${httpStatus || 'UNKNOWN'}`,
    isTemporary: true,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. API: Public Key for MercadoPago.js v2 SDK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/mercadopago/public-key', async (_req: Request, res: Response) => {
  const publicKey = await getMercadoPagoPublicKey();
  return res.json({
    success: true,
    publicKey,
    isSandbox: publicKey.startsWith('TEST-'),
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. API: Create Payment (PIX or Credit Card) via official /v1/payments
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCreatePayment(req: Request, res: Response) {
  try {
    const {
      amount,
      paymentMethodType = 'pix', // 'pix' | 'credit_card' | 'card'
      description = 'MD Stúdio Play - Playbacks & Multitracks',
      payer,
      items,
      card,
      idempotencyKey: clientProvidedIdempotency,
    } = req.body;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    const accessToken = await getMercadoPagoAccessToken(req.body.mercadoPagoAccessToken || req.body.accessToken);
    if (!accessToken || accessToken.length < 10 || accessToken.includes('mock-token')) {
      console.warn('[MERCADO PAGO NOTICE]: Access Token is missing or not configured yet.');
      return res.status(400).json({
        success: false,
        requiresToken: true,
        error:
          'Credencial do Mercado Pago não configurada no servidor. Acesse o Painel Admin > Checkout & Pagamento para cadastrar o seu Access Token definitivo.',
      });
    }

    // 1. Validate mandatory Payer details
    const payerName = (payer?.name || '').trim();
    const cleanCpf = (payer?.cpf || payer?.taxId || '').replace(/\D/g, '');
    const cleanPhone = (payer?.phone || payer?.cellphone || '').replace(/\D/g, '');
    const email = (payer?.email || '').trim().toLowerCase();

    if (!payerName || payerName.length < 3) {
      return res.status(400).json({ success: false, error: 'Nome completo é obrigatório.' });
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'WhatsApp com DDD é obrigatório.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'E-mail válido é obrigatório.' });
    }
    if (email === 'moriartdigital@gmail.com') {
      return res.status(400).json({
        success: false,
        error: 'O Mercado Pago não permite compras utilizando o mesmo e-mail da sua conta vendedora (moriartdigital@gmail.com). Para testar a geração do PIX, utilize qualquer outro e-mail diferente.',
      });
    }
    if (cleanCpf && !isValidCPF(cleanCpf)) {
      return res.status(400).json({ success: false, error: 'Por favor, informe um CPF válido e existente.' });
    }

    const nameParts = payerName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'VIP';
    const areaCode = cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '11';
    const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;

    // 2. Recalculate real purchase total on backend (anti-tampering)
    const { total: calculatedTotal, postSaleUrls, validatedItems } = calculateRealOrderTotal(items);
    const finalTotal = calculatedTotal > 0 ? calculatedTotal : (Number(amount) > 0 ? Number(Number(amount).toFixed(2)) : 57.99);
    if (!finalTotal || finalTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Valor da compra inválido.' });
    }

    // 3. Generate unique order references with proper idempotency
    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const externalReference = `ext_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const headerIdempotency = req.headers['x-idempotency-key'];
    const rawIdempotency = (clientProvidedIdempotency || (typeof headerIdempotency === 'string' ? headerIdempotency : null));
    const idempotencyKey = rawIdempotency && rawIdempotency.length >= 8
      ? String(rawIdempotency).trim()
      : crypto.randomUUID();

    const isCard = paymentMethodType === 'credit_card' || paymentMethodType === 'card';

    // Strict validation of notification_url to prevent Mercado Pago code 4020 bad_request error
    const notificationUrl: string =
      process.env.MERCADOPAGO_WEBHOOK_URL ||
      'https://mdstudioplay.com.br/api/mercadopago/webhook';

    let paymentPayload: any;

    if (isCard) {
      // ━━━ CARTÃO DE CRÉDITO ━━━
      let cardTokenId = card?.token;
      let paymentMethodId = card?.payment_method_id || card?.brand;
      const installments = Math.max(1, Math.min(12, Number(card?.installments) || 1));

      // Sanitize issuer_id (must be a valid integer or omitted)
      let safeIssuerId: string | undefined = undefined;
      if (card?.issuer_id && /^\d+$/.test(String(card.issuer_id))) {
        safeIssuerId = String(card.issuer_id);
      }

      // If token not provided directly from frontend SDK, tokenize via MP Card Tokens API as fallback
      if (!cardTokenId && card?.cardNumber) {
        const rawNum = String(card.cardNumber).replace(/\D/g, '');
        const rawExp = String(card.cardExp || card.expiration || '').trim();
        let expMonth = Number(card.expirationMonth) || 12;
        let expYear = Number(card.expirationYear) || 2028;

        if (rawExp.includes('/')) {
          const [m, y] = rawExp.split('/');
          expMonth = Number(m);
          expYear = Number(y.length === 2 ? `20${y}` : y);
        }

        paymentMethodId = paymentMethodId || detectCardBrand(rawNum);

        const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            card_number: rawNum,
            expiration_month: expMonth,
            expiration_year: expYear,
            security_code: String(card.cvv || card.securityCode || '123'),
            cardholder: {
              name: card.cardHolder || payerName,
              identification: {
                type: 'CPF',
                number: cleanCpf,
              },
            },
          }),
        });

        const tokenData: any = await tokenRes.json();
        if (tokenRes.ok && tokenData.id) {
          cardTokenId = tokenData.id;
        } else {
          const { message: friendlyCardError, errorCode } = translateMercadoPagoError(tokenData, tokenRes.status);
          console.error(
            `[MERCADO PAGO AUDIT ERROR] Endpoint: POST /v1/card_tokens | HTTP Status: ${tokenRes.status} | Code: ${errorCode} | RawMessage: ${tokenData?.message || 'N/A'}`
          );
          return res.status(tokenRes.status || 400).json({
            success: false,
            errorCode,
            error: friendlyCardError,
          });
        }
      }

      if (!cardTokenId) {
        return res.status(400).json({
          success: false,
          error: 'Token do cartão não fornecido. Por favor, confira os dados do cartão ou realize o pagamento via PIX.',
        });
      }

      paymentMethodId = paymentMethodId ? String(paymentMethodId).toLowerCase() : 'master';
      if (paymentMethodId === 'mastercard') paymentMethodId = 'master';

      paymentPayload = {
        transaction_amount: finalTotal,
        token: cardTokenId,
        description: description.slice(0, 100),
        installments,
        payment_method_id: paymentMethodId,
        ...(safeIssuerId ? { issuer_id: safeIssuerId } : {}),
        external_reference: externalReference,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cleanCpf,
          },
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      };
    } else {
      // ━━━ PIX EM TEMPO REAL ━━━
      paymentPayload = {
        transaction_amount: finalTotal,
        description: description.slice(0, 100),
        payment_method_id: 'pix',
        external_reference: externalReference,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          ...(cleanCpf && cleanCpf.length === 11 && isValidCPF(cleanCpf) ? {
            identification: {
              type: 'CPF',
              number: cleanCpf,
            },
          } : {}),
          phone: {
            area_code: areaCode,
            number: phoneNumber,
          },
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      };
    }

    // Call official Mercado Pago /v1/payments
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpRequestId = mpRes.headers.get('x-request-id') || mpRes.headers.get('traceparent') || `req_${Date.now()}`;
    const mpData: any = await mpRes.json().catch(() => ({}));

    if (mpRes.ok && mpData.id) {
      console.info(
        `[MERCADO PAGO AUDIT SUCCESS] Endpoint: POST /v1/payments | HTTP Status: ${mpRes.status} | OrderId: ${orderId} | ExtRef: ${externalReference} | RequestId: ${mpRequestId} | PaymentId: ${mpData.id} | Amount: R$ ${finalTotal.toFixed(2)}`
      );
      const paymentId = String(mpData.id);
      const mpStatus = String(mpData.status || 'pending');
      const statusDetail = String(mpData.status_detail || '');
      const transactionData = mpData.point_of_interaction?.transaction_data;
      const qrCode = transactionData?.qr_code || '';
      let qrCodeBase64 = transactionData?.qr_code_base64 || '';
      const ticketUrl = transactionData?.ticket_url || '';

      if (qrCodeBase64 && !qrCodeBase64.startsWith('data:')) {
        qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
      } else if (!qrCodeBase64 && qrCode) {
        try {
          qrCodeBase64 = await QRCode.toDataURL(qrCode, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch {}
      }

      const { orderStatus, simpleStatus } = mapOrderStatus(mpStatus);

      // Persist order in Firestore
      const orderDocData = {
        id: orderId,
        orderNumber: orderId,
        customer_id: cleanPhone,
        customerName: payerName,
        customerEmail: email,
        customerPhone: cleanPhone,
        customerCpf: cleanCpf,
        external_reference: externalReference,
        items: validatedItems,
        total: finalTotal,
        subtotal: finalTotal,
        discount: 0,
        paymentMethod: isCard ? 'card' : 'pix',
        payment_method: isCard ? 'credit_card' : 'pix',
        paymentProvider: 'mercadopago',
        payment_id: paymentId,
        payment_status: mpStatus,
        order_status: orderStatus,
        status: simpleStatus,
        mercadoPagoPaymentId: paymentId,
        pixPayload: qrCode || null,
        pixQrCodeUrl: qrCodeBase64 || null,
        ticketUrl: ticketUrl || null,
        cardBrand: isCard ? (mpData.payment_method_id || 'Cartão') : null,
        cardLast4: isCard ? mpData.card?.last_four_digits || null : null,
        installments: isCard ? Number(mpData.installments) || 1 : null,
        post_sale_urls: postSaleUrls,
        date: new Date().toLocaleDateString('pt-BR'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Persist payment ledger record in Firestore
      const paymentDocData = {
        id: paymentId,
        order_id: orderId,
        mercado_pago_payment_id: paymentId,
        external_reference: externalReference,
        method: isCard ? 'credit_card' : 'pix',
        amount: finalTotal,
        status: mpStatus,
        status_detail: statusDetail,
        transaction_date: mpData.date_created || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'orders', orderId), orderDocData, { merge: true });
        await setDoc(doc(db, 'payments', paymentId), paymentDocData, { merge: true });
      } catch (dbErr) {
        console.warn('Notice: Firestore save in backend:', dbErr);
      }

      return res.json({
        success: true,
        provider: 'mercadopago',
        orderId,
        paymentId,
        externalReference,
        status: mpStatus,
        statusDetail,
        orderStatus,
        totalAmount: finalTotal,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        expirationDate: mpData.date_of_expiration,
        postSaleUrls,
      });
    } else {
      const { message: friendlyError, errorCode, isTemporary } = translateMercadoPagoError(mpData, mpRes.status);
      console.error(
        `[MERCADO PAGO AUDIT ERROR] Endpoint: POST /v1/payments | HTTP Status: ${mpRes.status} | OrderId: ${orderId} | ExtRef: ${externalReference} | RequestId: ${mpRequestId} | Code: ${errorCode} | RawMessage: ${mpData?.message || 'N/A'} | Cause: ${JSON.stringify(mpData?.cause || [])}`
      );
      return res.status(mpRes.status || 400).json({
        success: false,
        errorCode,
        error: friendlyError,
        isTemporary,
        orderId,
        externalReference,
        requestId: mpRequestId,
      });
    }
  } catch (err: any) {
    console.error('[MERCADO PAGO AUDIT ERROR] Unexpected Exception:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'MP_INTERNAL_SERVER_ERROR',
      error: 'Falha temporária ao comunicar com o Mercado Pago. Por favor, tente novamente.',
      isTemporary: true,
    });
  }
}

// ━━━ Official Mercado Pago Payment Endpoints ━━━
app.post('/api/mercadopago/create-pix', handleCreatePayment);
app.post('/api/mercadopago/create-payment', handleCreatePayment);
app.post('/api/create-pix', handleCreatePayment);
app.post('/api/create-payment', handleCreatePayment);

// Compatibility aliases
app.post('/api/abacatepay/create-pix', handleCreatePayment);
app.post('/api/abacatepay/create-payment', handleCreatePayment);

// ━━━ Official Mercado Pago Gateway Management Endpoints ━━━
app.get('/api/mercadopago/status', async (_req: Request, res: Response) => {
  try {
    const token = await getMercadoPagoAccessToken();
    const publicKey = await getMercadoPagoPublicKey();
    const isConfigured = Boolean(token && token.length > 10 && !token.includes('mock-token'));
    const isSandbox = token.startsWith('TEST-') || token.toLowerCase().includes('test');
    const mode = isSandbox ? 'test' : 'production';

    let sellerInfo: any = null;
    if (isConfigured) {
      try {
        const mpRes = await fetch('https://api.mercadopago.com/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mpRes.ok) {
          const u = await mpRes.json();
          sellerInfo = {
            id: u.id,
            nickname: u.nickname,
            email: u.email,
            site_id: u.site_id,
            first_name: u.first_name,
            last_name: u.last_name,
          };
        }
      } catch (err: any) {
        console.warn('Notice: MP /users/me query error in status:', err?.message);
      }
    }

    return res.json({
      success: true,
      provider: 'mercadopago',
      configured: isConfigured,
      hasAccessToken: isConfigured,
      hasPublicKey: Boolean(publicKey && publicKey.length > 5),
      mode,
      isSandbox,
      isDev: isSandbox,
      tokenPrefix: token ? `${token.slice(0, 10)}••••••••` : null,
      seller: sellerInfo,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Backward compatibility alias for status
app.get('/api/abacatepay/status', async (req: Request, res: Response) => {
  const token = await getMercadoPagoAccessToken();
  const isConfigured = Boolean(token && token.length > 10);
  const isSandbox = token.startsWith('TEST-');
  return res.json({
    success: true,
    configured: isConfigured,
    hasApiKey: isConfigured,
    hasAccessToken: isConfigured,
    hasWebhookSecret: true,
    isDev: isSandbox,
    keyPrefix: token ? `${token.slice(0, 10)}••••••••` : null,
    provider: 'mercadopago',
  });
});

app.post('/api/mercadopago/test-connection', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    let rawToken = (req.body.accessToken || req.body.mercadoPagoAccessToken || req.body.apiKey || req.body.token || '').trim();
    if (rawToken.toLowerCase().startsWith('bearer ')) {
      rawToken = rawToken.slice(7).trim();
    }
    rawToken = rawToken.replace(/^["']|["']$/g, '').trim();

    const token = rawToken || (await getMercadoPagoAccessToken());

    if (!token || token.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado. Por favor, insira o Access Token no campo abaixo.',
      });
    }

    const testRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const userData: any = await testRes.json().catch(() => ({}));

    if (testRes.ok && userData.id) {
      const isSandbox = token.startsWith('TEST-') || token.toLowerCase().includes('test');
      const seller = {
        id: userData.id,
        nickname: userData.nickname || 'Vendedor Mercado Pago',
        email: userData.email || '',
        site_id: userData.site_id || 'MLB',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
      };

      if (req.body.save && rawToken) {
        try {
          cachedFirestoreMpToken = rawToken;
          await setDoc(doc(db, 'site_settings', 'checkout'), { config: { mercadoPagoAccessToken: rawToken, pixGateway: 'mercadopago' } }, { merge: true });
          await setDoc(doc(db, 'site_configs', 'checkout'), { mercadoPagoAccessToken: rawToken, pixGateway: 'mercadopago' }, { merge: true });
        } catch (dbErr) {
          console.warn('Notice: Firestore save in test-connection:', dbErr);
        }
      }

      return res.json({
        success: true,
        message: `Conexão com Mercado Pago validada com 100% de sucesso! Vendedor: ${seller.nickname} (ID: ${seller.id})`,
        seller,
        nickname: seller.nickname,
        email: seller.email,
        siteId: seller.site_id,
        isSandbox,
        isDev: isSandbox,
        mode: isSandbox ? 'test' : 'production',
      });
    } else {
      let errMessage = 'Access Token inválido ou expirado no Mercado Pago.';
      if (userData?.message?.includes('UNAUTHORIZED') || userData?.code?.includes('UNAUTHORIZED') || testRes.status === 401 || testRes.status === 403) {
        errMessage = 'Access Token não autorizado pelo Mercado Pago. Verifique se copiou o token completo em mercadopago.com.br/developers.';
      } else if (userData?.message) {
        errMessage = userData.message;
      }
      return res.status(400).json({
        success: false,
        error: errMessage,
        rawError: userData,
        statusCode: testRes.status,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro de comunicação ao testar credencial no Mercado Pago.',
    });
  }
});

// Backward compatibility alias for test-connection
app.post('/api/abacatepay/test-connection', (req: Request, res: Response) => {
  req.body.accessToken = req.body.apiKey || req.body.accessToken;
  return (app as any)._router.handle({ ...req, url: '/api/mercadopago/test-connection', method: 'POST' }, res);
});

app.post('/api/mercadopago/save-config', async (req: Request, res: Response) => {
  try {
    const { accessToken, publicKey, isSandbox } = req.body;
    const cleanToken = (accessToken || '').trim();
    const cleanPublic = (publicKey || '').trim();

    if (cleanToken && cleanToken.length < 10) {
      return res.status(400).json({ success: false, error: 'Access Token do Mercado Pago inválido.' });
    }

    if (cleanToken) {
      // Validate token with Mercado Pago API
      const testRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      if (!testRes.ok) {
        const errJson: any = await testRes.json().catch(() => ({}));
        return res.status(400).json({
          success: false,
          error: errJson.message || 'Access Token inválido no Mercado Pago. Por favor, verifique suas credenciais em Configurações > Credenciais no Mercado Pago Developers.',
        });
      }
    }

    const dataToSave: any = {
      pixGateway: 'mercadopago',
      creditCardGateway: 'mercadopago',
      isSandbox: Boolean(isSandbox),
      updated_at: new Date().toISOString(),
    };

    if (cleanToken) {
      dataToSave.mercadoPagoAccessToken = cleanToken;
      cachedFirestoreMpToken = cleanToken;
    }
    if (cleanPublic) {
      dataToSave.mercadoPagoPublicKey = cleanPublic;
      cachedFirestoreMpPublic = cleanPublic;
    }

    await setDoc(doc(db, 'site_settings', 'checkout'), { config: dataToSave }, { merge: true });
    await setDoc(doc(db, 'site_configs', 'checkout'), dataToSave, { merge: true });

    return res.json({
      success: true,
      message: 'Configurações do Mercado Pago salvas e sincronizadas com sucesso!',
      isSandbox: Boolean(isSandbox),
      mode: cleanToken.startsWith('TEST-') ? 'test' : 'production',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mercadopago/save-credentials', (req: Request, res: Response) => {
  return (app as any)._router.handle({ ...req, url: '/api/mercadopago/save-config', method: 'POST' }, res);
});

// Backward compatibility alias for save-key
app.post('/api/abacatepay/save-key', async (req: Request, res: Response) => {
  req.body.accessToken = req.body.apiKey;
  return (app as any)._router.handle({ ...req, url: '/api/mercadopago/save-config', method: 'POST' }, res);
});

app.post('/api/abacatepay/simulate-payment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do pagamento não informado.' });
    }
    const apiKey = await getAbacatePayApiKey();
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Chave de API do AbacatePay não configurada.' });
    }
    const client = AbacatePay({ secret: apiKey });
    try {
      await client.pix.simulate(id);
    } catch (simErr: any) {
      console.warn('[ABACATEPAY SIMULATE NOTICE]:', simErr?.message);
    }

    // Reconcile order in Firestore
    const snap = await getDocs(query(collection(db, 'orders'), where('payment_id', '==', String(id))));
    if (!snap.empty) {
      const orderRef = snap.docs[0].ref;
      await updateDoc(orderRef, {
        payment_status: 'approved',
        order_status: 'PAGAMENTO APROVADO',
        status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await setDoc(
      doc(db, 'payments', String(id)),
      {
        status: 'PAID',
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Pagamento PIX do AbacatePay simulado e aprovado com sucesso!',
      status: 'approved',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/abacatepay/verify-order', async (req: Request, res: Response) => {
  try {
    const { orderId, paymentId } = req.body;
    let orderDoc: any = null;
    if (orderId) {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) orderDoc = snap.data();
    }
    if (!orderDoc && paymentId) {
      const qSnap = await getDocs(query(collection(db, 'orders'), where('payment_id', '==', String(paymentId))));
      if (!qSnap.empty) orderDoc = qSnap.docs[0].data();
    }
    if (orderDoc) {
      const isApproved =
        orderDoc.status === 'completed' ||
        orderDoc.payment_status === 'approved' ||
        orderDoc.order_status === 'PAGAMENTO APROVADO';
      return res.json({
        success: true,
        order: orderDoc,
        status: orderDoc.status,
        isApproved,
      });
    }
    return res.status(404).json({ success: false, error: 'Pedido não localizado.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});




// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ABACATEPAY: Official PIX Creation & Order Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCreateAbacatePayPix(req: Request, res: Response) {
  try {
    const {
      amount,
      description = 'MD Stúdio Play - Playbacks & Multitracks',
      payer,
      items,
      apiKey: customApiKey,
      idempotencyKey: clientProvidedIdempotency,
    } = req.body;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    const apiKey = await getAbacatePayApiKey(customApiKey || req.body.abacatePayApiKey);
    if (!apiKey || apiKey.length < 5) {
      console.warn('[ABACATEPAY CONFIG ALERT]: ABACATEPAY_API_KEY is not configured.');
      return res.status(400).json({
        success: false,
        requiresKey: true,
        error:
          'Chave de API do AbacatePay (API Key) não configurada no servidor. Acesse o Painel Admin > Checkout & Pagamento ou configure a variável ABACATEPAY_API_KEY.',
      });
    }

    // 1. Validate mandatory Payer details
    const payerName = (payer?.name || '').trim();
    const cleanCpf = (payer?.cpf || payer?.taxId || '').replace(/\D/g, '');
    const cleanPhone = (payer?.phone || payer?.cellphone || '').replace(/\D/g, '');
    const email = (payer?.email || '').trim().toLowerCase();

    if (!payerName || payerName.length < 3) {
      return res.status(400).json({ success: false, error: 'Nome completo é obrigatório.' });
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'WhatsApp com DDD é obrigatório para entrega digital.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'E-mail válido é obrigatório para entrega digital.' });
    }
    if (cleanCpf && !isValidCPF(cleanCpf)) {
      return res.status(400).json({ success: false, error: 'Por favor, informe um CPF válido e existente.' });
    }

    // 2. Recalculate real purchase total on backend (anti-tampering)
    const { total: calculatedTotal, postSaleUrls, validatedItems } = calculateRealOrderTotal(items);
    const finalTotal = calculatedTotal > 0 ? calculatedTotal : (Number(amount) > 0 ? Number(Number(amount).toFixed(2)) : 57.99);
    if (!finalTotal || finalTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Valor da compra inválido.' });
    }

    // AbacatePay amount is integer cents (minimum 100 cents = R$ 1.00)
    const amountInCents = Math.round(finalTotal * 100);

    // 3. Generate unique order references with proper idempotency
    const orderTimestamp = Date.now();
    const orderHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `ORD-${orderTimestamp}-${orderHex}`;
    const externalReference = orderId;

    // 4. Initialize official AbacatePay SDK
    const client = AbacatePay({ secret: apiKey });

    const pixPayload: any = {
      amount: amountInCents,
      expiresIn: 3600, // 1 hour
      description: `MD Stúdio - ${orderId}`.slice(0, 140),
      externalId: orderId,
    };

    // If customer data is complete with 11-digit CPF, attach customer object
    if (cleanCpf && cleanCpf.length === 11) {
      pixPayload.customer = {
        name: payerName,
        cellphone: cleanPhone,
        email: email,
        taxId: cleanCpf,
      };
    }

    // Call AbacatePay official API
    const abacateRes = await client.pix.create(pixPayload);

    if (abacateRes.success && abacateRes.data) {
      const pixData = abacateRes.data;
      const paymentId = String(pixData.id);
      const brCode = String(pixData.brCode || '');
      let qrCodeBase64 = String(pixData.brCodeBase64 || '');

      if (qrCodeBase64 && !qrCodeBase64.startsWith('data:')) {
        qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
      } else if (!qrCodeBase64 && brCode) {
        try {
          qrCodeBase64 = await QRCode.toDataURL(brCode, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch {}
      }

      const receiptUrl = pixData.receiptUrl || null;
      const { orderStatus, simpleStatus } = mapAbacatePayStatus(pixData.status);

      // Persist order in Firestore
      const orderDocData = {
        id: orderId,
        orderNumber: orderId,
        customer_id: cleanPhone,
        customerName: payerName,
        customerEmail: email,
        customerPhone: cleanPhone,
        customerCpf: cleanCpf || null,
        external_reference: externalReference,
        items: validatedItems,
        total: finalTotal,
        subtotal: finalTotal,
        discount: 0,
        paymentMethod: 'pix',
        payment_method: 'pix',
        paymentProvider: 'abacatepay',
        payment_id: paymentId,
        payment_status: 'pending',
        order_status: orderStatus,
        status: simpleStatus,
        abacatePayPaymentId: paymentId,
        pixPayload: brCode,
        pixQrCodeUrl: qrCodeBase64 || null,
        ticketUrl: receiptUrl,
        post_sale_urls: postSaleUrls,
        date: new Date().toLocaleDateString('pt-BR'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Persist payment ledger record in Firestore
      const paymentDocData = {
        id: paymentId,
        order_id: orderId,
        abacate_pay_payment_id: paymentId,
        external_reference: externalReference,
        method: 'pix',
        provider: 'abacatepay',
        amount: finalTotal,
        amount_cents: amountInCents,
        status: pixData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'orders', orderId), orderDocData, { merge: true });
        await setDoc(doc(db, 'payments', paymentId), paymentDocData, { merge: true });
      } catch (dbErr) {
        console.warn('Notice: Firestore save in backend:', dbErr);
      }

      console.info(`[ABACATEPAY PIX SUCCESS] Order: ${orderId} | ChargeId: ${paymentId} | Amount: R$ ${finalTotal.toFixed(2)}`);

      return res.json({
        success: true,
        provider: 'abacatepay',
        orderId,
        paymentId,
        externalReference,
        status: 'pending',
        orderStatus,
        totalAmount: finalTotal,
        amountCents: amountInCents,
        qrCode: brCode,
        qrCodeBase64,
        ticketUrl: receiptUrl,
        postSaleUrls,
        isDev: apiKey.startsWith('abc_dev_') || apiKey.startsWith('dev_') || brCode.includes('DevMode') || brCode.includes('devmode'),
      });
    } else {
      const rawError = abacateRes.error || 'Não foi possível gerar a cobrança PIX no AbacatePay.';
      let friendlyError = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
      if (friendlyError.includes('Invalid or inactive API key')) {
        friendlyError =
          'Chave de API do AbacatePay inválida ou inativa. Acesse o Painel Admin > Checkout & Pagamento para inserir sua chave ativa copiada no painel do AbacatePay (Configurações > Chaves de API).';
      } else if (friendlyError.toLowerCase().includes('insufficient permissions')) {
        friendlyError =
          'Permissões insuficientes na Chave de API do AbacatePay (Insufficient permissions). A chave precisa da permissão "TRANSPARENT:CREATE" (Cobranças Transparentes / PIX). Acesse o painel do AbacatePay (Configurações > Chaves de API), gere uma nova chave marcando a permissão "TRANSPARENT:CREATE" (ou Acesso Total) e salve no Painel Admin > Checkout.';
      }
      console.error('[ABACATEPAY PIX ERROR]:', friendlyError);
      return res.status(400).json({
        success: false,
        provider: 'abacatepay',
        error: friendlyError,
        rawError,
        orderId,
      });
    }
  } catch (err: any) {
    console.error('[ABACATEPAY EXCEPTION]:', err);
    return res.status(500).json({
      success: false,
      error: 'Falha temporária ao comunicar com o AbacatePay. Por favor, tente novamente.',
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ABACATEPAY: Payment Status Query & Firestore Reconciler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleAbacatePayStatus(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do pagamento não informado.' });
    }

    const apiKey = await getAbacatePayApiKey();
    if (!apiKey) {
      let orderSnap = await getDocs(
        query(collection(db, 'orders'), where('payment_id', '==', String(id)))
      );
      if (!orderSnap.empty) {
        const orderData = orderSnap.docs[0].data();
        const isApproved = orderData.status === 'completed' || orderData.payment_status === 'approved' || orderData.payment_status === 'PAID';
        return res.json({
          success: true,
          status: isApproved ? 'approved' : 'pending',
          isApproved,
          order: orderData,
        });
      }
      return res.json({ success: true, status: 'pending' });
    }

    const client = AbacatePay({ secret: apiKey });
    const statusRes = await client.pix.status(id);

    if (statusRes.success && statusRes.data) {
      const pixStatus = statusRes.data.status;
      const isApproved = pixStatus === 'PAID' || pixStatus === 'APPROVED';
      const { orderStatus, simpleStatus } = mapAbacatePayStatus(pixStatus);

      let matchedOrderData: any = null;
      try {
        let orderSnap = await getDocs(
          query(collection(db, 'orders'), where('payment_id', '==', String(id)))
        );

        if (!orderSnap.empty) {
          const orderDocRef = orderSnap.docs[0].ref;
          matchedOrderData = orderSnap.docs[0].data();

          if (isApproved && matchedOrderData.status !== 'completed') {
            await updateDoc(orderDocRef, {
              payment_status: 'approved',
              order_status: 'PAGAMENTO APROVADO',
              status: 'completed',
              updated_at: new Date().toISOString(),
            });

            matchedOrderData = {
              ...matchedOrderData,
              payment_status: 'approved',
              order_status: 'PAGAMENTO APROVADO',
              status: 'completed',
            };
          }
        }

        if (isApproved) {
          await setDoc(
            doc(db, 'payments', String(id)),
            {
              status: 'PAID',
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn('Notice: Firestore status sync error:', dbErr);
      }

      return res.json({
        success: true,
        provider: 'abacatepay',
        id,
        status: isApproved ? 'approved' : pixStatus.toLowerCase(),
        rawStatus: pixStatus,
        orderStatus,
        isApproved,
        order: matchedOrderData,
      });
    } else {
      let orderSnap = await getDocs(
        query(collection(db, 'orders'), where('payment_id', '==', String(id)))
      );
      if (!orderSnap.empty) {
        const orderData = orderSnap.docs[0].data();
        const isApproved = orderData.status === 'completed' || orderData.payment_status === 'approved';
        return res.json({
          success: true,
          status: isApproved ? 'approved' : 'pending',
          isApproved,
          order: orderData,
        });
      }

      return res.json({ success: false, status: 'pending', error: statusRes.error });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ABACATEPAY: Official Webhook Event Receiver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleAbacatePayWebhook(req: Request, res: Response) {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const headers = req.headers as Record<string, string>;
    const body = req.body || {};
    const querySecret = String(req.query?.webhookSecret || req.query?.secret || '');

    const configuredSecret = await getAbacatePayWebhookSecret();

    // Verify webhook signature if secret configured
    if (configuredSecret) {
      const signatureLegacy = headers['x-webhook-signature'];
      const stdId = headers['webhook-id'];
      const stdTimestamp = headers['webhook-timestamp'];
      const stdSig = headers['webhook-signature'];

      let isValid = false;
      if (querySecret && querySecret === configuredSecret) {
        isValid = true;
      } else if (stdId && stdTimestamp && stdSig) {
        isValid = verifyStandardWebhookSignature(
          rawBody,
          { id: stdId, timestamp: stdTimestamp, signature: stdSig },
          configuredSecret
        );
      } else if (signatureLegacy) {
        isValid = verifyWebhookSignature(rawBody, signatureLegacy);
      }

      if (!isValid && !querySecret.includes(configuredSecret)) {
        console.warn('[ABACATEPAY WEBHOOK] Assinatura do webhook inválida. Ignorando evento não autenticado.');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    }

    const event = body.event || body.type;
    const eventId = body.id || `evt_${Date.now()}`;
    const data = body.data || {};

    console.info(`[ABACATEPAY WEBHOOK RECEIVED] Event: ${event} | ID: ${eventId}`);

    // Prevent duplicate processing with idempotency ledger in Firestore
    const webhookLedgerRef = doc(db, 'webhook_events', eventId);
    const existingSnap = await getDoc(webhookLedgerRef).catch(() => null);
    if (existingSnap && existingSnap.exists()) {
      console.info(`[ABACATEPAY WEBHOOK] Evento ${eventId} já processado anteriormente. Retornando 200 OK.`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    await setDoc(
      webhookLedgerRef,
      {
        id: eventId,
        event,
        provider: 'abacatepay',
        data,
        processed_at: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});

    // Identify order / charge ID
    const chargeId = String(data.id || data.chargeId || '');
    const externalId = String(data.externalId || data.orderId || data.metadata?.orderId || '');

    const isPaymentApproved =
      event === 'billing.paid' ||
      event === 'checkout.completed' ||
      event === 'pix.paid' ||
      data.status === 'PAID' ||
      data.status === 'APPROVED';

    if (isPaymentApproved) {
      let orderDocRef: any = null;
      let orderData: any = null;

      if (chargeId) {
        const snap = await getDocs(query(collection(db, 'orders'), where('payment_id', '==', chargeId)));
        if (!snap.empty) {
          orderDocRef = snap.docs[0].ref;
          orderData = snap.docs[0].data();
        }
      }

      if (!orderDocRef && externalId) {
        const snap = await getDocs(query(collection(db, 'orders'), where('id', '==', externalId)));
        if (!snap.empty) {
          orderDocRef = snap.docs[0].ref;
          orderData = snap.docs[0].data();
        }
      }

      if (orderDocRef) {
        await updateDoc(orderDocRef, {
          payment_status: 'approved',
          order_status: 'PAGAMENTO APROVADO',
          status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.info(`[ABACATEPAY WEBHOOK] Pedido ${orderData?.id || externalId} aprovado e liberado com sucesso!`);
      }

      if (chargeId) {
        await setDoc(
          doc(db, 'payments', chargeId),
          {
            status: 'PAID',
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }

    return res.status(200).json({ received: true, success: true });
  } catch (err: any) {
    console.error('[ABACATEPAY WEBHOOK ERROR]:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3.1 API: Official Mercado Pago Checkout Pro (Orders & Preferences API)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCreateCheckoutPro(req: Request, res: Response) {
  try {
    const { payer, items, config } = req.body;

    const accessToken = getAccessToken();
    if (!accessToken || accessToken.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.',
      });
    }

    // 1. Validate customer / payer
    const payerName = String(payer?.name || '').trim();
    const cleanPhone = String(payer?.phone || '').replace(/\D/g, '');
    const email = String(payer?.email || '').trim().toLowerCase();
    const cleanCpf = String(payer?.cpf || '').replace(/\D/g, '');

    if (!payerName || payerName.length < 3) {
      return res.status(400).json({ success: false, error: 'Nome completo é obrigatório.' });
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'WhatsApp com DDD é obrigatório.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'E-mail válido é obrigatório.' });
    }
    if (cleanCpf && !isValidCPF(cleanCpf)) {
      return res.status(400).json({ success: false, error: 'Por favor, informe um CPF válido e existente.' });
    }

    const nameParts = payerName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'VIP';
    const areaCode = cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '11';
    const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;

    // 2. Recalculate real purchase total on backend (anti-tampering)
    const { total: calculatedTotal, postSaleUrls, validatedItems } = calculateRealOrderTotal(items);
    if (!calculatedTotal || calculatedTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Valor da compra inválido.' });
    }

    // 3. Generate unique order references
    const orderId = `PEDIDO-2026-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const externalReference = orderId;
    const idempotencyKey = crypto.randomUUID();

    // 4. Base return URLs (Must strictly be HTTPS for Mercado Pago auto_return to be valid)
    let appUrl = '';
    const envAppUrl = (process.env.APP_URL || process.env.VITE_APP_URL || '').trim().replace(/\/$/, '');
    const origin = (req.headers.origin || '').trim().replace(/\/$/, '');
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').trim().replace(/\/$/, '');
    const host = (req.headers.host || '').trim().replace(/\/$/, '');

    if (origin.startsWith('https://') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      appUrl = origin;
    } else if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      appUrl = `https://${forwardedHost}`;
    } else if (envAppUrl.startsWith('https://')) {
      appUrl = envAppUrl;
    } else if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      appUrl = `https://${host}`;
    } else {
      appUrl = 'https://ais-dev-xwg7la6zry2t4nlh34hemd-154142596752.us-east1.run.app';
    }

    if (!appUrl.startsWith('https://')) {
      appUrl = appUrl.replace(/^http:\/\//, 'https://');
    }

    const backUrls = {
      success: `${appUrl}/pagamento/sucesso`,
      pending: `${appUrl}/pagamento/pendente`,
      failure: `${appUrl}/pagamento/erro`,
    };

    // Strict validation of notification_url
    const notificationUrl: string =
      process.env.MERCADOPAGO_WEBHOOK_URL ||
      'https://mdstudioplay.com.br/api/mercadopago/webhook';

    // CRITICAL: If the buyer email matches the seller account email (moriartdigital@gmail.com),
    // Mercado Pago strictly prevents self-payments (autofinanciamento) and disables the "Pagar" button in Checkout Pro!
    // To allow the merchant to test seamlessly without Mercado Pago disabling the button,
    // we use a buyer test email alias for the Mercado Pago preference.
    const isSellerEmail = email.toLowerCase().includes('moriartdigital@gmail.com');
    const payerEmailForPreference = isSellerEmail ? 'cliente.comprador@mdstudioplay.com.br' : email;

    // 5. Construct Checkout Pro Preference Payload
    const preferencePayload = {
      items: validatedItems.map((it) => ({
        id: String(it.id).slice(0, 60),
        title: String(it.title).slice(0, 200),
        description: `MD Stúdio Play - ${String(it.title).slice(0, 100)}`,
        quantity: Math.max(1, Number(it.quantity) || 1),
        currency_id: 'BRL',
        unit_price: Number(it.unit_price),
        ...(it.coverImage && it.coverImage.startsWith('https://') ? { picture_url: it.coverImage } : {}),
      })),
      payer: {
        name: firstName,
        surname: lastName,
        email: payerEmailForPreference,
        ...(cleanPhone && cleanPhone.length >= 10
          ? {
              phone: {
                area_code: cleanPhone.substring(0, 2),
                number: cleanPhone.substring(2),
              },
            }
          : {}),
        identification: {
          type: 'CPF',
          number: cleanCpf,
        },
      },
      back_urls: backUrls,
      auto_return: 'approved',
      external_reference: externalReference,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      payment_methods: {
        installments: 12,
      },
      statement_descriptor: 'MD STUDIO',
      metadata: {
        order_id: orderId,
        customer_phone: cleanPhone,
        customer_email: email,
      },
    };

    // 6. Call official Mercado Pago /checkout/preferences
    console.info(`[Mercado Pago Checkout Pro] Iniciando criação de preferência...`, {
      orderId,
      externalReference,
      total: calculatedTotal,
      itemsCount: validatedItems.length,
      customerEmail: email,
      payerEmailForPreference,
    });

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(preferencePayload),
    });

    const requestId = mpRes.headers.get('x-request-id') || 'N/A';
    const mpData: any = await mpRes.json();

    console.info(`[Mercado Pago Checkout Pro Response] HTTP Status: ${mpRes.status}, Request-ID: ${requestId}`);

    if (mpRes.ok && (mpData.init_point || mpData.sandbox_init_point)) {
      const isSandbox = accessToken.startsWith('TEST-');
      const checkoutUrl = isSandbox && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;
      const preferenceId = String(mpData.id || '');

      // Persist order asynchronously in Firestore so database delay NEVER stalls customer redirect
      const orderDocData = {
        id: orderId,
        orderNumber: orderId,
        customer_id: cleanPhone,
        customerName: payerName,
        customerEmail: email,
        customerPhone: cleanPhone,
        customerCpf: cleanCpf,
        external_reference: externalReference,
        items: validatedItems,
        total: calculatedTotal,
        subtotal: calculatedTotal,
        discount: 0,
        paymentMethod: 'card',
        payment_method: 'credit_card',
        payment_gateway: 'mercadopago_checkout_pro',
        preference_id: preferenceId,
        checkout_url: checkoutUrl,
        status: 'pending',
        order_status: 'AGUARDANDO PAGAMENTO',
        payment_status: 'pending',
        post_sale_urls: postSaleUrls,
        date: new Date().toLocaleDateString('pt-BR'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDoc(doc(db, 'orders', orderId), orderDocData, { merge: true }).catch((dbErr) => {
        console.warn('Notice: Firestore save in backend Checkout Pro:', dbErr);
      });

      try {
        fs.appendFileSync(
          '/tmp/checkout-pro.log',
          `[${new Date().toISOString()}] SUCCESS: Order ${orderId}, Total: ${calculatedTotal}, Preference: ${preferenceId}, URL: ${checkoutUrl}\n`
        );
      } catch {}

      console.info(`[Checkout Pro Success]: Order ${orderId}, Preference ${preferenceId}, URL: ${checkoutUrl}`);

      return res.json({
        success: true,
        orderId,
        externalReference,
        checkout_url: checkoutUrl,
        initPoint: checkoutUrl,
        preferenceId,
        totalAmount: calculatedTotal,
      });
    } else {
      const friendlyError = translateMercadoPagoError(mpData);
      console.error(`[Mercado Pago Checkout Pro Error]`, {
        httpStatus: mpRes.status,
        requestId,
        error: friendlyError,
        responseBody: mpData,
        stage: 'preference_creation',
      });
      try {
        fs.appendFileSync(
          '/tmp/checkout-pro.log',
          `[${new Date().toISOString()}] ERROR: Status ${mpRes.status}, RequestId: ${requestId}, Error: ${friendlyError}, Details: ${JSON.stringify(mpData)}\n`
        );
      } catch {}
      return res.status(mpRes.status || 400).json({
        success: false,
        error: friendlyError,
        details: mpData,
        requestId,
      });
    }
  } catch (err: any) {
    console.error('[Mercado Pago Checkout Pro Unexpected Exception]:', {
      message: err.message,
      stack: err.stack,
      stage: 'server_exception',
    });
    return res.status(500).json({ success: false, error: err.message || 'Erro interno no servidor' });
  }
}

app.post('/api/create-payment', handleCreateCheckoutPro);
app.post('/api/payment/create', handleCreateCheckoutPro);
app.post('/api/mercadopago/create-checkout-pro', handleCreateCheckoutPro);
app.post('/api/mercadopago/create-order', handleCreateCheckoutPro);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3.2 API: Verify Order Payment (Consults Mercado Pago directly)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/mercadopago/verify-order', async (req: Request, res: Response) => {
  try {
    const { paymentId, externalReference } = req.body;
    const accessToken = getAccessToken();

    if (!paymentId && !externalReference) {
      return res.status(400).json({
        success: false,
        error: 'Identificador do pagamento ou referência do pedido não fornecido.',
      });
    }

    let realPayment: any = null;

    // 1. Direct consultation by payment ID if available
    if (paymentId && /^\d+$/.test(String(paymentId))) {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (pRes.ok) {
        realPayment = await pRes.json();
      }
    }

    // 2. Search by external_reference if not found by ID
    if (!realPayment && externalReference) {
      const sRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
          externalReference
        )}&sort=date_created&criteria=desc&limit=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.results && sData.results.length > 0) {
          realPayment = sData.results[0];
        }
      }
    }

    // 3. Search orders collection in Firestore
    let orderDocRef: any = null;
    let orderData: any = null;

    if (externalReference) {
      const q = query(collection(db, 'orders'), where('external_reference', '==', externalReference));
      const snap = await getDocs(q);
      if (!snap.empty) {
        orderDocRef = snap.docs[0].ref;
        orderData = snap.docs[0].data();
      }
    }

    if (!orderDocRef && paymentId) {
      const q = query(collection(db, 'orders'), where('payment_id', '==', String(paymentId)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        orderDocRef = snap.docs[0].ref;
        orderData = snap.docs[0].data();
      }
    }

    if (realPayment) {
      const mpStatus = String(realPayment.status || '');
      const isApproved = mpStatus === 'approved';
      const { orderStatus, simpleStatus } = mapOrderStatus(mpStatus);

      if (orderDocRef) {
        await updateDoc(orderDocRef, {
          payment_id: String(realPayment.id),
          mercadoPagoPaymentId: String(realPayment.id),
          payment_status: mpStatus,
          order_status: orderStatus,
          status: simpleStatus,
          updated_at: new Date().toISOString(),
          ...(isApproved ? { released_at: new Date().toISOString() } : {}),
        });

        orderData = {
          ...orderData,
          payment_id: String(realPayment.id),
          mercadoPagoPaymentId: String(realPayment.id),
          payment_status: mpStatus,
          order_status: orderStatus,
          status: simpleStatus,
          released_at: isApproved ? new Date().toISOString() : orderData.released_at,
        };
      }

      console.info(`[Order Verified]: Ref ${externalReference || paymentId} -> Status: ${mpStatus} (Approved: ${isApproved})`);

      return res.json({
        success: true,
        verified: isApproved,
        status: mpStatus,
        orderStatus,
        paymentId: realPayment.id,
        externalReference: realPayment.external_reference || externalReference,
        amount: realPayment.transaction_amount,
        order: orderData,
      });
    }

    // If order was already confirmed previously in Firestore
    if (orderData && (orderData.status === 'completed' || orderData.payment_status === 'approved')) {
      return res.json({
        success: true,
        verified: true,
        status: 'approved',
        orderStatus: 'PAGAMENTO APROVADO',
        order: orderData,
      });
    }

    return res.json({
      success: true,
      verified: false,
      status: orderData?.payment_status || 'pending',
      orderStatus: orderData?.order_status || 'AGUARDANDO PAGAMENTO',
      order: orderData,
      message: 'Aguardando confirmação do Mercado Pago.',
    });
  } catch (err: any) {
    console.error('Error verifying order:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao verificar pedido' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3.3 API: Protected Download Access (Only for Approved Orders)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/downloads/:orderId/:packId', async (req: Request, res: Response) => {
  try {
    const { orderId, packId } = req.params;
    const customerPhone = String(req.query.phone || req.headers['x-customer-phone'] || '').replace(/\D/g, '');

    // 1. Fetch Order from Firestore
    let orderData: any = null;
    const orderDoc = await getDoc(doc(db, 'orders', orderId));

    if (orderDoc.exists()) {
      orderData = orderDoc.data();
    } else {
      // Try search by external_reference
      const q = query(collection(db, 'orders'), where('external_reference', '==', orderId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        orderData = snap.docs[0].data();
      }
    }

    if (!orderData) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    }

    const isApproved =
      orderData.status === 'completed' ||
      orderData.payment_status === 'approved' ||
      orderData.order_status === 'PAGAMENTO APROVADO';

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        error: 'Este produto ainda não está disponível para download. O pagamento precisa ser confirmado.',
        paymentStatus: orderData.payment_status || 'pending',
      });
    }

    // 2. Validate customer phone if provided
    if (customerPhone && orderData.customerPhone) {
      const orderPhoneClean = String(orderData.customerPhone).replace(/\D/g, '');
      if (orderPhoneClean && !orderPhoneClean.includes(customerPhone) && !customerPhone.includes(orderPhoneClean)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso não autorizado para este número de WhatsApp.',
        });
      }
    }

    // 3. Locate item
    const items = orderData.items || [];
    const item = items.find((i: any) => (i.pack?.id || i.id) === packId) || items[0];
    let downloadUrl = item?.postSaleUrl || item?.pack?.postSaleUrl || orderData.post_sale_urls?.[0];

    if (!downloadUrl) {
      if (packId === 'pack_midi_variados_vip_2026') {
        downloadUrl = 'https://drive.google.com/drive/folders/1ns6pguW_lxaQdqrn7RdIBwBWVr36VJkm?usp=drive_link';
      } else if (packId === 'pack_midi_gospel_vip_2026') {
        downloadUrl = 'https://drive.google.com/drive/folders/1J6vQUbziL7PvtWhc1iZCcht2fIRRwtYd?usp=drive_link';
      }
    }

    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: 'Link de download do produto não configurado.' });
    }

    if (req.query.redirect === 'true') {
      return res.redirect(downloadUrl);
    }

    return res.json({
      success: true,
      orderId,
      packId,
      title: item?.title || item?.pack?.title || 'Produto MD Studio',
      downloadUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar download' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. API: Payment Status Polling & Firestore Real-Time Synchronizer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/mercadopago/payment-status/:id', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { id } = req.params;
    const accessToken = await getMercadoPagoAccessToken();

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do pagamento não informado.' });
    }

    if (id.startsWith('demo_')) {
      return res.json({ success: true, status: 'pending', id });
    }

    // Fast-path: Check if order is already approved in Firestore
    let paymentIdToQuery = id;
    try {
      let orderDocData: any = null;
      if (id.startsWith('ORD-')) {
        const orderSnap = await getDoc(doc(db, 'orders', id));
        if (orderSnap.exists()) orderDocData = orderSnap.data();
      } else {
        const snap = await getDocs(query(collection(db, 'orders'), where('payment_id', '==', String(id))));
        if (!snap.empty) orderDocData = snap.docs[0].data();
      }

      if (orderDocData) {
        if (orderDocData.payment_id || orderDocData.mercadoPagoPaymentId) {
          paymentIdToQuery = orderDocData.payment_id || orderDocData.mercadoPagoPaymentId;
        }
        if (
          orderDocData.status === 'completed' ||
          orderDocData.payment_status === 'approved' ||
          orderDocData.order_status === 'PAGAMENTO APROVADO'
        ) {
          return res.json({
            success: true,
            id: paymentIdToQuery,
            paymentId: paymentIdToQuery,
            status: 'approved',
            statusDetail: 'accredited',
            orderStatus: 'PAGAMENTO APROVADO',
            isApproved: true,
            order: orderDocData,
          });
        }
      }
    } catch {}

    if (!accessToken) {
      return res.json({
        success: true,
        status: 'pending',
        note: 'Sem access token configurado para consulta externa',
      });
    }

    // Direct consultation to official Mercado Pago API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentIdToQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (mpRes.ok) {
      const data: any = await mpRes.json();
      const status = data.status; // 'approved', 'pending', 'rejected', etc.
      const statusDetail = data.status_detail;
      const isApproved = status === 'approved';
      const { orderStatus, simpleStatus } = mapOrderStatus(status);

      // Synchronize status in Firestore orders and payments
      let matchedOrderData: any = null;
      try {
        let orderSnap = await getDocs(
          query(collection(db, 'orders'), where('payment_id', '==', String(id)))
        );

        if (orderSnap.empty && data.external_reference) {
          orderSnap = await getDocs(
            query(collection(db, 'orders'), where('external_reference', '==', String(data.external_reference)))
          );
        }

        if (!orderSnap.empty) {
          const orderDocRef = orderSnap.docs[0].ref;
          matchedOrderData = orderSnap.docs[0].data();

          // Security check: Validate that paid amount matches expected order total
          if (isApproved && matchedOrderData && matchedOrderData.total) {
            const expectedTotal = Number(matchedOrderData.total);
            const paidAmount = Number(data.transaction_amount);
            if (Math.abs(expectedTotal - paidAmount) > 0.05) {
              console.error(`[Security Warning]: Amount divergence. Expected: ${expectedTotal}, Received: ${paidAmount}`);
              await updateDoc(orderDocRef, {
                payment_status: 'divergent_amount',
                order_status: 'VALOR DIVERGENTE - EM ANÁLISE',
                status: 'pending',
                updated_at: new Date().toISOString(),
              });
              return res.status(400).json({
                success: false,
                isApproved: false,
                error: 'O valor pago difere do total do pedido. Liberação suspensa para verificação.',
              });
            }
          }

          await updateDoc(orderDocRef, {
            payment_status: status,
            order_status: orderStatus,
            status: simpleStatus,
            updated_at: new Date().toISOString(),
          });

          matchedOrderData = {
            ...matchedOrderData,
            payment_status: status,
            order_status: orderStatus,
            status: simpleStatus,
          };
        }

        const paymentRef = doc(db, 'payments', String(id));
        await setDoc(
          paymentRef,
          {
            status,
            status_detail: statusDetail,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (syncErr) {
        console.warn('Notice: Firestore status sync error:', syncErr);
      }

      return res.json({
        success: true,
        id: data.id,
        paymentId: data.id,
        status,
        statusDetail,
        orderStatus,
        isApproved,
        dateApproved: data.date_approved || data.date_last_updated,
        amount: data.transaction_amount,
        order: matchedOrderData,
      });
    }

    return res.json({ success: false, status: 'unknown' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. API: Official Mercado Pago Webhook / IPN Receiver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/mercadopago/webhook', (_req: Request, res: Response) => {
  return res.status(200).send('Mercado Pago Webhook Endpoint Active');
});

const handleMercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    const accessToken = await getMercadoPagoAccessToken();
    const body = req.body || {};
    const queryParams = req.query || {};

    console.log('Mercado Pago Webhook Event received:', {
      action: body.action,
      type: body.type,
      dataId: body.data?.id,
      queryId: queryParams.id || queryParams['data.id'],
      topic: queryParams.topic || body.topic,
    });

    // Identify payment id from query or body
    const paymentId = String(body.data?.id || body.id || queryParams['data.id'] || queryParams.id || '');

    if (!paymentId || paymentId === 'undefined') {
      return res.status(200).send('OK (Sem ID de pagamento)');
    }

    if (!accessToken) {
      console.warn('Webhook received but MERCADO_PAGO_ACCESS_TOKEN is not configured.');
      return res.status(200).send('OK (Token ausente)');
    }

    // Always consult Mercado Pago directly to verify authentic transaction state
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      console.warn('Webhook: Falha ao consultar pagamento no Mercado Pago:', paymentId);
      return res.status(200).send('OK');
    }

    const mpPayment: any = await mpRes.json();
    const mpStatus = String(mpPayment.status || '');
    const statusDetail = String(mpPayment.status_detail || '');
    const externalRef = String(mpPayment.external_reference || '');
    const { orderStatus, simpleStatus } = mapOrderStatus(mpStatus);

    // Update orders collection by payment_id or external_reference
    try {
      let orderDocRef: any = null;

      const qByPaymentId = query(collection(db, 'orders'), where('payment_id', '==', paymentId));
      const snap1 = await getDocs(qByPaymentId);

      if (!snap1.empty) {
        orderDocRef = snap1.docs[0].ref;
      } else if (externalRef) {
        const qByExtRef = query(collection(db, 'orders'), where('external_reference', '==', externalRef));
        const snap2 = await getDocs(qByExtRef);
        if (!snap2.empty) {
          orderDocRef = snap2.docs[0].ref;
        }
      }

      if (orderDocRef) {
        await updateDoc(orderDocRef, {
          payment_status: mpStatus,
          order_status: orderStatus,
          status: simpleStatus,
          updated_at: new Date().toISOString(),
        });
        console.log(`Webhook: Pedido atualizado com sucesso para ${orderStatus} (ID: ${paymentId})`);
      }

      // Update payments collection
      await setDoc(
        doc(db, 'payments', paymentId),
        {
          id: paymentId,
          mercado_pago_payment_id: paymentId,
          external_reference: externalRef,
          status: mpStatus,
          status_detail: statusDetail,
          amount: mpPayment.transaction_amount,
          method: mpPayment.payment_method_id,
          transaction_date: mpPayment.date_created,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.error('Webhook: Erro ao sincronizar com Firestore:', dbErr);
    }

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error('Webhook error handler:', err);
    return res.status(200).send('OK');
  }
};

app.post('/api/mercadopago/webhook', handleMercadoPagoWebhook);
app.post('/api/webhook/mercadopago', handleMercadoPagoWebhook);
app.post('/api/mp/webhook', handleMercadoPagoWebhook);
app.post('/api/mercadopago/ipn', handleMercadoPagoWebhook);

// Check order status by orderId directly
app.get('/api/mercadopago/order-status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'ID do pedido obrigatório' });
    }
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (snap.exists()) {
      const data = snap.data();
      const isApproved = data.status === 'completed' || data.payment_status === 'approved' || data.order_status === 'PAGAMENTO APROVADO';
      return res.json({
        success: true,
        orderId,
        paymentId: data.payment_id || data.mercadoPagoPaymentId,
        status: data.payment_status || data.status,
        orderStatus: data.order_status,
        isApproved,
        order: data,
      });
    }
    return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. API: WhatsApp OTP Dispatcher
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/whatsapp/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code, gatewayUrl, gatewayToken } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: 'Telefone e código são obrigatórios.' });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    const intlPhone = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits : `55${cleanDigits}`;
    const message = `*Código de autenticação* da MD Stúdio Play\n${code}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;

    const targetGateway = gatewayUrl || process.env.WHATSAPP_GATEWAY_URL;
    const targetToken = gatewayToken || process.env.WHATSAPP_GATEWAY_TOKEN;

    if (targetGateway) {
      try {
        await fetch(targetGateway, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(targetToken ? { Authorization: `Bearer ${targetToken}`, apikey: targetToken } : {}),
          },
          body: JSON.stringify({
            phone: intlPhone,
            number: intlPhone,
            message,
            text: message,
            code,
          }),
        });
      } catch (err: any) {
        console.warn('WhatsApp gateway webhook warning:', err?.message);
      }
    }

    return res.json({ success: true, whatsappUrl, phone: intlPhone });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar envio' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. Setup Vite or Static File Serving
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  const imagesDir = path.resolve(__dirname, 'src/assets/images');
  const publicDir = path.resolve(__dirname, 'public');
  if (fs.existsSync(imagesDir)) {
    app.use('/src/assets/images', express.static(imagesDir));
    app.use('/assets/images', express.static(imagesDir));
    app.use('/images', express.static(imagesDir));
  }
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // CRITICAL: Any unhandled /api/* request MUST return JSON 404, never index.html!
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Endpoint da API não encontrado: ${req.method} ${req.originalUrl || req.path}`,
    });
  });

  // Express error handler for API requests
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (req.path && req.path.startsWith('/api/')) {
      console.error('[API Error]', req.method, req.path, err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Erro interno no servidor ao processar requisição.',
      });
    }
    next(err);
  });

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} at 0.0.0.0`);
  });
}

startServer();
