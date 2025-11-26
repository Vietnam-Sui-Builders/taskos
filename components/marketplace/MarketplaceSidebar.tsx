import React from 'react';

export interface FilterState {
  searchTerm: string;
  skills: string[];
  domains: string[];
  priceRange: [number, number];
  minQuality: number;
  sortBy: 'newest' | 'mostBought' | 'highestRated' | 'cheapest';
}

interface MarketplaceSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export function MarketplaceSidebar({ filters, setFilters }: MarketplaceSidebarProps) {
  const handleSkillToggle = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleDomainToggle = (domain: string) => {
    setFilters((prev) => ({
      ...prev,
      domains: prev.domains.includes(domain)
        ? prev.domains.filter((d) => d !== domain)
        : [...prev.domains, domain],
    }));
  };

  return (
    <div className="space-y-6 bg-card/20 backdrop-blur-md p-6 rounded-xl border border-primary/10 h-fit sticky top-24">
      {/* Skills Filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-display tracking-wider text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
          <span className="text-xs">🛠️</span> SKILL_SET
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {['Backend', 'Frontend', 'AI/ML', 'DevOps', 'UI/UX', 'Data'].map(
            (skill) => (
              <label key={skill} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.skills.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                    className="peer h-4 w-4 appearance-none border border-primary/30 bg-background/50 rounded-sm checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-background pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{skill}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Domain Filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-display tracking-wider text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
          <span className="text-xs">🏢</span> DOMAIN_SECTOR
        </h3>
        <div className="flex flex-col gap-2">
          {['FinTech', 'Healthcare', 'E-commerce', 'SaaS', 'Web3'].map(
            (domain) => (
              <label key={domain} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.domains.includes(domain)}
                    onChange={() => handleDomainToggle(domain)}
                    className="peer h-4 w-4 appearance-none border border-primary/30 bg-background/50 rounded-sm checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-background pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{domain}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-display tracking-wider text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
          <span className="text-xs">💰</span> PRICE_RANGE
        </h3>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="1000000000"
            step="10000000"
            value={filters.priceRange[0]}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                priceRange: [parseInt(e.target.value), prev.priceRange[1]],
              }))
            }
            className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          />
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>{(filters.priceRange[0] / 1e9).toFixed(2)} SUI</span>
              <span>{(filters.priceRange[1] / 1e9).toFixed(2)} SUI</span>
          </div>
        </div>
      </div>

      {/* Quality Score */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-display tracking-wider text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
          <span className="text-xs">⭐</span> MIN_QUALITY
        </h3>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minQuality}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                minQuality: parseInt(e.target.value),
              }))
            }
            className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          />
          <div className="text-right text-xs font-mono text-primary">
              {filters.minQuality}/100
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-display tracking-wider text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
          <span className="text-xs">📊</span> SORT_BY
        </h3>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              sortBy: e.target.value as FilterState['sortBy'],
            }))
          }
          className="w-full p-2 bg-background/50 border border-primary/20 rounded-md text-xs font-mono focus:outline-none focus:border-primary/50"
        >
          <option value="newest">NEWEST_FIRST</option>
          <option value="mostBought">MOST_POPULAR</option>
          <option value="highestRated">HIGHEST_RATED</option>
          <option value="cheapest">LOWEST_PRICE</option>
        </select>
      </div>
    </div>
  );
}
