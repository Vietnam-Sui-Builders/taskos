// File: components/marketplace/ExperienceDetailModal.tsx

import React, { useState } from 'react';
import { Experience, PurchaseListing } from './types';

interface ExperienceDetailProps {
  experience: Experience;
  onProceedCheckout: (listing: PurchaseListing) => void;
  onClose: () => void;
}

export function ExperienceDetailModal({
  experience,
  onProceedCheckout,
  onClose,
}: ExperienceDetailProps) {
  const [selectedLicense, setSelectedLicense] = useState<
    'personal' | 'commercial' | 'exclusive' | 'subscription' | 'view_only'
  >('personal');

  const licensePrices = {
    personal: experience.price,
    commercial: experience.price * 1.5,
    exclusive: experience.price * 3,
    subscription: Math.max(experience.price * 0.5, 1),
    view_only: Math.max(experience.price * 0.25, 1),
  };

  const licenseDescriptions = {
    personal:
      'For personal use only. Cannot be shared or commercialized.',
    commercial:
      'Use in commercial projects and products. Team sharing allowed.',
    exclusive:
      'Exclusive rights. Only one buyer gets access.',
    subscription:
      'Time-bound access with renewals controlled by SEAL policy.',
    view_only:
      'View-only access. No redistribution or derivatives.',
  };

  const priceInSUI = (licensePrices[selectedLicense] / 1e9).toFixed(3);

  const handleProceedCheckout = () => {
    onProceedCheckout({
      id: experience.listingId || experience.id,
      experienceId: experience.id,
      licenseType: selectedLicense,
      price: licensePrices[selectedLicense],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass border-primary/20 bg-background/90 backdrop-blur-xl p-6 rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.1)] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10" onClick={onClose}>
          ✕
        </button>

        {/* Header */}
        <div className="mb-8 space-y-3 border-b border-primary/10 pb-6">
          <h1 className="text-3xl font-bold font-display tracking-wide text-primary glow-text">{experience.skill}</h1>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-md bg-secondary/20 text-secondary border border-secondary/50 text-xs font-mono uppercase tracking-wider">{experience.domain}</span>
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono uppercase tracking-wider">
              DIFFICULTY: {experience.difficulty}/5
            </span>
          </div>
        </div>

        {/* Quality & Rating */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <span className="text-yellow-500">{'⭐'.repeat(Math.round(experience.rating))}</span>
            <span className="text-foreground">{experience.rating}/5</span>
            <span className="text-muted-foreground/50">({experience.soldCount} PURCHASES)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quality Score</label>
              <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  style={{ width: `${experience.quality_score}%` }}
                />
              </div>
              <span className="text-xs font-mono text-primary">{experience.quality_score}/100</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Data Completeness</label>
              <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary/50 to-secondary transition-all duration-500" style={{ width: '95%' }} />
              </div>
              <span className="text-xs font-mono text-secondary">95%</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8 space-y-3">
          <h2 className="text-lg font-bold font-display tracking-wide text-foreground flex items-center gap-2">
            <span className="text-primary">📋</span> DESCRIPTION
          </h2>
          <p className="text-muted-foreground leading-relaxed font-mono text-sm whitespace-pre-line">
            {experience.description?.trim() ||
              'On-chain experience minted on Sui. Seller has not provided a description yet.'}
          </p>
        </div>

        {/* Seller Info */}
        <div className="mb-8 space-y-3">
          <h2 className="text-lg font-bold font-display tracking-wide text-foreground flex items-center gap-2">
            <span className="text-primary">👤</span> SELLER_INFO
          </h2>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
            <div>
              <strong className="text-primary block text-xs uppercase tracking-wider mb-1">Wallet</strong>
              <span className="text-muted-foreground">{experience.seller.substring(0, 12)}...</span>
            </div>
            <div>
              <strong className="text-primary block text-xs uppercase tracking-wider mb-1">Experience</strong>
              <span className="text-muted-foreground">127 LISTINGS</span>
            </div>
            <div>
              <strong className="text-primary block text-xs uppercase tracking-wider mb-1">Member Since</strong>
              <span className="text-muted-foreground">JAN 2024</span>
            </div>
          </div>
        </div>

        {/* License Selection */}
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-bold font-display tracking-wide text-foreground flex items-center gap-2">
            <span className="text-primary">📜</span> LICENSE_TYPE
          </h2>
          <div className="grid gap-3">
            {(['personal', 'commercial', 'exclusive', 'subscription', 'view_only'] as const).map(
              (type) => (
                <label key={type} className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="license"
                    value={type}
                    checked={selectedLicense === type}
                    onChange={() => setSelectedLicense(type)}
                    className="peer sr-only"
                  />
                  <div className="p-4 rounded-lg border border-primary/10 bg-card/50 hover:bg-primary/5 hover:border-primary/30 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:shadow-[0_0_15px_rgba(var(--primary),0.1)] transition-all flex items-center justify-between">
                    <div>
                      <h3 className="font-bold font-display tracking-wide text-foreground peer-checked:text-primary mb-1">{type.replace('_', ' ').toUpperCase()}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{licenseDescriptions[type]}</p>
                    </div>
                    <div className="text-right">
                      <strong className="block text-lg font-display text-primary">
                        {(licensePrices[type] / 1e9).toFixed(3)} SUI
                      </strong>
                    </div>
                  </div>
                </label>
              )
            )}
          </div>
        </div>

        {/* What You Get */}
        <div className="mb-8 space-y-3">
          <h2 className="text-lg font-bold font-display tracking-wide text-foreground flex items-center gap-2">
            <span className="text-primary">📦</span> INCLUDED_ASSETS
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
                'Full API documentation (50+ pages)',
                'Code samples and implementation guide',
                'Database schema diagrams',
                'Performance benchmarks',
                'Security best practices',
                '30-day access guarantee'
            ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                    <span className="text-primary">✅</span> {item}
                </li>
            ))}
          </ul>
        </div>

        {/* CTA Section */}
        <div className="flex items-center justify-between pt-6 border-t border-primary/10 mt-8">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">TOTAL_PRICE</span>
            <span className="text-2xl font-bold font-display text-primary glow-text-sm">{priceInSUI} SUI</span>
          </div>

          <button
            className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95"
            onClick={handleProceedCheckout}
          >
            🛒 PROCEED_TO_CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
}
