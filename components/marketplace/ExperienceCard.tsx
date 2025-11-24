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
    <div className="experience-card" onClick={() => onSelect(experience)}>
      {/* Card Header */}
      <div className="card-header">
        <h3>{experience.skill}</h3>
        <span className="domain-badge">{experience.domain}</span>
      </div>

      {/* Quality Score */}
      <div className="quality-section">
        <div className="quality-bar">
          <div
            className="quality-fill"
            style={{
              width: `${experience.quality_score}%`,
              backgroundColor: `hsl(${(experience.quality_score / 100) * 120}, 70%, 50%)`,
            }}
          />
        </div>
        <span className="quality-text">
          Quality: {experience.quality_score}/100
        </span>
      </div>

      {/* Rating & Stats */}
      <div className="stats-row">
        <div className="stat">
          <span className="stat-icon">⭐</span>
          <span>{avgRating.toFixed(1)}</span>
        </div>
        <div className="stat">
          <span className="stat-icon">🛒</span>
          <span>{experience.soldCount} sold</span>
        </div>
        <div className="stat">
          <span className="stat-icon">📊</span>
          <span>Difficulty: {experience.difficulty}/5</span>
        </div>
      </div>

      {/* Seller Info */}
      <div className="seller-info">
        <small>Seller: {experience.seller.substring(0, 10)}...</small>
      </div>

      {/* Price & CTA */}
      <div className="card-footer">
        <div className="price">
          <strong>{priceInSUI} SUI</strong>
        </div>
        <button className="view-btn">View Details →</button>
      </div>
    </div>
  );
}
