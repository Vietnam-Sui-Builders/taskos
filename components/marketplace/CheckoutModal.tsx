// File: components/marketplace/CheckoutModal.tsx

import React, { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Experience, AppError } from './types';
import { useMarketplace } from '@/hooks/use-marketplace';

interface CheckoutProps {
  experience: Experience;
  isProcessing: boolean;
  onComplete: (purchaseId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export function CheckoutModal({
  experience,
  isProcessing,
  onComplete,
  onBack,
  onClose,
}: CheckoutProps) {
  const currentAccount = useCurrentAccount();
  const { purchaseExperience, isProcessing: marketplaceProcessing } = useMarketplace();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const handlePurchase = async () => {
    try {
      setError(null);

      if (!agreedToTerms) {
        setError({
          userMessage: 'Please agree to the terms and conditions',
        });
        return;
      }

      if (!currentAccount) {
        setError({
          userMessage: 'Please connect your wallet',
        });
        return;
      }

      // Execute purchase transaction on blockchain
      const listingId = experience.listingId || experience.id;

      const purchaseId = await purchaseExperience({
        listingId,
        paymentAmount: experience.price,
      });

      onComplete(purchaseId);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const priceInSUI = (experience.price / 1e9).toFixed(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-lg glass border-primary/20 bg-background/90 backdrop-blur-xl p-6 rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.1)] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10" onClick={onClose}>
          ✕
        </button>

        <h1 className="text-2xl font-bold font-display tracking-wide text-primary glow-text mb-6 flex items-center gap-2">
            <span className="text-xl">🛒</span> CHECKOUT_PROTOCOL
        </h1>

        {/* Order Summary */}
        <div className="bg-card/50 border border-primary/10 rounded-lg p-4 mb-6 space-y-3">
          <h2 className="text-sm font-bold font-display tracking-wider text-muted-foreground uppercase border-b border-primary/10 pb-2">Order Summary</h2>

          <div className="flex justify-between items-center text-sm font-mono">
            <span className="text-foreground font-bold">{experience.skill}</span>
            <span className="text-primary">{priceInSUI} SUI</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
            <span>DOMAIN</span>
            <span className="text-foreground">{experience.domain}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
            <span>QUALITY_SCORE</span>
            <span className="text-foreground">{experience.quality_score}/100</span>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-primary/10 mt-2">
            <strong className="text-sm font-display tracking-wide text-foreground">TOTAL</strong>
            <strong className="text-lg font-display text-primary glow-text-sm">{priceInSUI} SUI</strong>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-bold font-display tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <span className="text-xs">👛</span> WALLET_INFO
          </h2>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 font-mono text-xs">
            <p className="text-muted-foreground mb-1">CONNECTED_WALLET</p>
            <code className="block bg-background/50 p-2 rounded border border-primary/10 text-primary break-all">
                {currentAccount?.address || 'NOT_CONNECTED'}
            </code>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-bold font-display tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <span className="text-xs">💳</span> PAYMENT_DETAILS
          </h2>
          <div className="bg-card/50 border border-primary/10 rounded-lg p-3 text-xs font-mono space-y-2">
            <p className="text-muted-foreground">
              Transaction processed via Sui Testnet.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/5">
              <span className="text-muted-foreground">NETWORK</span>
              <span className="text-right text-foreground">SUI_TESTNET</span>
              
              <span className="text-muted-foreground">GAS_FEE (EST)</span>
              <span className="text-right text-foreground">~0.01 SUI</span>
              
              <span className="text-muted-foreground font-bold">TOTAL_COST</span>
              <span className="text-right text-primary font-bold">~{(parseFloat(priceInSUI) + 0.01).toFixed(3)} SUI</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center mt-0.5">
                <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="peer h-4 w-4 appearance-none border border-primary/30 bg-background/50 rounded-sm checked:bg-primary checked:border-primary transition-all cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-background pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              I agree to the{' '}
              <a href="#terms" className="text-primary hover:underline underline-offset-4">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-primary hover:underline underline-offset-4">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
                error={error}
                onDismiss={() => setError(null)}
                onRetry={handlePurchase}
            />
          </div>
        )}

        {/* Processing State */}
        {(isProcessing || marketplaceProcessing) && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-lg p-4 text-center animate-pulse">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-primary font-bold font-display tracking-wide">PROCESSING_TRANSACTION...</p>
            <small className="text-xs font-mono text-muted-foreground">APPROVE_IN_WALLET</small>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-primary/10">
          <button
            className="flex-1 px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider"
            onClick={onBack}
            disabled={isProcessing}
          >
            ← ABORT
          </button>
          <button
            className="flex-[2] px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePurchase}
            disabled={isProcessing || marketplaceProcessing || !agreedToTerms}
          >
            {(isProcessing || marketplaceProcessing) ? '⏳ EXECUTING...' : '💳 CONFIRM_PURCHASE'}
          </button>
        </div>
      </div>
    </div>
  );
}
