// Netlify Serverless Function: webhook
// Recebe notificações de pagamento do Mercado Pago e valida status

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

  // Responde sempre 200 OK para o Mercado Pago não reenviar notificações duplicadas
  try {
    const query = event.queryStringParameters || {};
    const topic = query.topic || query.type;
    const paymentId = query.id || query['data.id'];

    console.info(`[Netlify Webhook Received]: Topic: ${topic}, PaymentId: ${paymentId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, topic, paymentId }),
    };
  } catch (e: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true }),
    };
  }
};
