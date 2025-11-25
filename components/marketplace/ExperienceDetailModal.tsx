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
      experienceId: experience.id,
      licenseType: selectedLicense,
      price: licensePrices[selectedLicense],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content experience-detail" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Header */}
        <div className="detail-header">
          <h1>{experience.skill}</h1>
          <div className="badges">
            <span className="badge domain">{experience.domain}</span>
            <span className="badge difficulty">
              Difficulty: {experience.difficulty}/5
            </span>
          </div>
        </div>

        {/* Quality & Rating */}
        <div className="quality-section">
          <div className="rating">
            <span className="stars">
              {'⭐'.repeat(Math.round(experience.rating))}
            </span>
            <span className="rating-text">
              {experience.rating}/5 ({experience.soldCount} purchases)
            </span>
          </div>

          <div className="quality-metrics">
            <div className="metric">
              <label>Quality Score</label>
              <div className="metric-bar">
                <div
                  className="metric-fill good"
                  style={{ width: `${experience.quality_score}%` }}
                />
              </div>
              <span>{experience.quality_score}/100</span>
            </div>

            <div className="metric">
              <label>Data Completeness</label>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '95%' }} />
              </div>
              <span>95%</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="description-section">
          <h2>📋 Description</h2>
          <p>
            Professional backend API design documentation including architecture
            diagrams, code patterns, and deployment strategies for high-traffic
            payment processing systems. Includes best practices for security,
            scalability, and reliability.
          </p>
        </div>

        {/* Seller Info */}
        <div className="seller-section">
          <h2>👤 Seller Information</h2>
          <div className="seller-card">
            <p>
              <strong>Wallet:</strong> {experience.seller}
            </p>
            <p>
              <strong>Experience Count:</strong> 127
            </p>
            <p>
              <strong>Member Since:</strong> Jan 2024
            </p>
          </div>
        </div>

        {/* License Selection */}
        <div className="license-section">
          <h2>📜 License Type</h2>
          <div className="license-options">
            {(['personal', 'commercial', 'exclusive', 'subscription', 'view_only'] as const).map(
              (type) => (
                <label key={type} className="license-option">
                  <input
                    type="radio"
                    name="license"
                    value={type}
                    checked={selectedLicense === type}
                    onChange={() => setSelectedLicense(type)}
                  />
                  <div className="license-content">
                    <h3>{type.replace('_', ' ').toUpperCase()}</h3>
                    <p>{licenseDescriptions[type]}</p>
                    <strong>
                      {(licensePrices[type] / 1e9).toFixed(3)} SUI
                    </strong>
                  </div>
                </label>
              )
            )}
          </div>
        </div>

        {/* What You Get */}
        <div className="includes-section">
          <h2>📦 What&apos;s Included</h2>
          <ul className="includes-list">
            <li>✅ Full API documentation (50+ pages)</li>
            <li>✅ Code samples and implementation guide</li>
            <li>✅ Database schema diagrams</li>
            <li>✅ Performance benchmarks</li>
            <li>✅ Security best practices</li>
            <li>✅ 30-day access guarantee</li>
          </ul>
        </div>

        {/* CTA Section */}
        <div className="detail-footer">
          <div className="price-summary">
            <span className="label">Total Price:</span>
            <span className="price">{priceInSUI} SUI</span>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleProceedCheckout}
          >
            🛒 Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
