import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { generatePixPayload, generatePixQrCodeDataUrl } from '../../utils/pix';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
  Key,
  Lock,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Zap,
  MessageCircle,
  Globe,
} from 'lucide-react';

export const CheckoutTab: React.FC = () => {
  const { checkoutConfig, setCheckoutConfig, sendWhatsAppValidationCode } = useStore();

  // Test PIX state
  const [testAmount, setTestAmount] = useState<number>(29.9);
  const [testTxid, setTestTxid] = useState('TEST' + Math.floor(Math.random() * 10000));
  const [generatedPayload, setGeneratedPayload] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  // Credit card token test simulator
  const [simCardNumber, setSimCardNumber] = useState('4532 0000 0000 1234');
  const [simCardExp, setSimCardExp] = useState('12/28');
  const [simCardCvv, setSimCardCvv] = useState('888');
  const [simCardHolder, setSimCardHolder] = useState('JS CLIENTE TESTE');
  const [tokenizedResult, setTokenizedResult] = useState<string | null>(null);
  const [tokenizingLoading, setTokenizingLoading] = useState(false);

  // WhatsApp Gateway test states
  const [testWaPhone, setTestWaPhone] = useState('11999998888');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // Mercado Pago Server Environment Secret Status
  const [mpEnvStatus, setMpEnvStatus] = useState<{
    configured?: boolean;
    hasEnvToken?: boolean;
    isLive?: boolean;
    accountNickname?: string;
    siteId?: string;
    tokenPrefix?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/mercadopago/status')
      .then((r) => r.json())
      .then((d) => setMpEnvStatus(d))
      .catch(() => {});
  }, []);

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await sendWhatsAppValidationCode(testWaPhone);
      if (res.success) {
        setWaResult({
          success: true,
          message: `Código ${res.code} gerado e pronto para envio!`,
          url: res.whatsappUrl,
        });
      } else {
        setWaResult({
          success: false,
          message: res.error || 'Erro ao gerar envio para o WhatsApp.',
        });
      }
    } catch (err: any) {
      setWaResult({
        success: false,
        message: err?.message || 'Falha no teste de envio WhatsApp.',
      });
    } finally {
      setWaSending(false);
    }
  };

  const [savedNotice, setSavedNotice] = useState(false);

  // Generate PIX QR Code when configuration or test amount changes
  useEffect(() => {
    const payload = generatePixPayload({
      key: checkoutConfig.pixKey,
      name: checkoutConfig.pixBeneficiaryName,
      city: checkoutConfig.pixBeneficiaryCity,
      amount: testAmount,
      txid: `${checkoutConfig.pixTxidPrefix}${testTxid}`,
      description: 'MD STUDIO PLAY DEMO',
    });
    setGeneratedPayload(payload);

    generatePixQrCodeDataUrl(payload).then((url) => {
      setQrCodeDataUrl(url);
    });
  }, [
    checkoutConfig.pixKey,
    checkoutConfig.pixBeneficiaryName,
    checkoutConfig.pixBeneficiaryCity,
    checkoutConfig.pixTxidPrefix,
    testAmount,
    testTxid,
  ]);

  const showSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(generatedPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleTestTokenize = (e: React.FormEvent) => {
    e.preventDefault();
    setTokenizingLoading(true);
    setTimeout(() => {
      const brand = simCardNumber.startsWith('4')
        ? 'visa'
        : simCardNumber.startsWith('5')
        ? 'mastercard'
        : 'elo';
      const mockToken = `tok_${brand}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setTokenizedResult(mockToken);
      setTokenizingLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Feedback notice */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#55c21b] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Configurações de pagamento salvas com sucesso!</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#55c21b]" />
          <span>Administração de Checkout & Meios de Pagamento</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
          Configure a chave PIX para geração de QR Codes com padrão BRCode oficial do Banco Central (EMVCo) e credenciais de cartão de crédito (Mercado Pago, Stripe, Asaas, PagBank).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: PIX System & Live BRCode Generator */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Configuração Oficial do PIX</h4>
                <p className="text-[11px] text-neutral-400">Banco Central do Brasil (BCB)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              BRCODE ATIVO
            </span>
          </div>

          {/* Form fields for PIX */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Tipo da Chave PIX
                </label>
                <select
                  value={checkoutConfig.pixKeyType}
                  onChange={(e) => {
                    setCheckoutConfig({
                      ...checkoutConfig,
                      pixKeyType: e.target.value as any,
                    });
                    showSaveNotice();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none"
                >
                  <option value="email">E-mail</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Telefone / Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Chave PIX Cadastrada *
                </label>
                <input
                  type="text"
                  value={checkoutConfig.pixKey}
                  onChange={(e) => {
                    setCheckoutConfig({
                      ...checkoutConfig,
                      pixKey: e.target.value,
                    });
                    showSaveNotice();
                  }}
                  placeholder="ex: comercial@mdstudioplay.com.br"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Nome do Titular / Beneficiário *
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={checkoutConfig.pixBeneficiaryName}
                  onChange={(e) => {
                    setCheckoutConfig({
                      ...checkoutConfig,
                      pixBeneficiaryName: e.target.value,
                    });
                    showSaveNotice();
                  }}
                  placeholder="MD STUDIO PLAY PRODUCOES"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
                />
                <span className="text-[10px] text-neutral-500">
                  Máximo 25 letras sem acentos (Norma BCB)
                </span>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">
                  Cidade do Titular da Conta *
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={checkoutConfig.pixBeneficiaryCity}
                  onChange={(e) => {
                    setCheckoutConfig({
                      ...checkoutConfig,
                      pixBeneficiaryCity: e.target.value,
                    });
                    showSaveNotice();
                  }}
                  placeholder="SAO PAULO"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-white/30"
                />
                <span className="text-[10px] text-neutral-500">
                  Máximo 15 letras (ex: FORTALEZA, RECIFE)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Prefixo do TXID / Identificador
              </label>
              <input
                type="text"
                maxLength={5}
                value={checkoutConfig.pixTxidPrefix}
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    pixTxidPrefix: e.target.value,
                  });
                  showSaveNotice();
                }}
                placeholder="JS"
                className="w-32 bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Real Live QR Code Generator & Tester */}
          <div className="pt-4 border-t border-white/10 bg-black/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Testador de QR Code Real (Escaneável em Qualquer Banco)</span>
              </span>

              <button
                type="button"
                onClick={() => setTestTxid('TEST' + Math.floor(Math.random() * 10000))}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Gerar Novo TXID</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Valor do Teste (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value))}
                  className="w-full bg-[#18191f] border border-white/10 rounded-lg p-2 text-xs text-white font-bold"
                />
              </div>
            </div>

            {/* Generated QR Code Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <div className="shrink-0 bg-white p-2 rounded-xl shadow-lg">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="PIX QR Code Real"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-black">
                    Carregando...
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2 text-xs">
                <div className="text-neutral-400 text-[11px]">
                  Código PIX "Copia e Cola" (EMVCo QRCPS):
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[10px] text-neutral-300 break-all max-h-20 overflow-y-auto">
                  {generatedPayload}
                </div>

                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="w-full py-2 bg-[#55c21b] hover:bg-[#62dc20] text-black font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Código Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Código Copia e Cola</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Mercado Pago PIX Gateway & Token Configuration */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mercado Pago & Gateway PIX</h4>
                <p className="text-[11px] text-neutral-400">Autenticação & Token PIX</p>
              </div>
            </div>

            {/* Sandbox toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <span className={checkoutConfig.isSandbox ? 'text-amber-400 font-bold' : 'text-neutral-500'}>
                {checkoutConfig.isSandbox ? 'Sandbox' : 'Produção'}
              </span>
              <input
                type="checkbox"
                checked={!checkoutConfig.isSandbox}
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    isSandbox: !e.target.checked,
                  });
                  showSaveNotice();
                }}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Gateway selector */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Provedor / Gateway de Pagamento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'mercadopago', name: 'Mercado Pago' },
                  { id: 'stripe', name: 'Stripe' },
                  { id: 'asaas', name: 'Asaas' },
                  { id: 'pagbank', name: 'PagBank' },
                ].map((gw) => (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => {
                      setCheckoutConfig({
                        ...checkoutConfig,
                        creditCardGateway: gw.id as any,
                      });
                      showSaveNotice();
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      checkoutConfig.creditCardGateway === gw.id
                        ? 'border-blue-400 bg-blue-500/20 text-white shadow-sm'
                        : 'border-white/10 bg-black/40 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {gw.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Public Key / Client Token */}
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold flex items-center justify-between">
                <span>Public Key / Token de Cliente *</span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {checkoutConfig.creditCardGateway === 'stripe' ? 'pk_live_...' : 'APP_USR-...'}
                </span>
              </label>
              <input
                type="text"
                value={checkoutConfig.creditCardPublicKey}
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    creditCardPublicKey: e.target.value,
                  });
                  showSaveNotice();
                }}
                placeholder="APP_USR-xxxx-xxxx-xxxx"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-white/30"
              />
            </div>

            {/* Environment Secret Status Banner */}
            {mpEnvStatus?.hasEnvToken && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>MERCADO PAGO ATIVO VIA VARIÁVEL SECRET</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
                  <span>Conta: <strong className="text-white">{mpEnvStatus.accountNickname}</strong> ({mpEnvStatus.siteId})</span>
                  <span className="text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">100% Protegido</span>
                </div>
              </div>
            )}

            {/* Secret Key / Access Token */}
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold flex items-center justify-between">
                <span>
                  {checkoutConfig.creditCardGateway === 'mercadopago'
                    ? 'Mercado Pago Access Token (Para PIX Oficial) *'
                    : 'Secret Key / Access Token do Gateway *'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {checkoutConfig.creditCardGateway === 'stripe'
                    ? 'sk_live_...'
                    : 'APP_USR-... ou TEST-...'}
                </span>
              </label>
              <input
                type="password"
                value={
                  checkoutConfig.mercadoPagoAccessToken ||
                  checkoutConfig.creditCardSecretToken ||
                  (mpEnvStatus?.hasEnvToken ? '••••••••••••••••••••••••••••••••••••••••••••' : '')
                }
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    creditCardSecretToken: e.target.value,
                    mercadoPagoAccessToken: e.target.value,
                  });
                  showSaveNotice();
                }}
                placeholder={
                  mpEnvStatus?.hasEnvToken
                    ? 'Configurado via SECRET (MERCADO_PAGO_ACCESS_TOKEN)'
                    : 'APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000'
                }
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-white/30 text-xs"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                {mpEnvStatus?.hasEnvToken
                  ? 'O Access Token está injetado com segurança no servidor através da variável SECRET MERCADO_PAGO_ACCESS_TOKEN. O sistema está apto a receber pagamentos reais via PIX com aprovação instantânea.'
                  : 'Utilizado para gerar o QR Code PIX oficial e processar pagamentos via API do Mercado Pago.'}
              </span>
            </div>

            {/* Mercado Pago Webhook Information Box */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-neutral-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-400">
                <Globe className="w-4 h-4" />
                <span>URL do Webhook Oficial do Mercado Pago</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Cadastre esta URL no painel do Mercado Pago (Suas Aplicações &gt; Notificações Webhook):
              </p>
              <div className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-[11px] text-white">
                <span className="truncate select-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/mercadopago/webhook` : 'https://seusite.com/api/mercadopago/webhook'}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}/api/mercadopago/webhook`);
                      showSaveNotice();
                    }
                  }}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                >
                  Copiar URL
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Evento obrigatório para marcar no Mercado Pago: <strong>Pagamentos (payments)</strong>.
              </p>
            </div>

          </div>

          {/* Status Exclusivo PIX */}
          <div className="pt-4 border-t border-white/10 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modalidade Ativa: Pagamento Exclusivo via PIX</span>
            </span>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              O sistema está operando exclusivamente com PIX oficial do Mercado Pago. Todas as compras geram QR Code e Copia e Cola dinâmicos em tempo real com conciliação automática via webhook e polling.
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Gateway & Notificações de Acesso */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Disparador de WhatsApp & Códigos de Acesso
              </h3>
              <p className="text-xs text-neutral-400">
                Configuração para entrega de códigos na Área do Cliente e envio de links de download
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuração de Gateway API (Opcional) */}
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-neutral-300 space-y-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Entrega Inteligente Integrada (Ativa)
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                O sistema já gera o código instantaneamente na tela com link direto para o WhatsApp oficial e preenchimento automático.
                Se você utiliza um servidor de envio (Evolution API, Z-API ou Webhook), configure abaixo para disparo em segundo plano:
              </p>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                URL do Webhook / API WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={checkoutConfig.whatsappGatewayUrl || ''}
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    whatsappGatewayUrl: e.target.value,
                  });
                  showSaveNotice();
                }}
                placeholder="https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Token de Autorização / Chave de API (Opcional)
              </label>
              <input
                type="password"
                value={checkoutConfig.whatsappGatewayToken || ''}
                onChange={(e) => {
                  setCheckoutConfig({
                    ...checkoutConfig,
                    whatsappGatewayToken: e.target.value,
                  });
                  showSaveNotice();
                }}
                placeholder="Insira o Bearer Token ou Chave da Instância"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Testador ao Vivo de WhatsApp */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Testador de Envio WhatsApp</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Ao Vivo
              </span>
            </div>

            <form onSubmit={handleTestWhatsApp} className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1 font-semibold">
                  Número para Teste com DDD (ex: 11988887777)
                </label>
                <input
                  type="tel"
                  value={testWaPhone}
                  onChange={(e) => setTestWaPhone(e.target.value)}
                  placeholder="DDD + Número"
                  className="w-full bg-[#18191f] border border-white/10 rounded p-2 text-white font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={waSending || testWaPhone.replace(/\D/g, '').length < 10}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {waSending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5" />
                )}
                <span>Gerar e Testar Envio de Código WhatsApp</span>
              </button>

              {waResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    waResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {waResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{waResult.message}</span>
                  </div>

                  {waResult.url && (
                    <a
                      href={waResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25d366] text-black font-bold text-xs hover:bg-[#20ba5a] transition-all cursor-pointer shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>Abrir no WhatsApp Web/App</span>
                    </a>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
