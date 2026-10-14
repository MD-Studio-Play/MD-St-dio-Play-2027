import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
  Lock,
  RefreshCw,
  Zap,
  MessageCircle,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RotateCcw,
} from 'lucide-react';

export const CheckoutTab: React.FC = () => {
  const { checkoutConfig, setCheckoutConfig, sendWhatsAppValidationCode, resetCheckoutConfig } = useStore();
  const [resetNotice, setResetNotice] = useState(false);

  // WhatsApp Gateway test states
  const [testWaPhone, setTestWaPhone] = useState('11999998888');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // Mercado Pago Server Environment Secret Status
  const [mpEnvStatus, setMpEnvStatus] = useState<{
    configured?: boolean;
    hasAccessToken?: boolean;
    isLive?: boolean;
    accountNickname?: string;
    siteId?: string;
    tokenPrefix?: string;
    publicKeyPrefix?: string;
  } | null>(null);

  const [savedNotice, setSavedNotice] = useState(false);

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

  const showSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Feedback notices */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#55c21b] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Configurações de pagamento salvas com sucesso!</span>
        </div>
      )}

      {resetNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-400 text-black font-black text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações do antigo gerador de QR Code excluídas com sucesso! Checkout resetado.</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#55c21b]" />
            <span>Administração de Checkout & Meios de Pagamento</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Configuração oficial do gateway de pagamentos. O gerador estático manual de QR Code foi completamente removido: todos os pagamentos PIX são gerados dinamicamente em tempo real pela API oficial do Mercado Pago no servidor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Deseja excluir todas as configurações residuais do antigo gerador de QR Code e restaurar as configurações padrão limpas do checkout?')) {
              resetCheckoutConfig();
              setResetNotice(true);
              setTimeout(() => setResetNotice(false), 3500);
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir Configurações do Antigo Gerador PIX</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Status do PIX Oficial Dinâmico */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">PIX Oficial Dinâmico</h4>
                <p className="text-[11px] text-neutral-400">Mercado Pago / Banco Central</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              100% AUTOMÁTICO
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Geração Dinâmica no Backend Ativa</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                As configurações de chaves estáticas manuais foram desativadas. Agora, cada pedido gera um <strong>QR Code e Copia e Cola exclusivos</strong> pelo Mercado Pago, com conciliação automática via polling e webhook.
              </p>
            </div>

            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2.5">
              <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                Vantagens da Geração Oficial no Servidor:
              </div>
              <div className="space-y-2 text-neutral-300 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sem chaves manuais expostas: identificação por pedido com TXID exclusivo.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Confirmação em tempo real e liberação automática de downloads na Área do Cliente.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Anti-duplicação e proteção com chaves de idempotência únicas por tentativa.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Total integridade: o valor gerado é sempre idêntico ao total real do carrinho.</span>
                </div>
              </div>
            </div>

            {/* Informações da Conta Conectada */}
            <div className="bg-[#18191f] rounded-xl p-3.5 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Conta Comercial:</span>
                <span className="font-bold text-white font-mono">{mpEnvStatus?.accountNickname || 'MD Studio Play'}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-400">
                <span>País / Site ID:</span>
                <span className="font-bold text-emerald-400 font-mono">{mpEnvStatus?.siteId || 'MLB (Brasil)'}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-400">
                <span>Modo de Operação:</span>
                <span className="font-bold text-white">{mpEnvStatus?.isLive ? 'Produção (Real)' : 'Sandbox / Testes'}</span>
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
                <p className="text-[11px] text-neutral-400">Autenticação & Token do Gateway</p>
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

          <div className="space-y-3 text-xs">
            {/* Environment Secret Status Banner */}
            {mpEnvStatus?.hasAccessToken && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>MERCADO PAGO ATIVO VIA VARIÁVEL SECRET</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
                  <span>Conta: <strong className="text-white">{mpEnvStatus.accountNickname}</strong></span>
                  <span className="text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">100% Protegido</span>
                </div>
              </div>
            )}

            {/* Public Key */}
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold flex items-center justify-between">
                <span>Public Key do Mercado Pago</span>
                <span className="text-[10px] text-neutral-500 font-mono">APP_USR-...</span>
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

            {/* Access Token (Injetado com segurança) */}
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold flex items-center justify-between">
                <span>Mercado Pago Access Token</span>
                <span className="text-[10px] text-neutral-500 font-mono">APP_USR-...</span>
              </label>
              <input
                type="password"
                value={
                  checkoutConfig.mercadoPagoAccessToken ||
                  checkoutConfig.creditCardSecretToken ||
                  (mpEnvStatus?.hasAccessToken ? '••••••••••••••••••••••••••••••••••••••••••••' : '')
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
                  mpEnvStatus?.hasAccessToken
                    ? 'Configurado via SECRET (MERCADO_PAGO_ACCESS_TOKEN)'
                    : 'APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000'
                }
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-white/30 text-xs"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                O Access Token é mantido de forma confidencial exclusivamente no servidor para processamento de pagamentos PIX.
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
                <span className="truncate select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/mercadopago/webhook` : 'https://seusite.com/api/mercadopago/webhook'}
                </span>
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
