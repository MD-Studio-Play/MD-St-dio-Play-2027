import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './src/firebase';
import { isValidCPF } from './src/utils/cpfValidator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for all incoming API requests and preflight OPTIONS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper: Retrieve Access Token from environment or config payload
function getAccessToken(clientConfig?: any): string {
  const token =
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    clientConfig?.mercadoPagoAccessToken ||
    clientConfig?.creditCardSecretToken ||
    '';
  return token.trim();
}

// Helper: Retrieve Public Key from environment or config payload
function getPublicKey(clientConfig?: any): string {
  const key =
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    process.env.MERCADO_PAGO_PUBLIC_KEY ||
    process.env.VITE_MERCADOPAGO_PUBLIC_KEY ||
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
    clientConfig?.mercadoPagoPublicKey ||
    '';
  return key.trim();
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

// Helper: Recalculate and validate total purchase value on backend (Anti-Tampering)
function calculateRealOrderTotal(items: any[]): { total: number; postSaleUrls: string[]; validatedItems: any[] } {
  const fallbackItem = {
    id: 'pack_flyer_150_mega',
    title: 'Produto MD Stúdio Play',
    quantity: 1,
    unit_price: 57.99,
    total: 57.99,
    postSaleUrl: null,
    coverImage: null,
  };

  if (!Array.isArray(items) || items.length === 0) {
    return { total: 57.99, postSaleUrls: [], validatedItems: [fallbackItem] };
  }

  let total = 0;
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

    const itemTotal = Number((unitPrice * qty).toFixed(2));
    total += itemTotal;

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

  if (validatedItems.length === 0) {
    validatedItems.push(fallbackItem);
    total = 57.99;
  }

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

// Helper: Translate Mercado Pago error codes & messages to user-friendly Portuguese
function translateMercadoPagoError(mpData: any): string {
  if (!mpData) return 'Falha na comunicação com o Mercado Pago.';

  const causeCode = String(mpData.cause?.[0]?.code || '');
  const causeDesc = String(mpData.cause?.[0]?.description || '');
  const message = String(mpData.message || '');
  const statusDetail = String(mpData.status_detail || '');
  const combined = `${causeCode} ${causeDesc} ${message} ${statusDetail}`.toLowerCase();

  if (combined.includes('3034') || combined.includes('card_number_validation')) {
    return 'Número de cartão inválido ou não autorizado pela conta. Verifique os dados digitados ou utilize o PIX para aprovação imediata.';
  }
  if (combined.includes('2006') || combined.includes('card token not found') || combined.includes('invalid card_token_id') || combined.includes('3003')) {
    return 'Não foi possível validar o token do cartão. Confira os números, validade e CVV ou escolha a opção PIX.';
  }
  if (combined.includes('2010') || combined.includes('security_code') || combined.includes('3000')) {
    return 'Código de segurança (CVV) do cartão inválido.';
  }
  if (combined.includes('2007') || combined.includes('expiration_month') || combined.includes('expiration_year') || combined.includes('3001')) {
    return 'Data de vencimento do cartão inválida ou expirada.';
  }
  if (combined.includes('2005') || combined.includes('installments')) {
    return 'Número de parcelas selecionado inválido.';
  }
  if (combined.includes('4020') || combined.includes('notificaction_url')) {
    return 'URL de notificação de pagamento inválida.';
  }
  if (combined.includes('cc_rejected_insufficient_amount')) {
    return 'Saldo ou limite insuficiente no cartão informado.';
  }
  if (combined.includes('cc_rejected_bad_filled_security_code')) {
    return 'Código de segurança (CVV) incorreto.';
  }
  if (combined.includes('cc_rejected_bad_filled_date')) {
    return 'Data de validade do cartão incorreta.';
  }
  if (combined.includes('cc_rejected_bad_filled_other')) {
    return 'Dados do cartão incorretos. Por favor, confira as informações.';
  }
  if (combined.includes('cc_rejected_call_for_authorize')) {
    return 'Transação bloqueada pela operadora do cartão. Ligue para seu banco ou pague via PIX.';
  }
  if (combined.includes('cc_rejected_other_reason')) {
    return 'Transação não autorizada pela operadora do cartão. Sugerimos pagar via PIX (aprovação em segundos).';
  }

  return causeDesc || message || 'Dados do pagamento não autorizados pelo banco ou operadora. Recomendamos pagar via PIX.';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. API: Mercado Pago Configuration Status (Safe for Frontend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/mercadopago/status', async (_req: Request, res: Response) => {
  const accessToken = getAccessToken();
  const publicKey = getPublicKey();
  const hasToken = Boolean(accessToken && accessToken.length > 10 && !accessToken.includes('mock-token'));
  const isSandbox = accessToken.startsWith('TEST-') || publicKey.startsWith('TEST-');

  if (!hasToken) {
    return res.json({
      configured: false,
      hasAccessToken: false,
      hasPublicKey: Boolean(publicKey),
      isSandbox,
      message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
    });
  }

  try {
    const meRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.ok) {
      const meData: any = await meRes.json();
      return res.json({
        configured: true,
        hasAccessToken: true,
        hasPublicKey: Boolean(publicKey),
        isSandbox,
        isLive: !isSandbox,
        accountNickname: meData.nickname || 'MD Studio',
        siteId: meData.site_id || 'MLB',
        tokenPrefix: accessToken.substring(0, 10) + '...',
        publicKeyPrefix: publicKey ? publicKey.substring(0, 10) + '...' : null,
      });
    }
  } catch {}

  return res.json({
    configured: true,
    hasAccessToken: true,
    hasPublicKey: Boolean(publicKey),
    isSandbox,
    isLive: !isSandbox,
    tokenPrefix: accessToken.substring(0, 10) + '...',
    publicKeyPrefix: publicKey ? publicKey.substring(0, 10) + '...' : null,
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. API: Public Key for MercadoPago.js v2 SDK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/mercadopago/public-key', (_req: Request, res: Response) => {
  const publicKey = getPublicKey();
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
      config,
    } = req.body;

    const accessToken = getAccessToken(config);
    if (!accessToken || accessToken.length < 10 || accessToken.includes('mock-token')) {
      return res.status(400).json({
        success: false,
        requiresToken: true,
        error:
          'Access Token do Mercado Pago não configurado. Adicione MERCADOPAGO_ACCESS_TOKEN no .env ou nas configurações do Painel Admin.',
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
    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const externalReference = `ext_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const idempotencyKey = crypto.randomUUID();

    const isCard = paymentMethodType === 'credit_card' || paymentMethodType === 'card';

    // Strict validation of notification_url to prevent Mercado Pago code 4020 bad_request error
    let notificationUrl: string | undefined = undefined;
    const rawAppUrl = (
      process.env.APP_URL ||
      process.env.VITE_APP_URL ||
      ''
    ).trim().replace(/\/$/, '');

    if (
      rawAppUrl.startsWith('https://') &&
      !rawAppUrl.includes('localhost') &&
      !rawAppUrl.includes('127.0.0.1')
    ) {
      notificationUrl = `${rawAppUrl}/api/mercadopago/webhook`;
    }

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
          const friendlyCardError = translateMercadoPagoError(tokenData);
          console.info(`[Mercado Pago Card Token Notice]: ${friendlyCardError}`);
          return res.status(400).json({
            success: false,
            error: friendlyCardError,
            details: tokenData,
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
        transaction_amount: calculatedTotal,
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
        transaction_amount: calculatedTotal,
        description: description.slice(0, 100),
        payment_method_id: 'pix',
        external_reference: externalReference,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          ...(cleanCpf ? {
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

    const mpData: any = await mpRes.json();

    if (mpRes.ok && mpData.id) {
      const paymentId = String(mpData.id);
      const mpStatus = String(mpData.status || 'pending');
      const statusDetail = String(mpData.status_detail || '');
      const transactionData = mpData.point_of_interaction?.transaction_data;
      const qrCode = transactionData?.qr_code || '';
      const qrCodeBase64 = transactionData?.qr_code_base64 || '';
      const ticketUrl = transactionData?.ticket_url || '';

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
        total: calculatedTotal,
        subtotal: calculatedTotal,
        discount: 0,
        paymentMethod: isCard ? 'card' : 'pix',
        payment_method: isCard ? 'credit_card' : 'pix',
        payment_id: paymentId,
        payment_status: mpStatus,
        order_status: orderStatus,
        status: simpleStatus,
        mercadoPagoPaymentId: paymentId,
        pixPayload: qrCode || null,
        pixQrCodeUrl: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
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
        amount: calculatedTotal,
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
        orderId,
        paymentId,
        externalReference,
        status: mpStatus,
        statusDetail,
        orderStatus,
        totalAmount: calculatedTotal,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        expirationDate: mpData.date_of_expiration,
        postSaleUrls,
      });
    } else {
      const friendlyError = translateMercadoPagoError(mpData);
      console.info(`[Mercado Pago /v1/payments Notice Status ${mpRes.status}]:`, friendlyError);
      return res.status(mpRes.status || 400).json({
        success: false,
        error: friendlyError,
        details: mpData,
      });
    }
  } catch (err: any) {
    console.error('Unexpected error creating Mercado Pago payment:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno no servidor' });
  }
}

app.post('/api/mercadopago/create-payment', handleCreatePayment);
app.post('/api/mercadopago/create-pix', (req: Request, res: Response) => {
  req.body.paymentMethodType = 'pix';
  return handleCreatePayment(req, res);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3.1 API: Official Mercado Pago Checkout Pro (Orders & Preferences API)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCreateCheckoutPro(req: Request, res: Response) {
  try {
    const { payer, items, config } = req.body;

    const accessToken = getAccessToken(config);
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
    let notificationUrl: string | undefined = undefined;
    if (appUrl.startsWith('https://') && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
      notificationUrl = `${appUrl}/api/mercadopago/webhook`;
    }

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
  try {
    const { id } = req.params;
    const accessToken = getAccessToken({ mercadoPagoAccessToken: req.query.token as string });

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do pagamento não informado.' });
    }

    if (id.startsWith('demo_')) {
      return res.json({ success: true, status: 'pending', id });
    }

    if (!accessToken) {
      return res.json({
        success: true,
        status: 'pending',
        note: 'Sem access token configurado para consulta externa',
      });
    }

    // Direct consultation to official Mercado Pago API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (mpRes.ok) {
      const data: any = await mpRes.json();
      const status = data.status; // 'approved', 'pending', 'rejected', etc.
      const statusDetail = data.status_detail;
      const isApproved = status === 'approved';
      const { orderStatus, simpleStatus } = mapOrderStatus(status);

      // Synchronize status in Firestore orders and payments
      try {
        const orderSnap = await getDocs(
          query(collection(db, 'orders'), where('payment_id', '==', String(id)))
        );

        if (!orderSnap.empty) {
          const orderDocRef = orderSnap.docs[0].ref;
          await updateDoc(orderDocRef, {
            payment_status: status,
            order_status: orderStatus,
            status: simpleStatus,
            updated_at: new Date().toISOString(),
          });
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
app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken();
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
      console.warn('Webhook received but MERCADOPAGO_ACCESS_TOKEN is not configured.');
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
