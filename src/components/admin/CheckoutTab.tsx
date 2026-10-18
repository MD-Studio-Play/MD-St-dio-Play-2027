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
  ExternalLink,
  HelpCircle,
  KeyRound,
  Send,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

export const CheckoutTab: React.FC = () => {
  const { checkoutConfig, setCheckoutConfig, sendWhatsAppValidationCode, resetCheckoutConfig } = useStore();
  const [resetNotice, setResetNotice] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Mercado Pago Server Status
  const [mpStatus, setMpStatus] = useState<{
    configured?: boolean;
    hasAccessToken?: boolean;
    hasPublicKey?: boolean;
    mode?: 'production' | 'test';
    isSandbox?: boolean;
    tokenPrefix?: string | null;
    seller?: {
      id?: number;
      nickname?: string;
      email?: string;
      site_id?: string;
    } | null;
  } | null>(null);

  // Form input states
  const [accessTokenInput, setAccessTokenInput] = useState(checkoutConfig.mercadoPagoAccessToken || '');
  const [publicKeyInput, setPublicKeyInput] = useState(checkoutConfig.mercadoPagoPublicKey || '');
  const [isSandboxInput, setIsSandboxInput] = useState(checkoutConfig.isSandbox ?? false);

  // Test connection state
  const [testState, setTestState] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    seller?: any;
    isSandbox?: boolean;
  }>({ loading: false });

  // Webhook copy feedback
  const [webhookCopied, setWebhookCopied] = useState(false);

  // WhatsApp Gateway test states
  const [testWaPhone, setTestWaPhone] = useState('11999998888');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  const fetchMpStatus = () => {
    fetch('/api/mercadopago/status')
      .then((r) => r.json())
      .then((d) => setMpStatus(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchMpStatus();
  }, []);

  // Sync inputs if checkoutConfig updates externally
  useEffect(() => {
    if (checkoutConfig.mercadoPagoAccessToken && !accessTokenInput) {
      setAccessTokenInput(checkoutConfig.mercadoPagoAccessToken);
    }
    if (checkoutConfig.mercadoPagoPublicKey && !publicKeyInput) {
      setPublicKeyInput(checkoutConfig.mercadoPagoPublicKey);
    }
  }, [checkoutConfig]);

  const showSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // 1. Test Connection with Mercado Pago API
  const handleTestConnection = async () => {
    setTestState({ loading: true });
    try {
      const res = await fetch('/api/mercadopago/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: accessTokenInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestState({
          loading: false,
          success: true,
          message: data.message || 'Conexão com o Mercado Pago validada com 100% de sucesso!',
          seller: data.seller,
          isSandbox: data.isSandbox,
        });
        fetchMpStatus();
      } else {
        setTestState({
          loading: false,
          success: false,
          message: data.error || 'Access Token inválido ou expirado no Mercado Pago.',
        });
      }
    } catch (err: any) {
      setTestState({
        loading: false,
        success: false,
        message: 'Erro de comunicação ao tentar testar o token no Mercado Pago.',
      });
    }
  };

  // 2. Save Config to StoreContext and Backend
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanToken = accessTokenInput.trim();
    const cleanPublic = publicKeyInput.trim();

    const updated = {
      ...checkoutConfig,
      pixGateway: 'mercadopago' as const,
      creditCardGateway: 'mercadopago' as const,
      mercadoPagoAccessToken: cleanToken,
      mercadoPagoPublicKey: cleanPublic,
      isSandbox: isSandboxInput,
    };

    setCheckoutConfig(updated);
    showSaveNotice();

    // Also persist directly to server
    try {
      await fetch('/api/mercadopago/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: cleanToken,
          publicKey: cleanPublic,
          isSandbox: isSandboxInput,
        }),
      });
      fetchMpStatus();
    } catch {}
  };

  const handleCopyWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/mercadopago/webhook`;
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
      ? `${window.location.origin}/api/mercadopago/webhook`
      : 'https://seusite.com/api/mercadopago/webhook';

  const isConfigured = mpStatus?.hasAccessToken || (accessTokenInput && accessTokenInput.length > 10);
  const isProd = accessTokenInput.startsWith('APP_USR-') || (!isSandboxInput && !accessTokenInput.startsWith('TEST-'));

  return (
    <div className="space-y-6">
      {/* Feedback notices */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00d06c] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Configurações do Mercado Pago salvas com sucesso!</span>
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
            <span className="px-2.5 py-0.5 rounded-full bg-[#009ee3]/15 text-[#009ee3] border border-[#009ee3]/30 text-[10px] font-black uppercase tracking-wider">
              Gateway Oficial Ativo
            </span>
            <span className="text-xs text-neutral-400 font-mono">Mercado Pago PIX & Cartão</span>
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-1">
            <CreditCard className="w-5 h-5 text-[#009ee3]" />
            <span>Configuração do Mercado Pago (Provedor Oficial)</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Integração nativa com a API oficial do <strong>Mercado Pago</strong> para geração de <strong>QR Code PIX dinâmico</strong> com valores calculados em tempo real, confirmação automática via Webhook e liberação imediata dos produtos digitais na Área do Cliente.
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
        {/* LEFT COLUMN: Status do Mercado Pago & Diagnóstico */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#009ee3]/10 text-[#009ee3]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">PIX Dinâmico Mercado Pago</h4>
                <p className="text-[11px] text-neutral-400">Banco Central do Brasil & EMV Oficial</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              100% AUTOMÁTICO
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isConfigured
                    ? 'Integração com Mercado Pago Ativa'
                    : 'Aguardando Credencial do Mercado Pago'}
                </span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {isConfigured
                  ? 'O servidor está configurado e pronto para gerar QR Codes PIX oficiais do Banco Central e conciliar pagamentos em tempo real.'
                  : 'Para ativar pagamentos reais via PIX, insira o seu Access Token obtido no painel de desenvolvedores do Mercado Pago.'}
              </p>
            </div>

            {/* Informações da Conta do Vendedor */}
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2.5">
              <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                Diagnóstico da Conexão no Servidor:
              </div>
              <div className="space-y-2 text-neutral-300 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-neutral-400">Provedor:</span>
                  <span className="font-bold text-white">Mercado Pago Oficial</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-neutral-400">Ambiente:</span>
                  <span className={isProd ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {isProd ? 'Produção (APP_USR-...)' : 'Modo Sandbox / Testes'}
                  </span>
                </div>
                {mpStatus?.seller && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-neutral-400">Vendedor:</span>
                      <span className="text-emerald-400 font-bold">{mpStatus.seller.nickname || 'Identificado'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-neutral-400">Seller ID:</span>
                      <span className="text-white">{mpStatus.seller.id}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">Access Token:</span>
                  <span className={isConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {mpStatus?.tokenPrefix || (accessTokenInput ? `${accessTokenInput.slice(0, 10)}••••••••` : 'Não configurado')}
                  </span>
                </div>
              </div>
            </div>

            {/* Guia Passo a Passo Oficial */}
            <div className="p-4 rounded-xl bg-[#009ee3]/10 border border-[#009ee3]/30 text-xs text-neutral-300 space-y-2.5">
              <div className="font-bold text-[#009ee3] flex items-center gap-1.5 text-xs">
                <HelpCircle className="w-4 h-4" />
                <span>Onde Encontrar seu Access Token no Mercado Pago:</span>
              </div>
              <ol className="space-y-1.5 text-[11px] text-neutral-300 list-decimal list-inside leading-relaxed">
                <li>
                  Acesse:{' '}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#009ee3] underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>mercadopago.com.br/developers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Clique em <strong>Suas integrações</strong> e abra sua aplicação (ou crie uma nova selecionando Pagamento Online).</li>
                <li>No menu lateral, clique em <strong>Credenciais de produção</strong> (ou de teste se estiver homologando).</li>
                <li>Copie o <strong>Access Token</strong> (começa com <code className="text-emerald-400 font-mono">APP_USR-</code> ou <code className="text-amber-400 font-mono">TEST-</code>).</li>
                <li>Cole no campo <strong>Access Token do Mercado Pago</strong> ao lado e clique em <strong>Testar Conexão</strong>.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Formulário de Credenciais Mercado Pago */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#009ee3]/10 text-[#009ee3]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Credenciais da API</h4>
                <p className="text-[11px] text-neutral-400">Armazenamento Seguro no Servidor</p>
              </div>
            </div>

            {/* Modo Sandbox Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <span className={isSandboxInput ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
                {isSandboxInput ? 'Sandbox (Testes)' : 'Produção'}
              </span>
              <input
                type="checkbox"
                checked={isSandboxInput}
                onChange={(e) => setIsSandboxInput(e.target.checked)}
                className="w-4 h-4 accent-[#009ee3] cursor-pointer"
              />
            </label>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* Access Token Input */}
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold flex items-center justify-between">
                <span>Access Token do Mercado Pago</span>
                <span className="text-[10px] text-neutral-400 font-mono">Obrigatório</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxx ou TEST-xxxxxxxx"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pr-10 text-white font-mono outline-none focus:border-[#009ee3] text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {accessTokenInput.startsWith('APP_USR-') && (
                <span className="text-[10px] text-emerald-400 mt-1 block font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Token de Produção Oficial detectado (Pronto para receber pagamentos reais).</span>
                </span>
              )}
              {accessTokenInput.startsWith('TEST-') && (
                <span className="text-[10px] text-amber-400 mt-1 block font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Token de Teste (Sandbox). Utilize contas de teste para simulação.</span>
                </span>
              )}
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Utilizado exclusivamente pelo backend para criar cobranças PIX oficiais e verificar o status com autenticação OAuth Bearer.
              </span>
            </div>

            {/* Public Key Input (Optional) */}
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold flex items-center justify-between">
                <span>Public Key do Mercado Pago</span>
                <span className="text-[10px] text-neutral-500 font-mono">Opcional</span>
              </label>
              <input
                type="text"
                value={publicKeyInput}
                onChange={(e) => setPublicKeyInput(e.target.value)}
                placeholder="APP_USR-xxxxxxxx ou TEST-xxxxxxxx"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono outline-none focus:border-[#009ee3] text-xs"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Necessária apenas para tokenização direta de cartões de crédito no frontend.
              </span>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.loading || !accessTokenInput.trim()}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {testState.loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#009ee3]" />
                    <span>Testando Conexão com Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#009ee3]" />
                    <span>Testar Conexão com Mercado Pago</span>
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
                  {testState.success && testState.seller && (
                    <div className="text-[11px] text-neutral-300 pl-6 space-y-0.5">
                      <div>Conta: <strong>{testState.seller.nickname}</strong></div>
                      <div>ID do Vendedor: <strong>{testState.seller.id}</strong></div>
                      <div>País / Site: <strong>{testState.seller.site_id}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#009ee3] hover:bg-[#0082bd] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#009ee3]/20 transition-all cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Configurações do Mercado Pago</span>
            </button>
          </form>

          {/* Mercado Pago Webhook Information Box */}
          <div className="p-3.5 rounded-xl bg-[#009ee3]/10 border border-[#009ee3]/30 text-xs text-neutral-300 space-y-2 mt-4">
            <div className="flex items-center gap-2 font-bold text-[#009ee3]">
              <Globe className="w-4 h-4" />
              <span>URL do Webhook Oficial do Mercado Pago</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Cadastre esta URL no painel do Mercado Pago (menu <strong>Suas integrações &gt; Webhooks / Notificações IPN</strong>):
            </p>
            <div className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-[11px] text-white">
              <span className="truncate select-all">{webhookUrl}</span>
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="px-2.5 py-1 rounded bg-[#009ee3] hover:bg-[#0082bd] text-white font-extrabold text-[10px] shrink-0 cursor-pointer transition-all"
              >
                {webhookCopied ? 'Copiado!' : 'Copiar URL'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-400">
              Evento a marcar no Mercado Pago: <strong>Pagamentos (payment)</strong>.
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
