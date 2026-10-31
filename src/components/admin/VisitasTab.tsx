import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Users,
  Eye,
  Calendar,
  Smartphone,
  Laptop,
  Tablet,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Compass,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const VisitasTab: React.FC = () => {
  const { visitorStats, isLoadingVisitorStats, refreshVisitorStats, resetVisitorStats, orders = [] } = useStore();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const completedOrdersCount = safeOrders.filter((o) => o?.status === 'completed').length;

  const totalVisits = visitorStats?.totalVisits || 0;
  const uniqueVisitors = visitorStats?.uniqueVisitors || 0;
  const visitsToday = visitorStats?.visitsToday || 0;
  const uniqueToday = visitorStats?.uniqueToday || 0;
  const visitsThisWeek = visitorStats?.visitsThisWeek || 0;
  const visitsThisMonth = visitorStats?.visitsThisMonth || 0;

  // Conversion rate (sales per visit)
  const conversionRate = totalVisits > 0
    ? ((completedOrdersCount / totalVisits) * 100).toFixed(1)
    : '0.0';

  // Device calculations
  const devices = visitorStats?.deviceBreakdown || { desktop: 0, mobile: 0, tablet: 0 };
  const deviceTotal = (devices.desktop || 0) + (devices.mobile || 0) + (devices.tablet || 0) || 1;
  const desktopPct = Math.round(((devices.desktop || 0) / deviceTotal) * 100);
  const mobilePct = Math.round(((devices.mobile || 0) / deviceTotal) * 100);
  const tabletPct = Math.max(0, 100 - desktopPct - mobilePct);

  // Pages breakdown sorted by views
  const pageEntries = Object.entries(visitorStats?.pageBreakdown || {
    'Loja Principal': 0,
    'MIDI Variados': 0,
    'MIDI Gospel': 0,
    'Flyer Show': 0,
    'Área do Cliente': 0,
  }).sort((a, b) => b[1] - a[1]);

  // Daily history points (last 14 days)
  const historyPoints = Array.isArray(visitorStats?.dailyHistory) ? visitorStats.dailyHistory : [];
  const maxDayVisits = Math.max(
    1,
    ...historyPoints.map((h) => h.visits),
    visitsToday
  );

  const handleReset = async () => {
    await resetVisitorStats();
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#111317] to-black border border-emerald-500/20 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Monitoramento em Tempo Real
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Métricas de Visitas & Tráfego</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Acompanhe o fluxo de visitantes no site, visualizações de páginas, acessos de smartphones e computadores e conversão em vendas de playbacks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={refreshVisitorStats}
            disabled={isLoadingVisitorStats}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-white/10 disabled:opacity-50 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingVisitorStats ? 'animate-spin' : ''}`} />
            <span>{isLoadingVisitorStats ? 'Atualizando...' : 'Atualizar Dados'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 font-medium text-xs flex items-center gap-1.5 transition-colors border border-red-500/20 cursor-pointer"
            title="Resetar contadores de visitas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span>Zerar Estatísticas</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Reset */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161d] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Zerar estatísticas de visitas?</h3>
            <p className="text-xs text-neutral-400">
              Esta ação irá reiniciar os contadores de acessos, dispositivos e páginas visitadas. Deseja prosseguir?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500"
              >
                Sim, Zerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Visits */}
        <div className="bg-[#111216] border border-white/[0.08] hover:border-emerald-500/40 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Total de Visitas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {totalVisits.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visualizações gerais</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-[#111216] border border-white/[0.08] hover:border-cyan-500/40 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Visitantes Únicos</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {uniqueVisitors.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Pessoas distintas conectadas
          </div>
        </div>

        {/* Visits Today */}
        <div className="bg-[#111216] border border-white/[0.08] hover:border-amber-500/40 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Acessos Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {visitsToday.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              ({uniqueToday} únicos)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Dia atual ({visitorStats?.todayDate || 'Hoje'})</span>
          </div>
        </div>

        {/* Visits This Week / Month */}
        <div className="bg-[#111216] border border-white/[0.08] hover:border-purple-500/40 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Nesta Semana / Mês</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {visitsThisWeek.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Mês atual: <strong className="text-purple-300">{visitsThisMonth.toLocaleString('pt-BR')}</strong>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-[#111216] border border-white/[0.08] hover:border-emerald-500/40 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold">Taxa de Conversão</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {conversionRate}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            {completedOrdersCount} compras / {totalVisits} visitas
          </div>
        </div>
      </div>

      {/* Grid: Charts & Devices & Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown Card */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Acessos por Dispositivo</span>
            </h3>
            <span className="text-[11px] text-neutral-400 font-medium">Distribuição</span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Mobile / Smartphone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Smartphone / Mobile</span>
                </span>
                <span className="font-bold text-white">
                  {devices.mobile || 0} ({mobilePct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${mobilePct}%` }}
                />
              </div>
            </div>

            {/* Desktop / Computador */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Computador / Desktop</span>
                </span>
                <span className="font-bold text-white">
                  {devices.desktop || 0} ({desktopPct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${desktopPct}%` }}
                />
              </div>
            </div>

            {/* Tablet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <Tablet className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tablet / iPad</span>
                </span>
                <span className="font-bold text-white">
                  {devices.tablet || 0} ({tabletPct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-500"
                  style={{ width: `${tabletPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-neutral-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>O layout da loja se adapta automaticamente ao tamanho da tela do visitante.</span>
          </div>
        </div>

        {/* Most Viewed Pages */}
        <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Páginas & Setores Mais Acessados</span>
            </h3>
            <span className="text-[11px] text-neutral-400 font-medium">Visualizações</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {pageEntries.map(([pageName, views], idx) => {
              const pct = totalVisits > 0 ? Math.round((views / totalVisits) * 100) : 0;
              return (
                <div
                  key={pageName}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-white/5 text-neutral-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {pageName}
                    </span>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-black text-emerald-400">
                      {views}
                    </span>
                    <span className="text-[10px] text-neutral-500 ml-1">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Visits Activity Log */}
      <div className="bg-[#111216] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Registro de Acessos Recentes</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Últimas conexões recebidas no site em tempo real
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-400">
            {visitorStats?.recentVisits?.length || 0} acessos recentes
          </span>
        </div>

        {visitorStats?.recentVisits && visitorStats.recentVisits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-500 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Data / Horário</th>
                  <th className="py-2.5 px-3">Dispositivo</th>
                  <th className="py-2.5 px-3">Página Acessada</th>
                  <th className="py-2.5 px-3">Navegador</th>
                  <th className="py-2.5 px-3 text-right">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visitorStats.recentVisits.slice(0, 15).map((visit, idx) => {
                  const visitDate = new Date(visit.timestamp);
                  const formattedTime = !isNaN(visitDate.getTime())
                    ? visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '--:--';
                  const formattedDate = !isNaN(visitDate.getTime())
                    ? visitDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '';

                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-neutral-300">
                        {formattedDate} {formattedTime}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 text-[11px]">
                          {visit.device === 'mobile' ? (
                            <Smartphone className="w-3 h-3 text-emerald-400" />
                          ) : visit.device === 'tablet' ? (
                            <Tablet className="w-3 h-3 text-purple-400" />
                          ) : (
                            <Laptop className="w-3 h-3 text-cyan-400" />
                          )}
                          <span className="capitalize">{visit.device}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">
                        {visit.path}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        {visit.browser || 'Navegador Web'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-400">
                        {visit.referrer || 'Acesso Direto'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500 text-xs">
            Nenhum registro de visita recente ainda. Conforme os clientes navegarem no site, os acessos aparecerão aqui automaticamente.
          </div>
        )}
      </div>
    </div>
  );
};
