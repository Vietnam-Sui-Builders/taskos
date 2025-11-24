// File: components/marketplace/MarketplaceFlow.tsx
// Purpose: Orchestrate entire purchase flow

import React, { useState } from 'react';
import { ExperienceCard } from './ExperienceCard';
import { ExperienceDetailModal } from './ExperienceDetailModal';
import { CheckoutModal } from './CheckoutModal';
import { PurchaseConfirmation } from './PurchaseConfirmation';
import { AccessDataModal } from './AccessDataModal';
import { SearchAndFilter } from './SearchAndFilter';
import { Experience, AppError } from './types';
import { useMarketplaceListings } from '@/hooks/use-marketplace-listings';
import './MarketplaceFlow.css';

export type PurchaseFlowStep =
  | 'browse'
  | 'details'
  | 'checkout'
  | 'processing'
  | 'success'
  | 'access';

export interface PurchaseFlowState {
  currentStep: PurchaseFlowStep;
  selectedExperience: Experience | null;
  purchaseId: string | null;
  listingId: string | null;
  error: AppError | null;
  isProcessing: boolean;
}

export function MarketplaceFlow() {
  const { experiences, isLoading, error: loadingError } = useMarketplaceListings();
  
  const [state, setState] = useState<PurchaseFlowState>({
    currentStep: 'browse',
    selectedExperience: null,
    purchaseId: null,
    listingId: null,
    error: null,
    isProcessing: false,
  });

  const handleSelectExperience = (experience: Experience) => {
    setState((prev) => ({
      ...prev,
      selectedExperience: experience,
      currentStep: 'details',
    }));
  };

  const handleProceedToCheckout = (listing: any) => {
    setState((prev) => ({
      ...prev,
      listingId: listing.id,
      currentStep: 'checkout',
    }));
  };

  const handleCompletePurchase = async (purchaseId: string) => {
    setState((prev) => ({
      ...prev,
      purchaseId,
      currentStep: 'success',
      isProcessing: false,
    }));
  };

  const handleAccessData = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 'access',
    }));
  };

  const handleClose = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 'browse',
      selectedExperience: null,
      purchaseId: null,
      error: null,
    }));
  };

  return (
    <div className="marketplace-flow">
      {/* Browse Step */}
      {state.currentStep === 'browse' && (
        <div className="marketplace-browse">
          <h1>🛍️ Experience Marketplace</h1>
          <SearchAndFilter />
          
          {isLoading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading marketplace listings...</p>
            </div>
          )}
          
          {loadingError && (
            <div className="error-state">
              <p>⚠️ {loadingError}</p>
            </div>
          )}
          
          {!isLoading && !loadingError && experiences.length === 0 && (
            <div className="empty-state">
              <p>No experiences available in the marketplace yet.</p>
              <small>Check back later or be the first to list an experience!</small>
            </div>
          )}
          
          <div className="experience-grid">
            {experiences.map((exp) => (
              <ExperienceCard
                key={exp.id}
                experience={exp}
                onSelect={handleSelectExperience}
              />
            ))}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {state.currentStep === 'details' && state.selectedExperience && (
        <ExperienceDetailModal
          experience={state.selectedExperience}
          onProceedCheckout={handleProceedToCheckout}
          onClose={handleClose}
        />
      )}

      {/* Checkout Modal */}
      {state.currentStep === 'checkout' && state.selectedExperience && (
        <CheckoutModal
          experience={state.selectedExperience}
          isProcessing={state.isProcessing}
          onComplete={handleCompletePurchase}
          onBack={() =>
            setState((prev) => ({ ...prev, currentStep: 'details' }))
          }
          onClose={handleClose}
        />
      )}

      {/* Success Confirmation */}
      {state.currentStep === 'success' && state.purchaseId && (
        <PurchaseConfirmation
          purchaseId={state.purchaseId}
          onAccessData={handleAccessData}
          onClose={handleClose}
        />
      )}

      {/* Access Data */}
      {state.currentStep === 'access' && state.selectedExperience && (
        <AccessDataModal
          experience={state.selectedExperience}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
