import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  TrendingUp,
  ShoppingBag,
  Disc,
  Music2,
  DollarSign,
  QrCode,
  CreditCard,
  Flame,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  Users,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface DashboardTabProps {
  onNavigateToTab: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigateToTab }) => {
  const { packs = [], orders = [], checkoutConfig, firebaseConfig, visitorStats } = useStore();

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safePacks = Array.isArray(packs) ? packs : [];

  const totalRevenue = safeOrders
    .filter((o) => o?.status === 'completed')
    .reduce((acc, o) => acc + (Number(o?.total) || 0), 0);

  const totalTracks = safePacks.reduce((acc, p) => acc + (Array.isArray(p?.tracks) ? p.tracks.length : 0), 0);

  const pixOrdersCount = safeOrders.filter((o) => o?.paymentMethod === 'pix').length;
  const cardOrdersCount = safeOrders.filter((o) => o?.paymentMethod === 'card').length;

  // Breakdown by genre
  const genreCount = safePacks.reduce((acc: Record<string, number>, pack) => {
    const g = pack?.genre || 'Geral';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & System Status Bar */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#121318] to-black border border-emerald-500/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Painel de Controle Central
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            MD Stúdio Play Store Manager
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Gerencie o catálogo de áudios, gateway oficial de pagamentos PIX AbacatePay em tempo real, pedidos, temas visuais e integrações com o Firebase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('music')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <Music2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adicionar Música</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Faturamento Total</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatBRL(totalRevenue)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Recebido via PIX Oficial</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Vendas Concluídas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {orders.length} pedidos
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-2">
            <span>PIX: <strong className="text-emerald-400">{pixOrdersCount}</strong></span>
            {cardOrdersCount > 0 && (
              <>
                <span>·</span>
                <span>Anteriores: <strong className="text-neutral-400">{cardOrdersCount}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Total Visits KPI Card */}
        <div
          onClick={() => onNavigateToTab('visitas')}
          className="bg-[#111216] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01]"
          title="Clique para abrir detalhes de tráfego e visitas"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Visitas no Site</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {(visitorStats?.totalVisits || 0).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Hoje: <strong className="text-emerald-400">{visitorStats?.visitsToday || 0}</strong></span>
            <span className="text-neutral-500">Únicos: {visitorStats?.uniqueVisitors || 0}</span>
          </div>
        </div>

        {/* Active Playback Packs */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Pacotes de Playbacks</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {packs.length} pacotes
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Disponíveis para venda online
          </div>
        </div>

        {/* Total Tracks */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Faixas Individuais</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Music2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {totalTracks} músicas
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Cadastradas nas listas (Ver lista)
          </div>
        </div>
      </div>

      {/* System Status & Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders & Reconciliation Card */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pedidos & Vendas</h4>
                <p className="text-[11px] text-neutral-400">Conciliação Automática</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              SINCRONIZADO
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Total de Pedidos:</span>
              <span className="font-mono text-white text-[11px] font-bold">
                {safeOrders.length} pedidos
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Pagos / Aprovados:</span>
              <span className="text-emerald-400 font-bold">
                {safeOrders.filter((o) => o.status === 'completed' || o.payment_status === 'approved').length}
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Liberação:</span>
              <span className="text-white text-[11px]">Instantânea via PIX</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('orders')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Ver Pedidos & Histórico</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mercado Pago PIX Card */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#009ee3]/10 text-[#009ee3]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mercado Pago PIX</h4>
                <p className="text-[11px] text-neutral-400">Checkout Oficial em Tempo Real</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#009ee3]/20 border border-[#009ee3]/30 text-[#009ee3] text-[10px] font-bold">
              100% PIX
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Método de Pagamento:</span>
              <span className="text-emerald-400 font-bold">PIX Exclusivo</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Confirmação:</span>
              <span className="text-white text-[11px]">Webhooks + Polling API</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Liberação:</span>
              <span className="text-emerald-400 font-bold">Área do Cliente Imediata</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('checkout')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Configurar Credenciais PIX</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Firebase Card */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Integração Firebase</h4>
                <p className="text-[11px] text-neutral-400">Firestore & Auth</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
              SINCRONIZADO
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Projeto:</span>
              <span className="font-mono text-white text-[11px] truncate max-w-[170px]">
                {firebaseConfig.projectId}
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Status Conexão:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Armazenamento:</span>
              <span className="text-white text-[11px]">Firestore Cloud</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('firebase')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Painel de Integração Firebase</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visitor Traffic & Telemetry Card */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Tráfego & Visitas</h4>
                <p className="text-[11px] text-neutral-400">Contador em Tempo Real</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
              AO VIVO
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Visitas Totais:</span>
              <span className="font-mono text-emerald-400 text-[11px] font-bold">
                {(visitorStats?.totalVisits || 0).toLocaleString('pt-BR')} acessos
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Visitantes Únicos:</span>
              <span className="font-mono text-white text-[11px] font-bold">
                {(visitorStats?.uniqueVisitors || 0).toLocaleString('pt-BR')} pessoas
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Acessos Hoje:</span>
              <span className="text-amber-400 font-bold text-[11px]">
                {visitorStats?.visitsToday || 0} visitas
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('visitas')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Ver Métricas & Relatório de Visitas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Catalog Distribution by Genre */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-3">Distribuição do Catálogo por Gênero</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(genreCount).map(([genre, count]) => (
            <div
              key={genre}
              className="bg-black/40 border border-white/5 rounded-xl p-3 text-center"
            >
              <span className="text-xs text-neutral-400 block truncate">{genre}</span>
              <span className="text-lg font-black text-emerald-400 mt-1 block">
                {count}
              </span>
              <span className="text-[10px] text-neutral-500">pacotes</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white">Pedidos e Vendas Recentes</h4>
            <p className="text-xs text-neutral-400">Últimas transações na loja</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('orders')}
            className="text-xs text-[#55c21b] hover:underline font-bold cursor-pointer"
          >
            Ver todos os pedidos &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-neutral-300">
            <thead className="bg-black/30 text-neutral-400 text-[11px] uppercase border-b border-white/5">
              <tr>
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Itens</th>
                <th className="py-2.5 px-3">Pagamento</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {safeOrders.slice(0, 5).map((order) => {
                const itemsCount = Array.isArray(order?.items) ? order.items.length : 0;
                return (
                  <tr key={order?.id || Math.random()} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {order?.orderNumber || order?.id || 'PED-000000'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{order?.customerName || 'Cliente'}</div>
                      <div className="text-[11px] text-neutral-500">{order?.customerEmail || ''}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[11px]">
                        {itemsCount} {itemsCount === 1 ? 'pacote' : 'pacotes'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 font-bold text-emerald-400 tabular-nums">
                      {formatBRL(Number(order?.total) || 0)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                        {order?.status === 'completed' ? 'Concluído' : order?.status || 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
