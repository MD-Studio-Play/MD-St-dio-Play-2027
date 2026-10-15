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
  ExternalLink,
  HelpCircle,
  KeyRound,
  Send,
  RotateCcw,
} from 'lucide-react';

export const CheckoutTab: React.FC = () => {
  const { checkoutConfig, setCheckoutConfig, sendWhatsAppValidationCode, resetCheckoutConfig } = useStore();
  const [resetNotice, setResetNotice] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // AbacatePay Server Status
  const [abacateStatus, setAbacateStatus] = useState<{
    configured?: boolean;
    hasApiKey?: boolean;
    hasWebhookSecret?: boolean;
    isDev?: boolean;
    keyPrefix?: string | null;
  } | null>(null);

  // Form input states
  const [apiKeyInput, setApiKeyInput] = useState(checkoutConfig.abacatePayApiKey || '');
  const [webhookSecretInput, setWebhookSecretInput] = useState(checkoutConfig.abacatePayWebhookSecret || '');
  const [isSandboxInput, setIsSandboxInput] = useState(checkoutConfig.isSandbox ?? false);

  // Test connection state
  const [testState, setTestState] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    isDev?: boolean;
  }>({ loading: false });

  // Webhook copy feedback
  const [webhookCopied, setWebhookCopied] = useState(false);

  // WhatsApp Gateway test states
  const [testWaPhone, setTestWaPhone] = useState('11999998888');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  const fetchAbacateStatus = () => {
    fetch('/api/abacatepay/status')
      .then((r) => r.json())
      .then((d) => setAbacateStatus(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchAbacateStatus();
  }, []);

  // Sync inputs if checkoutConfig updates externally
  useEffect(() => {
    if (checkoutConfig.abacatePayApiKey && !apiKeyInput) {
      setApiKeyInput(checkoutConfig.abacatePayApiKey);
    }
    if (checkoutConfig.abacatePayWebhookSecret && !webhookSecretInput) {
      setWebhookSecretInput(checkoutConfig.abacatePayWebhookSecret);
    }
  }, [checkoutConfig]);

  const showSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // 1. Test Connection with AbacatePay API
  const handleTestConnection = async () => {
    setTestState({ loading: true });
    try {
      const res = await fetch('/api/abacatepay/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestState({
          loading: false,
          success: true,
          message: data.message || 'Conexão com a API do AbacatePay validada com sucesso!',
          isDev: data.isDev,
        });
        fetchAbacateStatus();
      } else {
        setTestState({
          loading: false,
          success: false,
          message: data.error || 'Chave de API inválida ou inativa no AbacatePay.',
        });
      }
    } catch (err: any) {
      setTestState({
        loading: false,
        success: false,
        message: 'Erro de comunicação ao tentar testar a chave no AbacatePay.',
      });
    }
  };

  // 2. Save Config to StoreContext and Backend
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    const cleanSecret = webhookSecretInput.trim();

    const updated = {
      ...checkoutConfig,
      pixGateway: 'abacatepay' as const,
      abacatePayApiKey: cleanKey,
      abacatePayWebhookSecret: cleanSecret,
      isSandbox: isSandboxInput,
    };

    setCheckoutConfig(updated);
    showSaveNotice();

    // Also persist directly to server
    try {
      await fetch('/api/abacatepay/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: cleanKey,
          webhookSecret: cleanSecret,
        }),
      });
      fetchAbacateStatus();
    } catch {}
  };

  const handleCopyWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/abacatepay/webhook`;
      navigator.clipboard.writeText(url);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 3000);
    }
  };

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

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/abacatepay/webhook`
      : 'https://seusite.com/api/abacatepay/webhook';

  return (
    <div className="space-y-6">
      {/* Feedback notices */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00d06c] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Configurações do AbacatePay salvas com sucesso!</span>
        </div>
      )}

      {resetNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-400 text-black font-black text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações do checkout restauradas para os padrões!</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#00d06c]/15 text-[#00d06c] border border-[#00d06c]/30 text-[10px] font-black uppercase tracking-wider">
              Gateway Oficial Ativo
            </span>
            <span className="text-xs text-neutral-400 font-mono">AbacatePay v2 PIX</span>
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-1">
            <CreditCard className="w-5 h-5 text-[#00d06c]" />
            <span>Configuração do Gateway PIX — AbacatePay</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Substituição completa do Mercado Pago pelo <strong>AbacatePay</strong>. O checkout gera QR Codes dinâmicos exclusivos para cada cobrança, com conciliação automática via Webhook em tempo real e entrega imediata na Área do Cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Deseja restaurar as configurações padrão limpas do checkout?')) {
              resetCheckoutConfig();
              setResetNotice(true);
              setTimeout(() => setResetNotice(false), 3500);
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Status do AbacatePay & Diagnóstico */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#00d06c]/10 text-[#00d06c]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">PIX Dinâmico AbacatePay</h4>
                <p className="text-[11px] text-neutral-400">Ambiente Real & Banco Central</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              100% AUTOMÁTICO
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              abacateStatus?.hasApiKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {abacateStatus?.hasApiKey
                    ? 'Integração com AbacatePay Ativa'
                    : 'Aguardando Chave de API do AbacatePay'}
                </span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {abacateStatus?.hasApiKey
                  ? 'O servidor está configurado para gerar QR Codes PIX dinâmicos e receber confirmações instantâneas de pagamento.'
                  : 'Para aceitar pagamentos reais via PIX, gere uma Chave de API no painel do AbacatePay e insira no campo ao lado.'}
              </p>
            </div>

            {/* Informações de Conexão */}
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2.5">
              <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                Status no Servidor:
              </div>
              <div className="space-y-2 text-neutral-300 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-neutral-400">Provedor:</span>
                  <span className="font-bold text-white">AbacatePay Oficial</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-neutral-400">Chave de API:</span>
                  <span className={abacateStatus?.hasApiKey ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {abacateStatus?.keyPrefix || 'Não configurada'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-neutral-400">Ambiente:</span>
                  <span className={isSandboxInput || abacateStatus?.isDev ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isSandboxInput || abacateStatus?.isDev ? 'Dev Mode (Testes / Sandbox)' : 'Produção (Real)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">Webhook Secret:</span>
                  <span className={abacateStatus?.hasWebhookSecret ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                    {abacateStatus?.hasWebhookSecret ? 'Ativo (Protegido)' : 'Opcional (Padrão)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Guia de Passo a Passo */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-neutral-300 space-y-2.5">
              <div className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
                <HelpCircle className="w-4 h-4" />
                <span>Como Obter sua Chave no AbacatePay:</span>
              </div>
              <ol className="space-y-1.5 text-[11px] text-neutral-300 list-decimal list-inside leading-relaxed">
                <li>Acesse o painel: <a href="https://app.abacatepay.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">app.abacatepay.com</a></li>
                <li>Vá no menu lateral em <strong>Configurações &gt; Chaves de API</strong></li>
                <li>Crie ou copie sua <strong>API Key</strong></li>
                <li>Cole no campo <strong>Chave de API do AbacatePay</strong> ao lado e clique em <strong>Salvar Configurações</strong></li>
                <li>Cadastre a URL do Webhook na aba <strong>Webhooks</strong> do AbacatePay</li>
              </ol>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Formulário de Credenciais AbacatePay */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#00d06c]/10 text-[#00d06c]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Credenciais do AbacatePay</h4>
                <p className="text-[11px] text-neutral-400">Autenticação Segura no Servidor</p>
              </div>
            </div>

            {/* Modo Dev / Sandbox Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <span className={isSandboxInput ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
                {isSandboxInput ? 'Dev Mode' : 'Produção'}
              </span>
              <input
                type="checkbox"
                checked={!isSandboxInput}
                onChange={(e) => {
                  setIsSandboxInput(!e.target.checked);
                }}
                className="w-4 h-4 accent-[#00d06c] cursor-pointer"
              />
            </label>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* API Key Input */}
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold flex items-center justify-between">
                <span>Chave de API do AbacatePay (API Key / Secret)</span>
                <span className="text-[10px] text-neutral-400 font-mono">Obrigatória</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="key_xxxxxxxxxxxxxxxxxxxxxxxxxx ou dev_xxxxxxxx"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono outline-none focus:border-[#00d06c] text-xs"
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Armazenada de forma protegida no servidor para assinar cobranças PIX e conciliar pagamentos.
              </span>
            </div>

            {/* Webhook Secret Input */}
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold flex items-center justify-between">
                <span>Segredo do Webhook (Webhook Secret)</span>
                <span className="text-[10px] text-neutral-500 font-mono">Opcional</span>
              </label>
              <input
                type="text"
                value={webhookSecretInput}
                onChange={(e) => setWebhookSecretInput(e.target.value)}
                placeholder="whsec_xxxxxxxx ou seu segredo configurado"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono outline-none focus:border-[#00d06c] text-xs"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Utilizado para verificar a assinatura digital (HMAC) das notificações de pagamento do AbacatePay.
              </span>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.loading || !apiKeyInput.trim()}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {testState.loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00d06c]" />
                    <span>Testando Conexão com AbacatePay...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#00d06c]" />
                    <span>Testar Conexão com AbacatePay</span>
                  </>
                )}
              </button>

              {/* Test Connection Feedback */}
              {testState.message && (
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 animate-in fade-in duration-200 ${
                    testState.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testState.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{testState.message}</span>
                  </div>
                  {!testState.success && (
                    <div className="text-[11px] text-neutral-300 pl-6 leading-relaxed">
                      Certifique-se de copiar a chave completa diretamente do painel do AbacatePay em <strong>Configurações &gt; Chaves de API</strong>. Se estiver usando o modo de testes, certifique-se de copiar uma chave ativa.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#00d06c] hover:bg-[#00b85f] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00d06c]/20 transition-all cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Configurações do AbacatePay</span>
            </button>
          </form>

          {/* AbacatePay Webhook Information Box */}
          <div className="p-3.5 rounded-xl bg-[#00d06c]/10 border border-[#00d06c]/30 text-xs text-neutral-300 space-y-2 mt-4">
            <div className="flex items-center gap-2 font-bold text-[#00d06c]">
              <Globe className="w-4 h-4" />
              <span>URL do Webhook Oficial do AbacatePay</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Cadastre esta URL no painel do AbacatePay (menu <strong>Webhooks &gt; Adicionar Webhook</strong>):
            </p>
            <div className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-[11px] text-white">
              <span className="truncate select-all">{webhookUrl}</span>
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="px-2.5 py-1 rounded bg-[#00d06c] hover:bg-[#00b85f] text-black font-extrabold text-[10px] shrink-0 cursor-pointer transition-all"
              >
                {webhookCopied ? 'Copiado!' : 'Copiar URL'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-400">
              Evento obrigatório para ativar no AbacatePay: <strong>billing.paid</strong> (e <strong>checkout.completed</strong>).
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Endpoint da API de Disparo WhatsApp
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
                placeholder="https://api.meuzap.com/send-message"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white font-mono outline-none focus:border-white/30 text-xs"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">
                Token de Autorização (Bearer Token)
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
                placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white font-mono outline-none focus:border-white/30 text-xs"
              />
            </div>
          </div>

          <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h5 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Simulador de Teste de Disparo</span>
              </h5>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Envie um código de validação teste para o seu próprio WhatsApp para verificar se a API externa ou o link direto estão respondendo adequadamente.
              </p>
            </div>

            <form onSubmit={handleTestWhatsApp} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testWaPhone}
                  onChange={(e) => setTestWaPhone(e.target.value)}
                  placeholder="DDD + Número (ex: 11999998888)"
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={waSending}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {waSending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Testar</span>
                </button>
              </div>

              {waResult && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] flex items-center justify-between gap-2 ${
                    waResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}
                >
                  <span>{waResult.message}</span>
                  {waResult.url && (
                    <a
                      href={waResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-emerald-500 text-black font-bold rounded text-[10px] flex items-center gap-1 shrink-0"
                    >
                      <span>Abrir Zap</span>
                      <ExternalLink className="w-2.5 h-2.5" />
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
