import QRCode from 'qrcode';

/**
 * Calculates CRC-16/CCITT-FALSE (0x1021, init 0xFFFF)
 * as mandated by Brazil Central Bank (Banco Central do Brasil - BCB) for PIX BRCode.
 */
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper to format EMVCo TLV (Tag-Length-Value)
 */
function formatTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cleans string removing accents and special symbols for EMVCo standard
 */
function normalizeAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

export interface PixPayloadParams {
  key: string;
  name: string;
  city: string;
  amount: number;
  txid?: string;
  description?: string;
}

/**
 * Generates an authentic EMVCo BRCode PIX copy-and-paste payload
 * that any banking app in Brazil can read and pay immediately.
 */
export function generatePixPayload({
  key,
  name,
  city,
  amount,
  txid = 'MD' + Math.floor(Math.random() * 1000000).toString(),
  description = 'MD STUDIO PLAY',
}: PixPayloadParams): string {
  const cleanKey = key.trim();
  const cleanName = (normalizeAscii(name) || 'MD STUDIO PLAY').slice(0, 25).toUpperCase();
  const cleanCity = (normalizeAscii(city) || 'SAO PAULO').slice(0, 15).toUpperCase();
  const cleanTxid = (txid.replace(/[^a-zA-Z0-9]/g, '') || '***').slice(0, 25);
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  // ID 26: Merchant Account Information
  const gui = formatTlv('00', 'br.gov.bcb.pix');
  const merchantKey = formatTlv('01', cleanKey);
  const infoDesc = description ? formatTlv('02', description.slice(0, 40)) : '';
  const merchantAccountInfo = formatTlv('26', `${gui}${merchantKey}${infoDesc}`);

  // Base EMV payload
  let payload = '';
  payload += formatTlv('00', '01'); // Payload Format Indicator
  payload += formatTlv('01', '12'); // Point of Initiation (12 = Reusable or Dynamic without URL)
  payload += merchantAccountInfo;
  payload += formatTlv('52', '0000'); // Merchant Category Code
  payload += formatTlv('53', '986'); // Currency BRL
  payload += formatTlv('54', formattedAmount); // Transaction Amount
  payload += formatTlv('58', 'BR'); // Country Code
  payload += formatTlv('59', cleanName); // Merchant Name
  payload += formatTlv('60', cleanCity); // Merchant City

  // ID 62: Additional Data Field (TXID)
  const txidTlv = formatTlv('05', cleanTxid);
  payload += formatTlv('62', txidTlv);

  // ID 63: CRC16 template
  const payloadForChecksum = `${payload}6304`;
  const checksum = calculateCrc16(payloadForChecksum);

  return `${payloadForChecksum}${checksum}`;
}

/**
 * Generates a high-resolution QR Code Data URL from the PIX payload
 */
export async function generatePixQrCodeDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate PIX QR code', err);
    return '';
  }
}
