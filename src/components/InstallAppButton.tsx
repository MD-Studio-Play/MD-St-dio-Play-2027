import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, Check, Sparkles, X, ExternalLink } from 'lucide-react';

export const InstallAppButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running as standalone PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'approved') {
        setIsInstalled(true);
        setIsModalOpen(false);
      }
      setDeferredPrompt(null);
    } else {
      setIsModalOpen(true);
    }
  };

  // Generate and download Windows/Desktop Web Shortcut (.url / .lnk equivalent)
  const handleDownloadDesktopShortcut = () => {
    const shortcutContent = `[InternetShortcut]\r\nURL=https://mdstudioplay.ai.studio/\r\nIconIndex=0\r\nIconFile=https://mdstudioplay.ai.studio/md_studio_logo.jpg\r\nHotKey=0\r\nIDList=\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MD Studio Play - mdstudioplay.ai.studio.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedShortcut(true);
    setTimeout(() => setDownloadedShortcut(false), 4000);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="Instalar App / Criar Atalho na Área de Trabalho"
        className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-xs font-bold shrink-0 shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Instalar Atalho</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* Modal Guide */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#111216] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Instalar MD Stúdio Play
                </h3>
                <p className="text-xs text-neutral-400">
                  Acesse com 1 clique direto na Área de Trabalho
                </p>
              </div>
            </div>

            {/* Official Domain Badge */}
            <div className="p-3 rounded-2xl bg-black/60 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Link Oficial:</span>
              <span className="font-mono font-bold text-amber-400">
                mdstudioplay.ai.studio
              </span>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {/* Option 1: Native PWA Install (if available) */}
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Aplicativo Web (PWA)</span>
                </button>
              )}

              {/* Option 2: Download Desktop Shortcut (.url / .lnk) */}
              <button
                type="button"
                onClick={handleDownloadDesktopShortcut}
                className="w-full p-3.5 rounded-2xl bg-[#1b1c22] hover:bg-[#23252d] border border-white/15 hover:border-emerald-500/50 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold">Baixar Atalho para PC (.url)</p>
                    <p className="text-[10px] text-neutral-400 font-normal">
                      Salva na Área de Trabalho do Windows
                    </p>
                  </div>
                </div>
                {downloadedShortcut ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <Check className="w-4 h-4" /> Baixado!
                  </span>
                ) : (
                  <Download className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {/* Mobile Info */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Como instalar no Celular:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-neutral-400 pl-6 list-disc">
                  <li>
                    <strong>Android (Chrome):</strong> Toque nos 3 pontinhos e selecione{' '}
                    <span className="text-white font-semibold">"Instalar aplicativo"</span> ou{' '}
                    <span className="text-white font-semibold">"Adicionar à tela inicial"</span>.
                  </li>
                  <li>
                    <strong>iPhone (Safari):</strong> Toque no botão de compartilhar{' '}
                    <span className="text-white font-semibold">[↑]</span> e depois em{' '}
                    <span className="text-white font-semibold">"Adicionar à Tela de Início"</span>.
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Fechar janela
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
