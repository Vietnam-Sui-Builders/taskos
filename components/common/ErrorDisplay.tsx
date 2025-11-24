// File: components/common/ErrorDisplay.tsx

import React from 'react';
import { AppError } from '../marketplace/types';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const errorMessage = error?.userMessage || error?.message || 'An unexpected error occurred';
  const errorDetails = error?.details || error?.stack;

  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <h3 className="error-title">Error</h3>
      <p className="error-message">{errorMessage}</p>
      
      {errorDetails && (
        <details className="error-details">
          <summary>Technical Details</summary>
          <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
        </details>
      )}

      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            🔄 Retry
          </button>
        )}
        {onDismiss && (
          <button className="btn btn-secondary" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
