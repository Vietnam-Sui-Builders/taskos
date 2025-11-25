// File: frontend/src/components/ExperienceDetail.tsx
// Example of using the hooks

import React from 'react';
import { useExperienceAccess } from '../hooks/useExperienceAccess';
import { useWallets } from '@mysten/dapp-kit';

interface ExperienceDetailProps {
  experienceId: string;
  taskosPackageId: string;
}

export function ExperienceDetail({
  experienceId,
  taskosPackageId,
}: ExperienceDetailProps) {
  const wallets = useWallets();
  const currentAccount = wallets?.[0]?.accounts?.[0] ?? null;
  const {
    loading,
    error,
    canAccess,
    accessReason,
    data,
    expiresAt,
    refetch,
  } = useExperienceAccess(experienceId, taskosPackageId);

  if (loading) {
    return <div>⏳ Checking access permissions...</div>;
  }

  if (!currentAccount) {
    return <div>❌ Please connect your wallet</div>;
  }

  if (error) {
    return (
      <div>
        <h3>❌ Error: {error}</h3>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div>
        <h3>🔒 Access Denied</h3>
        <p>{accessReason}</p>
        <button onClick={() => window.location.href = '/marketplace'}>
          Purchase Access
        </button>
      </div>
    );
  }

  // User has access - display decrypted data
  return (
    <div className="experience-detail">
      <h2>📊 Experience Data</h2>

      {expiresAt && (
        <p className="expiration-warning">
          ⏰ Access expires: {expiresAt.toLocaleString()}
        </p>
      )}

      <div className="experience-content">
        {data && (
          <>
            <h3>{data.skill}</h3>
            <p><strong>Domain:</strong> {data.domain}</p>
            <p><strong>Difficulty:</strong> {data.difficulty}/5</p>
            <p><strong>Time Spent:</strong> {Math.round(data.time_spent / 3600)} hours</p>
            <p><strong>Quality Score:</strong> {data.quality_score}/100</p>

            <h4>📋 Full Details:</h4>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}
      </div>

      <button onClick={refetch}>🔄 Refresh Data</button>
    </div>
  );
}
