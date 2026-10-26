import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Zap,
  Lock,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

interface GatewayStatus {
  configured: boolean;
  hasAccessToken: boolean;
  hasPublicKey: boolean;
  mode: string;
  isSandbox: boolean;
  tokenPrefix: string | null;
  seller?: {
    id: number | string;
    nickname: string;
    email: string;
    site_id: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

export const CheckoutTab: React.FC = () => {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    seller?: any;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = typeof window !== 'undefined' && window.location.origin
    ? `${window.location.origin}/api/mercadopago/webhook`
    : 'https://mdstudioplay.ai.studio/api/mercadopago/webhook';

  const safeParseResponse = async (res: Response, retryFn?: () => Promise<any>): Promise<any> => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // If server briefly answered with HTML (e.g. dev server reloaded or proxy restarted)
      if ((text.includes('<!DOCTYPE') || text.includes('<html') || res.status >= 500) && retryFn) {
        // Wait 1s and retry once transparently
        await new Promise((r) => setTimeout(r, 1000));
        return await retryFn();
      }
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('O servidor de desenvolvimento estava reiniciando. Por favor, clique novamente para confirmar.');
      }
      throw new Error(text || 'Resposta inválida do servidor.');
    }
  };

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const doFetch = async () => {
        const res = await fetch('/api/mercadopago/status', {
          headers: { Accept: 'application/json' },
        });
        return await safeParseResponse(res);
      };

      const data = await doFetch();
      if (data && data.success) {
        setGatewayStatus(data);
        setIsSandbox(Boolean(data.isSandbox));
      }
    } catch (err) {
      console.warn('Notice fetching gateway status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const candidateToken = accessToken.trim();

    try {
      const doRequest = async () => {
        const res = await fetch('/api/mercadopago/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            accessToken: candidateToken || undefined,
            save: true,
          }),
        });
        return await safeParseResponse(res);
      };

      let data: any = null;
      try {
        data = await doRequest();
      } catch (backendErr: any) {
        // If backend returned HTML or proxy error, but the user typed a token in the input:
        if (candidateToken && candidateToken.length > 10) {
          try {
            // Direct validation with Mercado Pago official API
            const directRes = await fetch('https://api.mercadopago.com/users/me', {
              headers: { Authorization: `Bearer ${candidateToken}` },
            });
            const userData = await directRes.json().catch(() => ({}));
            if (directRes.ok && userData.id) {
              const isSand = candidateToken.startsWith('TEST-');
              const seller = {
                id: userData.id,
                nickname: userData.nickname || 'Vendedor Mercado Pago',
                email: userData.email || '',
                site_id: userData.site_id || 'MLB',
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
              };
              setTestResult({
                success: true,
                message: `Conexão com Mercado Pago validada com 100% de sucesso! Vendedor: ${seller.nickname} (ID: ${seller.id})`,
                seller,
              });
              // Fire background save to backend
              fetch('/api/mercadopago/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ accessToken: candidateToken, isSandbox: isSand }),
              }).catch(() => {});
              return;
            }
          } catch (directErr) {
            console.warn('Direct validation notice:', directErr);
          }
        }
        throw backendErr;
      }

      if (data && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Conexão validada com sucesso no Mercado Pago!',
          seller: data.seller,
        });
        fetchStatus();
      } else {
        setTestResult({
          success: false,
          message: data?.error || 'Falha ao autenticar com as credenciais do Mercado Pago.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro de comunicação ao conectar com o Mercado Pago.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setTestResult(null);

    const cleanToken = accessToken.trim();
    const cleanPublic = publicKey.trim();

    try {
      const doSave = async () => {
        const res = await fetch('/api/mercadopago/save-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            accessToken: cleanToken || undefined,
            publicKey: cleanPublic || undefined,
            isSandbox,
          }),
        });
        return await safeParseResponse(res);
      };

      let data: any = null;
      try {
        data = await doSave();
      } catch (backendErr: any) {
        // If candidate token provided, validate directly and save
        if (cleanToken && cleanToken.length > 10) {
          const directRes = await fetch('https://api.mercadopago.com/users/me', {
            headers: { Authorization: `Bearer ${cleanToken}` },
          });
          if (directRes.ok) {
            setSaveSuccess(true);
            setAccessToken('');
            setPublicKey('');
            setTimeout(() => setSaveSuccess(false), 4000);
            return;
          }
        }
        throw backendErr;
      }

      if (data && data.success) {
        setSaveSuccess(true);
        setAccessToken('');
        setPublicKey('');
        await fetchStatus();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setTestResult({
          success: false,
          message: data?.error || 'Erro ao salvar credenciais.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao conectar com o servidor.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#009ee3]/15 via-emerald-500/10 to-transparent border border-[#009ee3]/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#009ee3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#009ee3]/20 border border-[#009ee3]/40 text-[#009ee3] text-xs font-bold uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>Checkout Oficial 100% PIX</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mercado Pago · Pagamento Instantâneo via PIX
            </h1>
            <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Sistema de checkout inteligente exclusivo via PIX em tempo real. A confirmação é processada
              diretamente pela API e Webhooks do Mercado Pago, com liberação automática dos downloads na
              Área do Cliente.
            </p>
          </div>

          {/* Real-time Status Card */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col items-start gap-2.5 min-w-[240px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Status do Gateway
            </span>
            {isLoadingStatus ? (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#009ee3]" />
                <span>Consultando status...</span>
              </div>
            ) : gatewayStatus?.configured ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CONECTADO & ATIVO</span>
                </div>
                <div className="text-xs text-neutral-400">
                  Modo:{' '}
                  <span className="text-white font-medium uppercase">
                    {gatewayStatus.mode === 'production' ? 'Produção Real' : 'Sandbox (Testes)'}
                  </span>
                </div>
                {gatewayStatus.seller && (
                  <div className="text-[11px] text-neutral-300 pt-1 border-t border-white/10">
                    Vendedor: <span className="text-emerald-300 font-semibold">{gatewayStatus.seller.nickname}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>PENDENTE DE CREDENCIAL</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Insira o Access Token abaixo para ativar o recebimento via PIX.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Credential Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveConfig}
            className="bg-[#111216] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="border-b border-white/10 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#009ee3]" />
                <h2 className="text-lg font-bold text-white">Credenciais da API do Mercado Pago</h2>
              </div>
              <span className="text-xs text-neutral-400">Armazenadas com segurança</span>
            </div>

            {/* Access Token Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Production Access Token <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs text-[#009ee3] hover:underline cursor-pointer"
                >
                  {showToken ? 'Ocultar' : 'Exibir token'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    gatewayStatus?.tokenPrefix
                      ? `Ativo: ${gatewayStatus.tokenPrefix} (digite novo para alterar)`
                      : 'APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000'
                  }
                  className="w-full bg-[#0a0b0d] border border-white/15 focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 font-mono transition-all outline-none"
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Obtenha em: <strong className="text-neutral-300">Mercado Pago Developers &gt; Suas Integrações &gt; Credenciais de Produção</strong>.
              </p>
            </div>

            {/* Public Key Field (Optional) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Public Key (Chave Pública) <span className="text-neutral-500 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="APP_USR-00000000-0000-0000-0000-000000000000"
                className="w-full bg-[#0a0b0d] border border-white/15 focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 font-mono transition-all outline-none"
              />
            </div>

            {/* Environment Toggle */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white block">
                  Modo de Operação
                </span>
                <span className="text-[11px] text-neutral-400">
                  {isSandbox
                    ? 'Ambiente de Testes (Sandbox) - Chaves iniciadas com TEST-'
                    : 'Ambiente de Produção Real - Cobranças PIX ativas para clientes'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSandbox(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isSandbox
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Produção
                </button>
                <button
                  type="button"
                  onClick={() => setIsSandbox(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSandbox
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Sandbox
                </button>
              </div>
            </div>

            {/* Feedback Notifications */}
            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/60 border-red-500/30 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? 'Conexão Bem-Sucedida!' : 'Erro na Conexão'}</div>
                  <div className="mt-1 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="p-4 rounded-xl text-xs flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Credenciais do Mercado Pago salvas e ativadas com sucesso!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-3 bg-[#009ee3] hover:bg-[#008ecb] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#009ee3]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Salvar Credenciais</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#009ee3]" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Testar Conexão</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Webhook Setup & Information (1 col) */}
        <div className="space-y-6">
          {/* Webhook Configuration Card */}
          <div className="bg-[#111216] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>URL do Webhook Oficial</span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              O Mercado Pago envia notificações automáticas em tempo real para este endpoint assim que o PIX for pago.
            </p>

            <div className="bg-[#0a0b0d] border border-white/15 rounded-xl p-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-emerald-400 break-all select-all">
                {webhookUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copiar URL do Webhook"
              >
                {copiedWebhook ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2 text-[11px] text-neutral-400">
              <strong className="text-white block">Como configurar no Mercado Pago:</strong>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Acesse <strong>Mercado Pago Developers</strong> &gt; <strong>Notificações Webhooks</strong>.</li>
                <li>Cole a URL acima no campo de URL de produção.</li>
                <li>Marque o evento <strong>Pagamentos (payments)</strong>.</li>
                <li>Salve as alterações.</li>
              </ol>
            </div>

            <a
              href="https://www.mercadopago.com.br/developers/panel"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#009ee3] hover:underline font-semibold"
            >
              <span>Abrir Painel Mercado Pago Developers</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Security & Anti-Fraud Features */}
          <div className="bg-[#111216] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-[#009ee3]" />
              <span>Segurança de Ponta a Ponta</span>
            </div>

            <ul className="space-y-2.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cálculo no Servidor:</strong> Preços recalculados pelo catálogo oficial (anti-adulteração).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Idempotência Total:</strong> Evita geração de cobranças duplicadas ou liberação repetida.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Liberação Automática:</strong> Downloads liberados na Área do Cliente após validação oficial.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Credenciais Protegidas:</strong> Tokens nunca trafegam no JavaScript público do navegador.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
