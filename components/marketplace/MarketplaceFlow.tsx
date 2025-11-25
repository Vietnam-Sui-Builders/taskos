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
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Browse Step */}
      {state.currentStep === 'browse' && (
        <div className="space-y-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">MARKETPLACE_NEXUS</h1>
          <SearchAndFilter />
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
              <p className="font-mono text-primary/80 animate-pulse tracking-widest">SCANNING_MARKETPLACE...</p>
            </div>
          )}
          
          {loadingError && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive p-6 rounded-lg text-center backdrop-blur-md">
              <p className="font-mono font-bold">⚠️ SYSTEM_ERROR: {loadingError}</p>
            </div>
          )}
          
          {!isLoading && !loadingError && experiences.length === 0 && (
            <div className="bg-muted/30 border border-primary/10 p-12 rounded-lg text-center backdrop-blur-md glass">
              <p className="text-xl font-display text-primary mb-2">NO_EXPERIENCES_DETECTED</p>
              <small className="font-mono text-muted-foreground">CHECK_BACK_LATER OR INITIATE_LISTING</small>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
