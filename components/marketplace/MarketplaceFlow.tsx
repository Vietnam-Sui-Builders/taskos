// File: components/marketplace/MarketplaceFlow.tsx
// Purpose: Orchestrate entire purchase flow

import React, { useState, useMemo } from 'react';
import { ExperienceCard } from './ExperienceCard';
import { ExperienceDetailModal } from './ExperienceDetailModal';
import { CheckoutModal } from './CheckoutModal';
import { PurchaseConfirmation } from './PurchaseConfirmation';
import { AccessDataModal } from './AccessDataModal';
import { MarketplaceSidebar, FilterState } from './MarketplaceSidebar';
import { MarketplaceSearch } from './MarketplaceSearch';
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
  
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    skills: [],
    domains: [],
    priceRange: [0, 1000000000], // 0 to 1 SUI in Mist
    minQuality: 50,
    sortBy: 'newest',
  });

  const [state, setState] = useState<PurchaseFlowState>({
    currentStep: 'browse',
    selectedExperience: null,
    purchaseId: null,
    listingId: null,
    error: null,
    isProcessing: false,
  });

  // Filter experiences based on state
  const filteredExperiences = useMemo(() => {
    return experiences.filter((exp) => {
      // Search Term
      if (filters.searchTerm && !exp.skill.toLowerCase().includes(filters.searchTerm.toLowerCase()) && !exp.domain.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      // Skills
      if (filters.skills.length > 0 && !filters.skills.includes(exp.skill)) {
        // Note: This assumes exact match. If skills are categories, logic might need adjustment.
        // For now, let's assume 'skill' field matches one of the filter options or we check if the filter option is contained in the skill string
        const hasSkill = filters.skills.some(s => exp.skill.includes(s));
        if (!hasSkill) return false;
      }
      // Domains
      if (filters.domains.length > 0 && !filters.domains.includes(exp.domain)) {
        return false;
      }
      // Price Range
      if (exp.price < filters.priceRange[0] || exp.price > filters.priceRange[1]) {
        return false;
      }
      // Quality
      if (exp.quality_score < filters.minQuality) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return 0; // Assuming default order is newest or we need a timestamp
        case 'mostBought':
          return b.soldCount - a.soldCount;
        case 'highestRated':
          return b.rating - a.rating;
        case 'cheapest':
          return a.price - b.price;
        default:
          return 0;
      }
    });
  }, [experiences, filters]);

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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Browse Step */}
      {state.currentStep === 'browse' && (
        <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
             <MarketplaceSidebar filters={filters} setFilters={setFilters} />
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">MARKETPLACE_NEXUS</h1>
              <MarketplaceSearch 
                searchTerm={filters.searchTerm} 
                onSearchChange={(term) => setFilters(prev => ({ ...prev, searchTerm: term }))} 
              />
            </div>
            
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
            
            {!isLoading && !loadingError && filteredExperiences.length === 0 && (
              <div className="bg-muted/30 border border-primary/10 p-12 rounded-lg text-center backdrop-blur-md glass">
                <p className="text-xl font-display text-primary mb-2">NO_EXPERIENCES_DETECTED</p>
                <small className="font-mono text-muted-foreground">ADJUST_FILTERS OR CHECK_BACK_LATER</small>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExperiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  onSelect={handleSelectExperience}
                />
              ))}
            </div>
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
