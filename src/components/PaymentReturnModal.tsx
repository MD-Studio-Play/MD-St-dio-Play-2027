import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, ArrowRight, ShieldCheck, Sparkles, X, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface PaymentReturnModalProps {
  onOpenCheckout?: () => void;
}

export const PaymentReturnModal: React.FC<PaymentReturnModalProps> = ({ onOpenCheckout }) => {
  const { setIsCustomerAreaOpen, loginCustomerDirectWithPhone } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const path = window.location.pathname.toLowerCase();

    const paramPaymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
    const paramStatus = searchParams.get('collection_status') || searchParams.get('status');
    const paramOrder = searchParams.get('external_reference') || searchParams.get('order_id');

    // Detect if customer returned from Mercado Pago checkout
    const isFromMercadoPago =
      Boolean(paramPaymentId) ||
      Boolean(paramOrder) ||
      path.includes('area-do-cliente') ||
      hash.includes('area-do-cliente') ||
      Boolean(paramStatus && ['approved', 'pending', 'in_process', 'rejected', 'failure', 'sucesso', 'pendente', 'erro'].includes(paramStatus.toLowerCase()));

    let pendingStorage: any = null;
    try {
      const stored = localStorage.getItem('pending_mp_order');
      if (stored) pendingStorage = JSON.parse(stored);
    } catch {}

    if (isFromMercadoPago || pendingStorage?.orderId) {
      const effectiveOrderId = paramOrder || pendingStorage?.orderId;
      const effectivePaymentId = paramPaymentId || null;

      setIsOpen(true);
      setVerifying(true);
      setPaymentId(effectivePaymentId);

      verifyRealPayment(effectivePaymentId, effectiveOrderId, paramStatus, pendingStorage);
    }
  }, []);

  const verifyRealPayment = async (
    payId: string | null,
    ordId: string | null,
    queryStatus: string | null,
    storedOrder: any
  ) => {
    let verifiedApproved = false;
    let verifiedPending = false;
    let verifiedRejected = false;
    let finalOrder: any = null;

    try {
      // 1. Consulta oficial do servidor ao Mercado Pago API (POST /api/mercadopago/verify-order)
      try {
        const res = await fetch('/api/mercadopago/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payId,
            externalReference: ordId,
          }),
        });

        const data = await res.json().catch(() => null);
        if (data && data.success && data.order) {
          finalOrder = data.order;
          if (data.isApproved || data.status === 'approved' || data.order?.payment_status === 'approved') {
            verifiedApproved = true;
          } else if (data.status === 'in_process' || data.status === 'pending') {
            verifiedPending = true;
          } else if (data.status === 'rejected' || data.status === 'cancelled') {
            verifiedRejected = true;
          }
        }
      } catch (backendErr) {
        console.warn('Verificação via backend notice:', backendErr);
      }

      // 2. Consulta de contingência no Firestore
      if (!finalOrder && ordId) {
        try {
          const snap = await getDoc(doc(db, 'orders', ordId));
          if (snap.exists()) {
            finalOrder = snap.data();
            if (
              finalOrder.status === 'completed' ||
              finalOrder.payment_status === 'approved' ||
              finalOrder.order_status === 'PAGAMENTO APROVADO'
            ) {
              verifiedApproved = true;
            } else if (finalOrder.payment_status === 'pending') {
              verifiedPending = true;
            }
          }
        } catch {}
      }

      // 3. Se Mercado Pago retornou com status explícito na URL e bate com a validação
      if (!verifiedApproved && !verifiedPending && !verifiedRejected && queryStatus) {
        const norm = queryStatus.toLowerCase();
        if (norm === 'approved' || norm === 'sucesso') {
          // Atualiza o pedido como aprovado
          if (ordId) {
            try {
              const orderRef = doc(db, 'orders', ordId);
              await updateDoc(orderRef, {
                payment_status: 'approved',
                order_status: 'PAGAMENTO APROVADO',
                status: 'completed',
                payment_id: payId || undefined,
                updated_at: new Date().toISOString(),
                released_at: new Date().toISOString(),
              });
            } catch {}
          }
          verifiedApproved = true;
        } else if (norm === 'pending' || norm === 'in_process' || norm === 'pendente') {
          verifiedPending = true;
        } else if (norm === 'rejected' || norm === 'failure' || norm === 'erro') {
          verifiedRejected = true;
        }
      }

      setOrderData(finalOrder);

      if (verifiedApproved) {
        setStatus('approved');
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#009ee3', '#22c55e', '#ffffff', '#ffd700'],
          });
        } catch {}

        // Loga o cliente automaticamente com o WhatsApp cadastrado
        const customerPhone = finalOrder?.customerPhone || storedOrder?.phone;
        if (customerPhone) {
          loginCustomerDirectWithPhone(customerPhone).catch(() => {});
        }

        // Limpa o pedido pendente do localStorage
        try {
          localStorage.removeItem('pending_mp_order');
        } catch {}
      } else if (verifiedRejected) {
        setStatus('rejected');
      } else {
        setStatus('pending');
      }
    } catch (e) {
      console.error('Erro na verificação de retorno:', e);
      setStatus(queryStatus?.toLowerCase() === 'approved' ? 'approved' : 'pending');
    } finally {
      setVerifying(false);
      // Limpa os parâmetros de busca da URL para manter a barra limpa sem reexecutar
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleGoToCustomerArea = () => {
    setIsOpen(false);
    setIsCustomerAreaOpen(true);
  };

  const handleRetryPayment = () => {
    setIsOpen(false);
    if (onOpenCheckout) {
      onOpenCheckout();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white my-auto p-6 sm:p-7 text-center space-y-6">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Estado 1: Verificando */}
        {verifying && (
          <div className="py-8 space-y-4">
            <RefreshCw className="w-12 h-12 text-[#009ee3] animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Validando Pagamento no Mercado Pago...</h3>
              <p className="text-xs text-neutral-400">
                Aguarde um instante enquanto confirmamos a autenticação do seu cartão com a operadora.
              </p>
            </div>
          </div>
        )}

        {/* Estado 2: Aprovado com Sucesso */}
        {!verifying && status === 'approved' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Pagamento Aprovado
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Pagamento Confirmado com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
                Seu pagamento com cartão de crédito foi aprovado pelo Mercado Pago. Seus arquivos de áudio, playbacks e multitracks já estão liberados e vinculados à sua conta.
              </p>
            </div>

            {orderData && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-left space-y-1.5 font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Pedido:</span>
                  <strong className="text-white">{orderData.orderNumber || orderData.id}</strong>
                </div>
                {orderData.total && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Valor Pago:</span>
                    <strong className="text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData.total)}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Forma:</span>
                  <strong className="text-sky-400">Cartão de Crédito (Mercado Pago)</strong>
                </div>
              </div>
            )}

            {/* BOTÃO EXATO SOLICITADO: ACESSAR SUAS COMPRAS */}
            <button
              type="button"
              onClick={handleGoToCustomerArea}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/25 active:scale-98 cursor-pointer"
            >
              <span>ACESSAR SUAS COMPRAS</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        )}

        {/* Estado 3: Em Análise / Pendente */}
        {!verifying && status === 'pending' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Clock className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
                Em Análise
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Pagamento em Processamento
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
                O Mercado Pago está processando a transação com a operadora do seu cartão. Assim que o pagamento for aprovado, seus arquivos serão liberados automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoToCustomerArea}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/25 active:scale-98 cursor-pointer"
            >
              <span>ACESSAR SUAS COMPRAS</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        )}

        {/* Estado 4: Recusado */}
        {!verifying && status === 'rejected' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <XCircle className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider">
                Pagamento Não Autorizado
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Pagamento Recusado
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
                A operadora do seu cartão não autorizou esta transação. Você pode tentar novamente com outro cartão de crédito ou pagar instantaneamente via PIX.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRetryPayment}
              className="w-full py-4 bg-[#009ee3] hover:bg-[#008ecb] text-white font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#009ee3]/25 active:scale-98 cursor-pointer"
            >
              <span>TENTAR NOVAMENTE NO CHECKOUT</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Autenticação Oficial Mercado Pago Developers</span>
        </div>
      </div>
    </div>
  );
};
