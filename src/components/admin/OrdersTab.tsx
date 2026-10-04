import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types/admin';
import {
  ShoppingBag,
  Search,
  QrCode,
  CreditCard,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  X,
  Download,
  Mail,
  Phone,
  FileCheck,
} from 'lucide-react';

export const OrdersTab: React.FC = () => {
  const { orders, updateOrderStatus, deleteOrder } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    if (!order) return false;
    const q = searchQuery.toLowerCase();
    const orderNum = (order.orderNumber || order.id || '').toLowerCase();
    const custName = (order.customerName || '').toLowerCase();
    const custEmail = (order.customerEmail || '').toLowerCase();

    const matchesSearch =
      !q ||
      orderNum.includes(q) ||
      custName.includes(q) ||
      custEmail.includes(q);

    const matchesStatus =
      selectedStatus === 'all' || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, number?: string) => {
    deleteOrder(id);
    if (viewingOrder?.id === id) {
      setViewingOrder(null);
    }
    showToast(`Pedido ${number || ''} excluído com sucesso!`);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Feedback */}
      {toastNotice && (
        <div className="fixed top-6 right-6 z-50 bg-[#16181d] border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">{toastNotice}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#55c21b]" />
            <span>Gestão de Pedidos & Vendas</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Acompanhe pagamentos via PIX em tempo real, transações de cartão e libere downloads de playbacks.
          </p>
        </div>

        <div className="text-xs font-semibold text-neutral-300">
          Total de {orders.length} pedidos registrados
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111216] border border-white/[0.08] rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, e-mail ou número do pedido..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Todos os Status' },
            { id: 'completed', label: 'Concluídos / Pagos' },
            { id: 'pending', label: 'Aguardando Pagamento' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                selectedStatus === st.id
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-neutral-300">
            <thead className="bg-black/40 text-neutral-400 text-[11px] uppercase border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Pedido / Data</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Playbacks Adquiridos</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    Nenhum pedido encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const safeItems = Array.isArray(order?.items) ? order.items : [];
                  const itemsSummary = safeItems.map((i) => i?.pack?.title || 'Pacote').join(', ') || 'Nenhum item';
                  const itemsCount = safeItems.length;

                  return (
                    <tr key={order?.id || Math.random()} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">
                          {order?.orderNumber || order?.id || 'PED-000000'}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {order?.date || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{order?.customerName || 'Cliente'}</div>
                        <div className="text-[11px] text-neutral-400">
                          {order?.customerEmail || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="line-clamp-1 font-semibold text-neutral-200">
                          {itemsSummary}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {itemsCount} {itemsCount === 1 ? 'pacote' : 'pacotes'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                          {order?.paymentMethod === 'pix' ? (
                            <>
                              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                              <span>PIX</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                              <span>Cartão</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400 tabular-nums">
                        {formatBRL(Number(order?.total) || 0)}
                      </td>

                    <td className="py-3.5 px-4">
                      {order.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Pago & Liberado
                        </span>
                      ) : order.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Aguardando PIX
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/30">
                          Cancelado
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(order)}
                          title="Ver detalhes do pedido"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(order.id, order.orderNumber)}
                          title="Excluir pedido"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111216] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Detalhes do Pedido {viewingOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Customer info */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                <span className="font-bold text-white block">Dados do Cliente:</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div>Nome: <strong className="text-white">{viewingOrder.customerName}</strong></div>
                  <div>E-mail: <strong className="text-white">{viewingOrder.customerEmail}</strong></div>
                  <div>Telefone: <strong className="text-white">{viewingOrder.customerPhone || 'Não informado'}</strong></div>
                  <div>Data da Compra: <strong className="text-white">{viewingOrder.date}</strong></div>
                </div>
              </div>

              {/* Items Purchased */}
              <div className="space-y-2">
                <span className="font-bold text-white block">Pacotes Comprados:</span>
                {(Array.isArray(viewingOrder.items) ? viewingOrder.items : []).map((item, idx) => {
                  const packTracksCount = Array.isArray(item?.pack?.tracks) ? item.pack.tracks.length : 0;
                  return (
                    <div
                      key={item?.pack?.id || idx}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{item?.pack?.title || 'Pacote'}</div>
                        <div className="text-[10px] text-neutral-400">
                          {item?.pack?.artist || 'Artista'} · {packTracksCount} músicas
                        </div>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {formatBRL(Number(item?.pack?.discountPrice) || 0)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatBRL(viewingOrder.subtotal)}</span>
                </div>
                {viewingOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto</span>
                    <span>-{formatBRL(viewingOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-white/5">
                  <span>Total Pago</span>
                  <span className="text-[#55c21b]">{formatBRL(viewingOrder.total)}</span>
                </div>
              </div>

              {/* Status toggles */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold text-neutral-300">Alterar Status:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateOrderStatus(viewingOrder.id, 'completed');
                      setViewingOrder({ ...viewingOrder, status: 'completed' });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      viewingOrder.status === 'completed'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    Marcar Pago & Liberado
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateOrderStatus(viewingOrder.id, 'pending');
                      setViewingOrder({ ...viewingOrder, status: 'pending' });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      viewingOrder.status === 'pending'
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    Aguardando PIX
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
