// File: components/marketplace/ExperienceCard.tsx

import React from 'react';
import { Experience } from './types';

interface ExperienceCardProps {
  experience: Experience;
  onSelect: (experience: Experience) => void;
}

export function ExperienceCard({ experience, onSelect }: ExperienceCardProps) {
  const priceInSUI = (experience.price / 1e9).toFixed(3);
  const avgRating = experience.rating || 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-card/40 backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(var(--primary),0.2)] cursor-pointer h-full flex flex-col justify-between" onClick={() => onSelect(experience)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-lg font-bold font-display tracking-wide text-foreground group-hover:text-primary transition-colors">{experience.skill}</h3>
          <span className="px-2 py-1 rounded-md bg-secondary/20 text-secondary border border-secondary/50 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap">{experience.domain}</span>
        </div>

        {/* Quality Score */}
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              style={{
                width: `${experience.quality_score}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span className="tracking-wider">QUALITY_SCORE</span>
            <span className="text-primary font-bold">{experience.quality_score}/100</span>
          </div>
        </div>

        {/* Rating & Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono text-muted-foreground border-y border-primary/10 py-3">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span>{avgRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 justify-center border-x border-primary/10">
            <span>🛒</span>
            <span>{experience.soldCount} SOLD</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <span>📊</span>
            <span>LVL {experience.difficulty}</span>
          </div>
        </div>

        {/* Seller Info */}
        <div className="text-xs font-mono text-muted-foreground opacity-70 truncate">
          SELLER: {experience.seller.substring(0, 10)}...
        </div>
      </div>

      {/* Price & CTA */}
      <div className="relative z-10 p-4 bg-primary/5 border-t border-primary/10 flex items-center justify-between group-hover:bg-primary/10 transition-colors">
        <div className="font-display font-bold text-primary text-lg glow-text-sm">
          {priceInSUI} SUI
        </div>
        <button className="px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 transition-colors text-xs font-mono uppercase tracking-wider shadow-[0_0_10px_rgba(var(--primary),0.1)] group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]">
          VIEW_DETAILS
        </button>
      </div>
    </div>
  );
}
