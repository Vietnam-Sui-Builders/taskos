// File: components/marketplace/AccessDataModal.tsx

import React from 'react';
import { useExperienceAccess } from '../../hooks/useExperienceAccess';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Experience } from './types';

interface AccessDataProps {
  experience: Experience;
  onClose: () => void;
}

export function AccessDataModal({ experience, onClose }: AccessDataProps) {
  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
  const {
    loading,
    error,
    canAccess,
    data,
    expiresAt,
    refetch,
  } = useExperienceAccess(experience.id, taskosPackageId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content access-data-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <h1>📊 Experience Data</h1>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>⏳ Verifying access and decrypting data...</p>
            <small>This may take a few seconds. Please don&apos;t close this window.</small>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-state">
            <ErrorDisplay
              error={{ message: error }}
              onRetry={refetch}
              onDismiss={onClose}
            />
          </div>
        )}

        {/* Access Denied */}
        {!loading && !canAccess && (
          <div className="access-denied">
            <h2>🔒 Access Denied</h2>
            <p>You don&apos;t have permission to access this data.</p>
            <button className="btn btn-secondary" onClick={onClose}>
              Back to Marketplace
            </button>
          </div>
        )}

        {/* Data Display */}
        {!loading && canAccess && data && (
          <div className="data-display">
            {/* Expiration Notice */}
            {expiresAt && (
              <div className="expiration-notice">
                ⏰ Access expires:{' '}
                {expiresAt.toLocaleDateString()} at{' '}
                {expiresAt.toLocaleTimeString()}
              </div>
            )}

            {/* Metadata Section */}
            <div className="metadata-section">
              <h2>📋 Experience Details</h2>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <label>Skill</label>
                  <span className="value">{data.skill}</span>
                </div>
                <div className="metadata-item">
                  <label>Domain</label>
                  <span className="value">{data.domain}</span>
                </div>
                <div className="metadata-item">
                  <label>Difficulty</label>
                  <span className="value">{data.difficulty}/5</span>
                </div>
                <div className="metadata-item">
                  <label>Time Spent</label>
                  <span className="value">{Math.round(data.timeSpent / 3600)} hours</span>
                </div>
                <div className="metadata-item">
                  <label>Quality Score</label>
                  <span className="value">{data.quality_score}/100</span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="content-section">
              <h2>📄 Full Content</h2>
              <div className="content-box">
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>

              <div className="content-actions">
                <button className="btn btn-secondary">
                  📥 Download as JSON
                </button>
                <button className="btn btn-secondary">
                  📋 Copy to Clipboard
                </button>
                <button className="btn btn-secondary">
                  🔗 Share Link (Private)
                </button>
              </div>
            </div>

            {/* Related Experiences */}
            <div className="related-section">
              <h2>🔗 Related Experiences by Same Seller</h2>
              <p>
                <small>
                  Would show 3-5 other experiences from the same seller
                </small>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="access-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
