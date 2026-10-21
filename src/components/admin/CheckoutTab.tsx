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
  EyeOff,
} from 'lucide-react';
import { MercadoPagoIntegrationModal } from '../MercadoPagoIntegrationModal';

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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          accessToken: accessTokenInput.trim(),
        }),
      });
      let data: any = null;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (data && data.success) {
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
          message: data?.error || 'Access Token inválido ou não autorizado no Mercado Pago.',
        });
      }
    } catch (err: any) {
      setTestState({
        loading: false,
        success: false,
        message: 'Erro de comunicação ao testar o token no Mercado Pago.',
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
    const url = 'https://mdstudioplay.com.br/api/mercadopago/webhook';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
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

  const webhookUrl = 'https://mdstudioplay.com.br/api/mercadopago/webhook';

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

      {/* Compartimento Oficial de Integração Mercado Pago */}
      <MercadoPagoIntegrationModal isOpen={true} onClose={() => {}} isInline={true} />

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
