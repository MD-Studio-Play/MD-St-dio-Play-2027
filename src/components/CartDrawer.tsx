import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  FileMusic,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { CartItem } from '../types';
import { useStore } from '../context/StoreContext';
import { PackThumbnail } from './PackThumbnail';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (packId: string) => void;
  onUpdateQuantity?: (packId: string, quantity: number) => void;
  onClearCart: () => void;
  onOpenCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
}) => {
  const { menuConfig, themeConfig } = useStore();

  if (!isOpen) return null;

  // Subtotal calculated in cents to avoid precision errors
  const totalCents = items.reduce(
    (acc, item) =>
      acc +
      Math.round(Number(item.pack.discountPrice || 57.99) * 100) *
        Math.max(1, Number(item.quantity) || 1),
    0
  );
  const total = totalCents / 100;

  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Direct WhatsApp order dispatch
  const handleOrderViaWhatsApp = () => {
    if (items.length === 0) return;

    let targetPhone = (menuConfig.whatsappNumber || '5527996509853').replace(/\D/g, '');
    if (targetPhone.length <= 11 && !targetPhone.startsWith('55')) {
      targetPhone = `55${targetPhone}`;
    }

    const itemsList = items
      .map(
        (item, idx) =>
          `${idx + 1}. *${item.pack.title}* (${item.quantity}x) - ${formatCurrency(
            item.pack.discountPrice * item.quantity
          )}`
      )
      .join('\n');

    const message = [
      '🎶 *NOVO PEDIDO - MD STÚDIO PLAY* 🎶',
      '',
      'Olá! Gostaria de adquirir os seguintes playbacks/multitracks:',
      '',
      itemsList,
      '',
      `💰 *Valor Total: ${formatCurrency(total)}*`,
      '',
      'Como posso prosseguir para receber o acesso aos arquivos?',
    ].join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0d0e12] border-l border-white/10 text-white flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#12141a]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                style={{
                  backgroundColor: `${themeConfig.primaryColor}20`,
                  color: themeConfig.primaryColor,
                  border: `1px solid ${themeConfig.primaryColor}40`,
                }}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Seu Carrinho</h3>
                <p className="text-xs text-neutral-400">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item selecionado' : 'itens selecionados'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <FileMusic className="w-12 h-12 text-neutral-600 mx-auto" />
                <p className="text-neutral-400 text-sm">Seu carrinho está vazio.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  Explorar os pacotes de playbacks na loja &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* List of Cart Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.pack.id}
                      className="p-3 rounded-2xl bg-[#12141a] border border-white/5 flex items-center justify-between gap-3 shadow-sm hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <PackThumbnail pack={item.pack} size="sm" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {item.pack.title}
                          </h4>
                          <span className="text-[11px] text-neutral-400 block truncate">
                            {item.pack.tracks?.length || 0} faixas · {item.pack.genre}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                            {formatCurrency(item.pack.discountPrice * item.quantity)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls: - [ Qty ] + */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateQuantity) {
                                onUpdateQuantity(item.pack.id, item.quantity - 1);
                              } else if (item.quantity <= 1) {
                                onRemoveItem(item.pack.id);
                              }
                            }}
                            title="Diminuir quantidade"
                            className="w-7 h-7 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-black text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateQuantity) {
                                onUpdateQuantity(item.pack.id, item.quantity + 1);
                              }
                            }}
                            title="Aumentar quantidade"
                            className="w-7 h-7 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </div>

                        {/* Direct Remove Button */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.pack.id)}
                          aria-label="Remover item do carrinho"
                          title="Remover"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Back to store button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Adicionar mais produtos (Voltar para a Loja)</span>
                </button>

                {/* Order Summary */}
                <div className="bg-[#12141a] border border-white/10 rounded-2xl p-4 space-y-2 text-xs shadow-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Itens no Carrinho</span>
                    <span className="font-bold text-white">
                      {totalItemsCount} {totalItemsCount === 1 ? 'unidade' : 'unidades'}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-black text-base pt-2 border-t border-white/10">
                    <span>Total do Pedido</span>
                    <span className="text-emerald-400 tabular-nums text-lg font-black">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Clear Cart Button */}
                {items.length > 0 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer underline"
                    >
                      Limpar todo o carrinho
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer CTA: Direct WhatsApp Order */}
          {items.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-[#12141a] space-y-2 shrink-0">
              <button
                type="button"
                onClick={handleOrderViaWhatsApp}
                className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white stroke-none" />
                <span>Fazer Pedido via WhatsApp</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Atendimento direto e envio imediato dos arquivos</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
