import React, { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose }) => {
  const [essential, setEssential] = useState(true);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#111216] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-200 z-10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#55c21b]" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Preferências de Cookies
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          Utilizamos cookies para otimizar sua experiência no MD Stúdio Play, manter seu carrinho salvo e oferecer reprodução de áudio sem interrupções.
        </p>

        <div className="space-y-3 pt-2 text-xs">
          {/* Necessários */}
          <div className="flex items-start justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="pr-4">
              <span className="font-semibold text-white block">Cookies Essenciais (Obrigatórios)</span>
              <span className="text-neutral-400 text-[11px]">
                Necessários para o funcionamento básico, reprodução de áudio e carrinho de compras.
              </span>
            </div>
            <input
              type="checkbox"
              checked={essential}
              disabled
              className="accent-[#55c21b] cursor-not-allowed mt-1"
            />
          </div>

          {/* Funcionais */}
          <div className="flex items-start justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="pr-4">
              <span className="font-semibold text-white block">Cookies Funcionais</span>
              <span className="text-neutral-400 text-[11px]">
                Lembram preferências de volume do player e filtros selecionados.
              </span>
            </div>
            <input
              type="checkbox"
              checked={functional}
              onChange={(e) => setFunctional(e.target.checked)}
              className="accent-[#55c21b] cursor-pointer mt-1"
            />
          </div>

          {/* Analíticos */}
          <div className="flex items-start justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="pr-4">
              <span className="font-semibold text-white block">Cookies Analíticos</span>
              <span className="text-neutral-400 text-[11px]">
                Ajudam a entender quais ritmos e faixas são mais procurados pelos músicos.
              </span>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="accent-[#55c21b] cursor-pointer mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs text-neutral-300 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-[#55c21b] hover:bg-[#62dc20] text-black font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Salvo!' : 'Salvar Preferências'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
