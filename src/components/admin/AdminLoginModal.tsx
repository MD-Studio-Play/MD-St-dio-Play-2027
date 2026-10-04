import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { MdStudioLogo } from '../MdStudioLogo';

export const AdminLoginModal: React.FC = () => {
  const {
    loginAdmin,
    setIsAdminMode,
    setIsCustomerAreaOpen,
    themeConfig,
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setError(res.error || 'Credenciais de administrador incorretas.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao realizar login administrativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080a]/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#101216] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black relative overflow-hidden">
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-950/40">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Painel Administrativo Restrito
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Acesso exclusivo para gestão do catálogo, pedidos e personalização
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              E-mail do Administrador *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mdstudio.com.br"
                className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Senha de Acesso *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Validando Acesso...' : 'Entrar no Painel Administrativo'}
          </button>
        </form>

        {/* Back to Store & Customer Area Actions */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsAdminMode(false)}
            className="text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Loja Virtual</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAdminMode(false);
              setIsCustomerAreaOpen(true);
            }}
            className="text-[#55c21b] hover:underline cursor-pointer font-semibold"
          >
            Área do Cliente
          </button>
        </div>
      </div>
    </div>
  );
};
