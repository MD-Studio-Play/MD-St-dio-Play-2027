import QRCode from 'qrcode';

/**
 * Generates a high-resolution QR Code Data URL from the official Mercado Pago PIX payload.
 * Used for rendering dynamic, instantly reconcilable QR Codes.
 */
export async function generatePixQrCodeDataUrl(payload: string): Promise<string> {
  if (!payload || !payload.trim()) return '';
  try {
    return await QRCode.toDataURL(payload.trim(), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate PIX QR code image:', err);
    return '';
  }
}

/**
 * @deprecated O gerador estático manual foi removido.
 * Os pagamentos PIX são gerados exclusivamente de forma oficial e dinâmica pelo Mercado Pago.
 */
export function generatePixPayload(params: any): string {
  return String(params?.key || '');
}
