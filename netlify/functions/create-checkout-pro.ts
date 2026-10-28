// Netlify Serverless Function: create-checkout-pro
// Criação de preferência oficial do Mercado Pago para Checkout com Cartão de Crédito

const DEFAULT_MP_TOKEN = 'APP_USR-3016872973673511-102015-1793162807f06f1da8d82aba77c59288-697443735';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const { payer = {}, items = [], mercadoPagoAccessToken } = body;

    const token = mercadoPagoAccessToken && mercadoPagoAccessToken.length > 20 ? mercadoPagoAccessToken : DEFAULT_MP_TOKEN;
    const orderId = `PEDIDO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const cleanCpf = (payer.taxId || payer.cpf || body.taxId || body.cpf || '').replace(/\D/g, '');
    const cleanEmail = (payer.email || body.email || 'cliente@mdstudioplay.com').trim().toLowerCase();
    const cleanPhone = (payer.phone || payer.cellphone || body.phone || '').replace(/\D/g, '');

    const isSeller = cleanEmail.includes('moriartdigital') || cleanEmail.includes('mdstudioplay');
    const safeEmail = isSeller ? 'cliente.comprador@gmail.com' : cleanEmail;

    const nameParts = (payer.name || body.name || 'Cliente VIP').trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'VIP';

    const originUrl = 'https://mdstudioplay.netlify.app';

    // Calcula valor total dos itens
    const validItems = (items || []).map((i: any, idx: number) => ({
      id: String(i.id || `ITEM-${idx + 1}`).slice(0, 50),
      title: String(i.title || 'Produto MD Studio').slice(0, 150),
      quantity: Math.max(1, Number(i.quantity) || 1),
      currency_id: 'BRL',
      unit_price: Number(Number(i.unit_price || 57.99).toFixed(2)),
      ...(i.coverImage && String(i.coverImage).startsWith('https://') ? { picture_url: i.coverImage } : {}),
    }));

    const calculatedTotal = validItems.reduce((acc: number, item: any) => acc + item.unit_price * item.quantity, 0);

    const preferencePayload = {
      items: validItems,
      payer: {
        name: firstName,
        surname: lastName,
        email: safeEmail,
        identification: {
          type: 'CPF',
          number: cleanCpf || '11144477735',
        },
        phone: cleanPhone && cleanPhone.length >= 10 ? {
          area_code: cleanPhone.substring(0, 2),
          number: cleanPhone.substring(2),
        } : undefined,
      },
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }], // Permite Cartão de Crédito e Débito
        installments: 12,
      },
      back_urls: {
        success: `${originUrl}/area-do-cliente?status=sucesso&order_id=${orderId}`,
        pending: `${originUrl}/area-do-cliente?status=pendente&order_id=${orderId}`,
        failure: `${originUrl}/checkout?status=erro&order_id=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      statement_descriptor: 'MD STUDIO',
      notification_url: `${originUrl}/api/mercadopago/webhook`,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData: any = await mpRes.json().catch(() => ({}));

    if (mpRes.ok && (mpData.init_point || mpData.sandbox_init_point)) {
      const isSandbox = token.startsWith('TEST-');
      const checkoutUrl = isSandbox && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          orderId,
          preferenceId: mpData.id,
          checkout_url: checkoutUrl,
          initPoint: checkoutUrl,
          totalAmount: calculatedTotal,
        }),
      };
    }

    return {
      statusCode: mpRes.status || 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: mpData?.message || 'Erro ao gerar preferência de pagamento no Mercado Pago.',
        details: mpData,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err?.message || 'Erro interno no servidor' }),
    };
  }
};
