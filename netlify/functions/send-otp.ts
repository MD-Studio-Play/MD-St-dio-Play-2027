// Exact authentication message text requested by user
export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Método não permitido' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { phone, code, gatewayUrl, gatewayToken } = body;

    if (!phone || !code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Telefone e código são obrigatórios.' }),
      };
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    const intlPhone = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits : `55${cleanDigits}`;
    const cleanCode = String(code).trim();

    // Exact format required from WhatsApp screenshot:
    // Header: Código de autenticação MD Studio Play
    // Body: {cleanCode}
    // Action: [ 📋 Copiar código ]
    const message = `Código de autenticação MD Studio Play\n\n*${cleanCode}*\n\n📋 Copiar código`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;

    const targetGateway = gatewayUrl || process.env.WHATSAPP_GATEWAY_URL;
    const targetToken = gatewayToken || process.env.WHATSAPP_GATEWAY_TOKEN;
    const metaToken = process.env.WHATSAPP_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    let dispatched = false;
    let provider = 'fallback';

    // 1. Meta WhatsApp Cloud API
    if (metaToken && metaPhoneId) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${metaToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: intlPhone,
            type: 'text',
            text: {
              preview_url: false,
              body: `Código de autenticação MD Studio Play\n\n\`${cleanCode}\`\n\n📋 Copiar código`,
            },
          }),
        });
        if (metaRes.ok) {
          dispatched = true;
          provider = 'meta_cloud_api';
        }
      } catch (e: any) {
        console.warn('Meta WhatsApp Cloud API error:', e?.message);
      }
    }

    // 2. Custom Gateway (Evolution API, Z-API, n8n webhook)
    if (!dispatched && targetGateway) {
      try {
        const isEvolution = targetGateway.includes('evolution') || targetGateway.includes('/message/');
        let payload: any = {
          number: intlPhone,
          phone: intlPhone,
          message,
          text: message,
          code: cleanCode,
          header: 'Código de autenticação MD Studio Play',
          buttonText: 'Copiar código',
        };

        if (isEvolution) {
          payload = {
            number: intlPhone,
            text: `Código de autenticação MD Studio Play\n\n\`${cleanCode}\``,
            options: { delay: 1000 },
          };
        }

        const gwRes = await fetch(targetGateway, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(targetToken ? { Authorization: `Bearer ${targetToken}`, apikey: targetToken } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (gwRes.ok) {
          dispatched = true;
          provider = 'whatsapp_gateway';
        }
      } catch (gwErr: any) {
        console.warn('WhatsApp gateway webhook error:', gwErr?.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        phone: intlPhone,
        code: cleanCode,
        message: 'Código de autenticação gerado com sucesso.',
        whatsappUrl,
        dispatched,
        provider,
        preview: {
          header: 'Código de autenticação MD Studio Play',
          code: cleanCode,
          buttonText: 'Copiar código',
        },
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Erro ao processar envio do WhatsApp' }),
    };
  }
};
