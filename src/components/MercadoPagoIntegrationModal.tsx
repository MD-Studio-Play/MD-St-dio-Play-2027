import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
  Lock,
  RefreshCw,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Clipboard,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface MercadoPagoIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean; // When rendered directly inside CheckoutTab
}

export const MercadoPagoIntegrationModal: React.FC<MercadoPagoIntegrationModalProps> = ({
  isOpen,
  onClose,
  isInline = false,
}) => {
  const { checkoutConfig, setCheckoutConfig } = useStore();

  const [accessTokenInput, setAccessTokenInput] = useState(
    checkoutConfig.mercadoPagoAccessToken || ''
  );
  const [publicKeyInput, setPublicKeyInput] = useState(
    checkoutConfig.mercadoPagoPublicKey || ''
  );
  const [isSandboxInput, setIsSandboxInput] = useState(
    checkoutConfig.isSandbox ?? false
  );

  const [showToken, setShowToken] = useState(false);
  const [showPublic, setShowPublic] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [saveErrorNotice, setSaveErrorNotice] = useState<string | null>(null);

  // Test connection state
  const [testState, setTestState] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    seller?: {
      id?: number;
      nickname?: string;
      email?: string;
      site_id?: string;
    } | null;
    isSandbox?: boolean;
  }>({ loading: false });

  // Live status from server
  const [serverStatus, setServerStatus] = useState<{
    configured?: boolean;
    hasAccessToken?: boolean;
    hasPublicKey?: boolean;
    mode?: 'production' | 'test';
    seller?: {
      id?: number;
      nickname?: string;
      email?: string;
      site_id?: string;
    } | null;
    tokenPrefix?: string | null;
  } | null>(null);

  const webhookUrl = 'https://mdstudioplay.com.br/api/mercadopago/webhook';

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/mercadopago/status', {
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && typeof data === 'object') {
          setServerStatus(data);
        }
      } catch {}
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen || isInline) {
      fetchServerStatus();
    }
  }, [isOpen, isInline]);

  // Sync inputs with checkoutConfig
  useEffect(() => {
    if (checkoutConfig.mercadoPagoAccessToken && !accessTokenInput) {
      setAccessTokenInput(checkoutConfig.mercadoPagoAccessToken);
    }
    if (checkoutConfig.mercadoPagoPublicKey && !publicKeyInput) {
      setPublicKeyInput(checkoutConfig.mercadoPagoPublicKey);
    }
    if (checkoutConfig.isSandbox !== undefined) {
      setIsSandboxInput(checkoutConfig.isSandbox);
    }
  }, [checkoutConfig]);

  // Esc key closes modal when not inline
  useEffect(() => {
    if (isInline || !isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInline, onClose]);

  const handleCopyWebhookUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 3000);
    }
  };

  const handlePasteToken = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setAccessTokenInput(text.trim());
        }
      }
    } catch {
      // clipboard read permission denied
    }
  };

  const handlePastePublicKey = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPublicKeyInput(text.trim());
        }
      }
    } catch {
      // clipboard read permission denied
    }
  };

  // 1. Test credentials with Mercado Pago API (Server with Direct Fallback)
  const handleTestConnection = async () => {
    let token = accessTokenInput.trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    token = token.replace(/^["']|["']$/g, '').trim();

    if (!token) {
      setTestState({
        loading: false,
        success: false,
        message: 'Por favor, informe o Access Token antes de realizar o teste.',
      });
      return;
    }

    setTestState({ loading: true, message: undefined });

    let responseData: any = null;

    // Step A: Attempt server-side verification
    try {
      const res = await fetch('/api/mercadopago/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ accessToken: token }),
      });

      const rawText = await res.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = null;
      }
    } catch (serverErr) {
      console.warn('Servidor local inacessível para test-connection:', serverErr);
      responseData = null;
    }

    // Step B: Direct fallback to Mercado Pago API if backend returned non-JSON or network failed
    if (!responseData || typeof responseData !== 'object') {
      try {
        const directRes = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const directText = await directRes.text();
        let directJson: any = {};
        try {
          directJson = JSON.parse(directText);
        } catch {
          directJson = {};
        }

        if (directRes.ok && directJson.id) {
          const isSandbox = token.startsWith('TEST-');
          responseData = {
            success: true,
            message: `Conexão validada diretamente com Mercado Pago! Vendedor: ${directJson.nickname || 'Autenticado'} (ID: ${directJson.id})`,
            seller: {
              id: directJson.id,
              nickname: directJson.nickname,
              email: directJson.email,
              site_id: directJson.site_id,
            },
            isSandbox,
          };
        } else {
          responseData = {
            success: false,
            error: directJson.message || 'Access Token inválido ou não autorizado no Mercado Pago.',
          };
        }
      } catch (directErr: any) {
        responseData = {
          success: false,
          error: directErr?.message || 'Falha de comunicação ao testar token no Mercado Pago.',
        };
      }
    }

    if (responseData && responseData.success) {
      setTestState({
        loading: false,
        success: true,
        message: responseData.message || 'Conexão com Mercado Pago validada com 100% de sucesso!',
        seller: responseData.seller,
        isSandbox: responseData.isSandbox,
      });
      fetchServerStatus();
    } else {
      setTestState({
        loading: false,
        success: false,
        message:
          responseData?.error ||
          'Access Token inválido ou expirado no Mercado Pago. Verifique suas credenciais em mercadopago.com.br/developers.',
      });
    }
  };

  // 2. Save definitive credentials
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveDefinitive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let cleanToken = accessTokenInput.trim();
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      cleanToken = cleanToken.slice(7).trim();
    }
    cleanToken = cleanToken.replace(/^["']|["']$/g, '').trim();

    let cleanPublic = publicKeyInput.trim();
    cleanPublic = cleanPublic.replace(/^["']|["']$/g, '').trim();

    if (!cleanToken) {
      setSaveErrorNotice('O Access Token do Mercado Pago é obrigatório.');
      setTimeout(() => setSaveErrorNotice(null), 3500);
      return;
    }

    setIsSaving(true);
    setSaveErrorNotice(null);

    try {
      // Persist to backend and Firestore
      const res = await fetch('/api/mercadopago/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          accessToken: cleanToken,
          publicKey: cleanPublic,
          isSandbox: isSandboxInput,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (data && data.success === false) {
        throw new Error(data.error || 'Falha ao salvar no Mercado Pago.');
      }

      // Update global context & local storage
      setCheckoutConfig({
        ...checkoutConfig,
        pixGateway: 'mercadopago',
        creditCardGateway: 'mercadopago',
        mercadoPagoAccessToken: cleanToken,
        mercadoPagoPublicKey: cleanPublic,
        isSandbox: isSandboxInput,
      });

      setSaveSuccessNotice(true);
      fetchServerStatus();
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } catch (err: any) {
      setSaveErrorNotice(
        err.message || 'Erro ao persistir as credenciais definitivas.'
      );
      setTimeout(() => setSaveErrorNotice(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen && !isInline) return null;

  const isProductionToken = accessTokenInput.startsWith('APP_USR-');
  const isTestToken = accessTokenInput.startsWith('TEST-');
  const isConfigured =
    serverStatus?.hasAccessToken || (accessTokenInput && accessTokenInput.length > 10);

  const content = (
    <div className="space-y-6">
      {/* Feedback Alerts */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 font-black">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="text-xs">
            <strong className="block text-white text-sm font-black">
              Credenciais Definitivas Salvas com Sucesso!
            </strong>
            <span>
              O site agora está integrado ao Mercado Pago e pronto para gerar cobranças PIX oficiais e receber pagamentos.
            </span>
          </div>
        </div>
      )}

      {saveErrorNotice && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div className="text-xs">
            <strong className="block text-white font-bold">Atenção ao Salvar:</strong>
            <span>{saveErrorNotice}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#009ee3]/20 via-[#009ee3]/10 to-transparent border border-[#009ee3]/30 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#009ee3] text-white flex items-center justify-center shadow-lg shadow-[#009ee3]/30 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#009ee3] text-white text-[10px] font-black uppercase tracking-wider">
                  Mercado Pago Oficial
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  PIX Instantâneo & Cartão
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5 tracking-tight">
                Compartimento de Integração Definitiva
              </h3>
              <p className="text-xs text-neutral-300 mt-1 max-w-xl leading-relaxed">
                Insira abaixo o seu <strong>Access Token</strong> e <strong>Public Key</strong> definitivos da sua conta Mercado Pago para habilitar cobranças reais via PIX do Banco Central no site.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                isConfigured
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{isConfigured ? 'Gateway Ativo' : 'Aguardando Credencial'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#009ee3]" />
              <h4 className="text-sm font-bold text-white">
                Chaves de Acesso da Sua Conta
              </h4>
            </div>

            {/* Sandbox / Produção Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <span
                className={
                  isSandboxInput ? 'text-amber-400 font-bold' : 'text-neutral-400'
                }
              >
                {isSandboxInput ? 'Sandbox (Testes)' : 'Produção (Vendas Reais)'}
              </span>
              <input
                type="checkbox"
                checked={isSandboxInput}
                onChange={(e) => setIsSandboxInput(e.target.checked)}
                className="w-4 h-4 accent-[#009ee3] cursor-pointer"
              />
            </label>
          </div>

          <form onSubmit={handleSaveDefinitive} className="space-y-4 text-xs">
            {/* 1. Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-neutral-200 font-bold flex items-center gap-1.5">
                  <span>Access Token do Mercado Pago</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                    Obrigatório
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteToken}
                  className="text-[11px] text-[#009ee3] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Colar</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  required
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  placeholder="APP_USR-xxxxxxxxxxxxxxxx-xxxxxx ou TEST-xxxxxxxx"
                  className="w-full bg-black/60 border border-white/15 focus:border-[#009ee3] rounded-xl p-3 pr-20 text-white font-mono outline-none text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white px-1.5 py-1"
                  title={showToken ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Badge based on prefix */}
              {isProductionToken && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Token Oficial de Produção Detectado (APP_USR-).</strong> Pronto para receber valores reais em sua conta bancária.
                  </span>
                </div>
              )}
              {isTestToken && (
                <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Token de Teste Detectado (TEST-).</strong> Use apenas para testes com compradores simulados.
                  </span>
                </div>
              )}

              <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                Este token é armazenado no servidor para gerar o QR Code PIX dinâmico com valor exato de cada pedido e confirmar via Webhook.
              </p>
            </div>

            {/* 2. Public Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-neutral-200 font-bold flex items-center gap-1.5">
                  <span>Public Key do Mercado Pago</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-semibold">
                    Recomendado
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handlePastePublicKey}
                  className="text-[11px] text-[#009ee3] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Colar</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPublic ? 'text' : 'password'}
                  value={publicKeyInput}
                  onChange={(e) => setPublicKeyInput(e.target.value)}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-black/60 border border-white/15 focus:border-[#009ee3] rounded-xl p-3 pr-20 text-white font-mono outline-none text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPublic(!showPublic)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white px-1.5 py-1"
                  title={showPublic ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Utilizado para identificação e tokenização de cartão no frontend.
              </p>
            </div>

            {/* Buttons: Test Connection & Save */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.loading || !accessTokenInput.trim()}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {testState.loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#009ee3]" />
                    <span>Validando Credencial no Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[#009ee3]" />
                    <span>Testar Conexão Oficial</span>
                  </>
                )}
              </button>

              {/* Test Connection Results */}
              {testState.message && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 animate-in fade-in duration-200 ${
                    testState.success
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black">
                    {testState.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{testState.message}</span>
                  </div>
                  {testState.seller && (
                    <div className="text-[11px] text-neutral-300 pl-6 space-y-0.5 font-mono">
                      <div>Conta: <strong>{testState.seller.nickname}</strong></div>
                      <div>ID do Vendedor: <strong>{testState.seller.id}</strong></div>
                      <div>País / Site: <strong>{testState.seller.site_id}</strong> (Brasil)</div>
                    </div>
                  )}
                </div>
              )}

              {/* Definitive Save Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-[#009ee3] hover:bg-[#0082bd] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#009ee3]/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando Credenciais Definitivas...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Salvar Credenciais Definitivas no Site</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Webhook & Step-by-Step Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Official Webhook Box */}
          <div className="bg-[#111216] border border-[#009ee3]/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 font-bold text-[#009ee3] text-sm">
              <Globe className="w-4 h-4" />
              <span>URL do Webhook Oficial</span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Cadastre exatamente esta URL no painel do Mercado Pago (em <strong>Suas integrações &gt; Webhooks / Notificações IPN</strong>):
            </p>

            <div className="bg-black/80 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-mono text-[#009ee3] break-all select-all font-semibold">
                {webhookUrl}
              </div>

              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="w-full py-2 rounded-lg bg-[#009ee3] hover:bg-[#0082bd] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow active:scale-95"
              >
                {webhookCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>URL Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar URL do Webhook</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-neutral-400 bg-white/[0.03] p-2.5 rounded-lg border border-white/5 space-y-1">
              <div>
                <strong>Evento a selecionar:</strong> Pagamentos (<code>payment</code>)
              </div>
              <div>
                <strong>Status:</strong> Notificação automática instantânea
              </div>
            </div>
          </div>

          {/* Step-by-Step Guide Box */}
          <div className="bg-[#111216] border border-white/10 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <HelpCircle className="w-4 h-4 text-[#009ee3]" />
              <span>Como Obter Suas Chaves Definitivas</span>
            </div>

            <ol className="space-y-2 text-[11px] text-neutral-300 list-decimal list-inside leading-relaxed">
              <li>
                Acesse o painel:{' '}
                <a
                  href="https://www.mercadopago.com.br/developers/panel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#009ee3] underline font-bold inline-flex items-center gap-1"
                >
                  <span>mercadopago.com.br/developers</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Clique em <strong>Suas integrações</strong> e abra sua aplicação.
              </li>
              <li>
                No menu lateral esquerdo, vá em <strong>Credenciais de produção</strong>.
              </li>
              <li>
                Copie o <strong>Access Token</strong> (<code className="text-emerald-400 font-mono">APP_USR-...</code>) e a <strong>Public Key</strong>.
              </li>
              <li>
                Cole nos campos ao lado e clique em <strong>Salvar Credenciais Definitivas</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );

  // If rendered as a standalone modal
  if (!isInline) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="w-full max-w-4xl bg-[#0e1014] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {content}
        </div>
      </div>
    );
  }

  // If rendered inline (e.g. inside CheckoutTab)
  return content;
};
