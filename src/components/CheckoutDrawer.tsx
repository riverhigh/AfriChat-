import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Wallet,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { openPaystackPopup } from '../services/paystack';

export const CheckoutDrawer: React.FC = () => {
  const {
    activeCheckoutProduct,
    closeCheckout,
    formatPrice,
    createEscrowOrder,
    activeChatId,
    wallet,
    setIsWalletModalOpen,
  } = useApp();

  const [paymentOption, setPaymentOption] = useState<'paystack' | 'wallet'>('paystack');
  const [buyerName, setBuyerName] = useState('Chioma Adebayo');
  const [deliveryAddress, setDeliveryAddress] = useState('14 Admiralty Way, Lekki Phase 1, Lagos');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!activeCheckoutProduct) return null;

  const productPrice = activeCheckoutProduct.price;
  const hasSufficientWalletBalance = wallet.availableBalance >= productPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !activeCheckoutProduct) return;

    setErrorMessage(null);

    if (paymentOption === 'wallet') {
      if (!hasSufficientWalletBalance) {
        setErrorMessage(
          `Insufficient wallet balance (${formatPrice(wallet.availableBalance, 'NGN')}). Top up with Paystack or choose Paystack Direct.`
        );
        return;
      }

      setIsProcessing(true);
      const res = createEscrowOrder(
        activeChatId,
        activeCheckoutProduct,
        'wallet',
        buyerName,
        deliveryAddress
      );
      setIsProcessing(false);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } else {
      // Real Paystack Popup Flow
      setIsProcessing(true);
      const userEmail = currentUser.email || `${currentUser.phoneNumber.replace(/[^0-9]/g, '')}@africhat.africa`;

      openPaystackPopup({
        email: userEmail,
        amount: productPrice,
        currency: activeCheckoutProduct.currency || 'NGN',
        metadata: {
          chatId: activeChatId,
          productId: activeCheckoutProduct.id,
          productTitle: activeCheckoutProduct.title,
          buyerName,
          deliveryAddress,
        },
        onSuccess: (paystackRes) => {
          setIsProcessing(false);
          const res = createEscrowOrder(
            activeChatId,
            activeCheckoutProduct,
            'paystack',
            buyerName,
            deliveryAddress
          );
          if (!res.success && res.error) {
            setErrorMessage(res.error);
          }
        },
        onClose: () => {
          setIsProcessing(false);
          setErrorMessage('Paystack checkout was cancelled.');
        },
        onError: (err) => {
          setIsProcessing(false);
          setErrorMessage(`Payment error: ${err.message || 'Unable to open Paystack'}`);
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-end justify-center animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#18152e] rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 border-t border-slate-200 dark:border-slate-800">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
              Escrow Checkout
            </h3>
          </div>
          <button
            onClick={closeCheckout}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p>{errorMessage}</p>
                {paymentOption === 'wallet' && (
                  <button
                    type="button"
                    onClick={() => {
                      closeCheckout();
                      setIsWalletModalOpen(true);
                    }}
                    className="mt-1 font-semibold underline text-rose-700 dark:text-rose-400"
                  >
                    Open Wallet to Top-up via Paystack →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Product Summary */}
          <div className="flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#11101e] border border-slate-200/80 dark:border-slate-800">
            <img
              src={activeCheckoutProduct.imageUrl}
              alt={activeCheckoutProduct.title}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeCheckoutProduct.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seller: {activeCheckoutProduct.sellerName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(activeCheckoutProduct.price, activeCheckoutProduct.currency)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  100% Escrow Secured
                </span>
              </div>
            </div>
          </div>

          {/* Escrow Guarantee Note */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              Your payment is held safely in the AfriChat Escrow Vault. The seller is only paid after you inspect your parcel and share your 4-digit PIN.
            </p>
          </div>

          {/* Payment Method Selector: Paystack vs AfriChat Wallet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Payment Method
            </label>

            <div className="space-y-2">
              {/* Option 1: Paystack Direct Checkout */}
              <div
                onClick={() => setPaymentOption('paystack')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  paymentOption === 'paystack'
                    ? 'border-[#0ba4db] bg-[#0ba4db]/5 dark:bg-[#0ba4db]/10 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0ba4db]/10 dark:bg-[#0ba4db]/20 text-[#0ba4db] flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Paystack Direct Checkout</span>
                      <span className="text-[10px] bg-[#0ba4db] text-white px-1.5 py-0.2 rounded font-bold">
                        FAST
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Card, Bank Transfer, USSD, Apple Pay via Paystack
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentOption === 'paystack'
                      ? 'border-[#0ba4db] bg-[#0ba4db]'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {paymentOption === 'paystack' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Option 2: AfriChat Wallet */}
              <div
                onClick={() => setPaymentOption('wallet')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  paymentOption === 'wallet'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      AfriChat Wallet Balance
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Available: <strong className="text-indigo-600 dark:text-indigo-400">{formatPrice(wallet.availableBalance, 'NGN')}</strong>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentOption === 'wallet'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {paymentOption === 'wallet' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#11101e] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Delivery Address or Market Landmark
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#11101e] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 text-white ${
                paymentOption === 'paystack'
                  ? 'bg-[#0ba4db] hover:bg-[#0993c5] shadow-[#0ba4db]/25'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {paymentOption === 'paystack'
                      ? 'Opening Paystack Checkout...'
                      : 'Locking Funds from Wallet...'}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {paymentOption === 'paystack'
                      ? `Pay ${formatPrice(productPrice, activeCheckoutProduct.currency)} with Paystack`
                      : `Pay ${formatPrice(productPrice, activeCheckoutProduct.currency)} from Wallet`}
                  </span>
                </>
              )}
            </button>

            <div className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Verified Escrow · Paystack Protected</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
