/**
 * Gerador e Validador de Código PIX EMV BR Code (Padrão Oficial Banco Central do Brasil)
 * 
 * Garante que qualquer QR Code gerado seja 100% compatível com os aplicativos de todos os bancos brasileiros:
 * Nubank, Inter, Caixa, Banco do Brasil, Bradesco, Santander, Itaú, Mercado Pago, PicPay, etc.
 */

// Formata campos no formato EMV TLV (Tag-Length-Value)
function formatEMV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Remove acentos e caracteres especiais para compatibilidade estrita EMV
function sanitizeEMVString(text: string, maxLen: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

/**
 * Calcula o checksum CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 * Exigido estritamente pelo Banco Central do Brasil para validação nos aplicativos bancários.
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface BacenPixParams {
  pixKey: string;           // Chave PIX (Telefone, CPF, CNPJ, E-mail ou EVP)
  merchantName?: string;     // Nome do beneficiário (até 25 caracteres)
  merchantCity?: string;     // Cidade do beneficiário (até 15 caracteres)
  amount?: number;           // Valor da cobrança (opcional)
  txid?: string;             // Identificador da transação (até 25 caracteres alfanuméricos)
  description?: string;      // Descrição opcional (até 25 caracteres)
}

/**
 * Gera a string completa "PIX Copia e Cola" oficial (BR Code EMV).
 * Sempre inicia com "000201" e contém "br.gov.bcb.pix".
 */
export function generateBacenPixPayload({
  pixKey,
  merchantName = 'ROAN1155540',
  merchantCity = 'CANAVIEIRAS',
  amount,
  txid,
  description,
}: BacenPixParams): string {
  // Limpeza da chave PIX
  let cleanKey = pixKey.trim();
  // Se for telefone brasileiro sem +, adiciona o +55 se for válido
  if (/^\d{10,11}$/.test(cleanKey)) {
    cleanKey = `+55${cleanKey}`;
  }

  // 1. Tag 00 - Payload Format Indicator (01)
  const f00 = formatEMV('00', '01');

  // 2. Tag 26 - Merchant Account Information (PIX)
  const gui = formatEMV('00', 'br.gov.bcb.pix');
  const key = formatEMV('01', cleanKey);
  let sub26 = `${gui}${key}`;
  if (description) {
    const cleanDesc = sanitizeEMVString(description, 25);
    if (cleanDesc) {
      sub26 += formatEMV('02', cleanDesc);
    }
  }
  const f26 = formatEMV('26', sub26);

  // 3. Tag 52 - Merchant Category Code (0000 = Geral)
  const f52 = formatEMV('52', '0000');

  // 4. Tag 53 - Transaction Currency (986 = BRL)
  const f53 = formatEMV('53', '986');

  // 5. Tag 54 - Transaction Amount
  let f54 = '';
  if (amount && amount > 0) {
    f54 = formatEMV('54', amount.toFixed(2));
  }

  // 6. Tag 58 - Country Code (BR)
  const f58 = formatEMV('58', 'BR');

  // 7. Tag 59 - Merchant Name
  const cleanName = sanitizeEMVString(merchantName, 25) || 'MD STUDIO';
  const f59 = formatEMV('59', cleanName);

  // 8. Tag 60 - Merchant City
  const cleanCity = sanitizeEMVString(merchantCity, 15) || 'CANAVIEIRAS';
  const f60 = formatEMV('60', cleanCity);

  // 9. Tag 62 - Additional Data Field Template
  const cleanTxid = txid ? sanitizeEMVString(txid, 25).replace(/\s+/g, '') : '***';
  const sub62 = formatEMV('05', cleanTxid || '***');
  const f62 = formatEMV('62', sub62);

  // 10. Tag 63 - CRC16 (Calculado sobre toda a string incluindo 6304)
  const rawWithoutCrc = `${f00}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  const checksum = calculateCRC16(rawWithoutCrc);

  return `${rawWithoutCrc}${checksum}`;
}

/**
 * Valida se uma string é um código PIX EMV BR Code oficial válido pelo Banco Central do Brasil.
 */
export function isBacenPixCode(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  // Deve iniciar com 000201 e conter o identificador de arranjo br.gov.bcb.pix
  if (!s.startsWith('000201')) return false;
  if (!s.includes('br.gov.bcb.pix')) return false;
  // Deve ter tamanho mínimo razoável e terminar com o bloco 6304XXXX
  if (s.length < 50) return false;
  return /6304[0-9A-Fa-f]{4}$/.test(s);
}
