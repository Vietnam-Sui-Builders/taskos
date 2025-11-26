import React from 'react';

interface MarketplaceSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function MarketplaceSearch({ searchTerm, onSearchChange }: MarketplaceSearchProps) {
  return (
    <div className="relative group w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-muted-foreground group-focus-within:text-primary transition-colors">🔍</span>
      </div>
      <input
        type="text"
        placeholder="SEARCH_PROTOCOL..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-primary/20 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm placeholder:text-muted-foreground/50 shadow-[0_0_10px_rgba(var(--primary),0.05)] focus:shadow-[0_0_15px_rgba(var(--primary),0.1)]"
      />
    </div>
  );
}
