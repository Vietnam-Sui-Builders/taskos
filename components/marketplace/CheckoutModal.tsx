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
      const purchaseId = await purchaseExperience({
        listingId: experience.id,
        paymentAmount: experience.price,
      });

      onComplete(purchaseId);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const priceInSUI = (experience.price / 1e9).toFixed(3);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content checkout-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <h1>🛒 Checkout</h1>

        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>

          <div className="order-item">
            <span>{experience.skill}</span>
            <span className="price">{priceInSUI} SUI</span>
          </div>

          <div className="order-row">
            <span>Domain:</span>
            <span>{experience.domain}</span>
          </div>

          <div className="order-row">
            <span>Quality Score:</span>
            <span>{experience.quality_score}/100</span>
          </div>

          <hr />

          <div className="order-total">
            <strong>Total:</strong>
            <strong className="total-price">{priceInSUI} SUI</strong>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="wallet-section">
          <h2>👛 Wallet Information</h2>
          <div className="wallet-display">
            <p>
              <strong>Connected Wallet:</strong>
            </p>
            <code>{currentAccount?.address}</code>
          </div>
        </div>

        {/* Payment Method */}
        <div className="payment-section">
          <h2>💳 Payment Method</h2>
          <div className="payment-info">
            <p>
              This purchase will be processed on the Sui blockchain using your
              connected wallet.
            </p>
            <div className="payment-details">
              <p>
                <strong>Network:</strong> Sui Testnet
              </p>
              <p>
                <strong>Gas Fee:</strong> ~0.01 SUI (estimated)
              </p>
              <p>
                <strong>Total Cost:</strong> ~{(parseFloat(priceInSUI) + 0.01).toFixed(3)} SUI
              </p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="terms-section">
          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <a href="#terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={() => setError(null)}
            onRetry={handlePurchase}
          />
        )}

        {/* Processing State */}
        {(isProcessing || marketplaceProcessing) && (
          <div className="processing-message">
            <div className="spinner" />
            <p>Processing your purchase...</p>
            <small>Please approve the transaction in your wallet</small>
          </div>
        )}

        {/* Actions */}
        <div className="checkout-actions">
          <button
            className="btn btn-secondary"
            onClick={onBack}
            disabled={isProcessing}
          >
            ← Back
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handlePurchase}
            disabled={isProcessing || marketplaceProcessing || !agreedToTerms}
          >
            {(isProcessing || marketplaceProcessing) ? '⏳ Processing...' : '💳 Complete Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
