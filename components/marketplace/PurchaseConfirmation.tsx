// File: components/marketplace/PurchaseConfirmation.tsx

import React from 'react';

interface PurchaseConfirmationProps {
  purchaseId: string;
  onAccessData: () => void;
  onClose: () => void;
}

export function PurchaseConfirmation({
  purchaseId,
  onAccessData,
  onClose,
}: PurchaseConfirmationProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content success-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="success-icon">🎉</div>

        <h1>Purchase Successful!</h1>

        <p className="confirmation-message">
          Your purchase has been completed and confirmed on the blockchain.
        </p>

        {/* Purchase Details */}
        <div className="confirmation-details">
          <h2>📋 Purchase Details</h2>

          <div className="detail-row">
            <span>Purchase ID:</span>
            <code>{purchaseId}</code>
          </div>

          <div className="detail-row">
            <span>Status:</span>
            <span className="status success">✅ Confirmed</span>
          </div>

          <div className="detail-row">
            <span>Transaction Time:</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Access Information */}
        <div className="access-info">
          <h2>🔓 Next Steps</h2>
          <ol className="steps-list">
            <li>
              Click &quot;View Experience Data&quot; to access your purchased content
            </li>
            <li>
              You&apos;ll be asked to approve a signature to verify your ownership
            </li>
            <li>SEAL will provide the decryption key for your data</li>
            <li>The encrypted blob will be downloaded and decrypted locally</li>
            <li>Your data is ready to view and use</li>
          </ol>
        </div>

        {/* What's Next */}
        <div className="whats-next">
          <h2>💡 What Can You Do Now?</h2>
          <ul className="features-list">
            <li>📥 Download the experience data</li>
            <li>⭐ Rate and review the experience</li>
            <li>🔗 Share your purchase receipt (if public)</li>
            <li>📞 Contact seller with questions</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="confirmation-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Continue Shopping
          </button>
          <button className="btn btn-primary btn-lg" onClick={onAccessData}>
            📊 View Experience Data
          </button>
        </div>
      </div>
    </div>
  );
}
