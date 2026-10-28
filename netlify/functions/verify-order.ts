// Netlify Serverless Function: verify-order
// Consulta oficial de status de pagamento diretamente na API do Mercado Pago

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

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const query = event.queryStringParameters || {};
    const paymentId = body.paymentId || query.paymentId || query.id;
    const externalReference = body.externalReference || query.externalReference || query.orderId;

    const token = DEFAULT_MP_TOKEN;
    let realPayment: any = null;

    if (paymentId && /^\d+$/.test(String(paymentId))) {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pRes.ok) {
        realPayment = await pRes.json().catch(() => null);
      }
    }

    if (!realPayment && externalReference) {
      const sRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
          externalReference
        )}&sort=date_created&criteria=desc&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (sRes.ok) {
        const sData = await sRes.json().catch(() => ({}));
        if (sData.results && sData.results.length > 0) {
          realPayment = sData.results[0];
        }
      }
    }

    if (realPayment) {
      const mpStatus = String(realPayment.status || '');
      const isApproved = mpStatus === 'approved';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          isApproved,
          status: mpStatus,
          payment: {
            id: realPayment.id,
            status: realPayment.status,
            status_detail: realPayment.status_detail,
            transaction_amount: realPayment.transaction_amount,
            external_reference: realPayment.external_reference,
            date_approved: realPayment.date_approved,
          },
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        isApproved: false,
        status: 'pending',
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err?.message || 'Erro interno' }),
    };
  }
};
