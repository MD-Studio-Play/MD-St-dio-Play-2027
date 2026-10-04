/**
 * Validador Oficial de CPF (Algoritmo Módulo 11 da Receita Federal do Brasil)
 * Verifica:
 * 1. Tamanho exato de 11 dígitos numéricos
 * 2. Rejeição de CPFs com todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11)
 * 3. Cálculo do 1º dígito verificador
 * 4. Cálculo do 2º dígito verificador
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  const clean = String(cpf).replace(/\D/g, '');

  if (clean.length !== 11) return false;

  // Rejeita sequências de números idênticos conhecidas como inválidas
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function formatCPF(cpf: string): string {
  const clean = String(cpf).replace(/\D/g, '').slice(0, 11);
  if (!clean.length) return '';
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}
