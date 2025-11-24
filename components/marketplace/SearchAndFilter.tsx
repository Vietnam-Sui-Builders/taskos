// File: components/marketplace/SearchAndFilter.tsx

import React, { useState } from 'react';

interface FilterState {
  searchTerm: string;
  skills: string[];
  domains: string[];
  priceRange: [number, number];
  minQuality: number;
  sortBy: 'newest' | 'mostBought' | 'highestRated' | 'cheapest';
}

export function SearchAndFilter() {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    skills: [],
    domains: [],
    priceRange: [0, 1000000000], // 0 to 1 SUI in Mist
    minQuality: 50,
    sortBy: 'newest',
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      searchTerm: e.target.value,
    }));
  };

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
    <div className="search-filter-panel">
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search by skill, domain, or description..."
          value={filters.searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {/* Filters */}
      <div className="filters-container">
        {/* Skills Filter */}
        <div className="filter-section">
          <h3>🛠️ Skills</h3>
          <div className="filter-options">
            {['Backend', 'Frontend', 'AI/ML', 'DevOps', 'UI/UX', 'Data'].map(
              (skill) => (
                <label key={skill} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.skills.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                  />
                  <span>{skill}</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Domain Filter */}
        <div className="filter-section">
          <h3>🏢 Domain</h3>
          <div className="filter-options">
            {['FinTech', 'Healthcare', 'E-commerce', 'SaaS', 'Web3'].map(
              (domain) => (
                <label key={domain} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.domains.includes(domain)}
                    onChange={() => handleDomainToggle(domain)}
                  />
                  <span>{domain}</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Price Range */}
        <div className="filter-section">
          <h3>💰 Price Range</h3>
          <div className="price-range">
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
            />
            <span>
              {(filters.priceRange[0] / 1e9).toFixed(2)} -{' '}
              {(filters.priceRange[1] / 1e9).toFixed(2)} SUI
            </span>
          </div>
        </div>

        {/* Quality Score */}
        <div className="filter-section">
          <h3>⭐ Quality Score</h3>
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
          />
          <span>Min: {filters.minQuality}/100</span>
        </div>

        {/* Sort */}
        <div className="filter-section">
          <h3>📊 Sort By</h3>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: e.target.value as FilterState['sortBy'],
              }))
            }
            className="sort-select"
          >
            <option value="newest">Newest</option>
            <option value="mostBought">Most Bought</option>
            <option value="highestRated">Highest Rated</option>
            <option value="cheapest">Cheapest</option>
          </select>
        </div>
      </div>
    </div>
  );
}
