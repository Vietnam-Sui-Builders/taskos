// File: components/marketplace/AccessDataModal.tsx

import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useExperienceAccess } from '../../hooks/useExperienceAccess';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Experience } from './types';

interface AccessDataProps {
  experience: Experience;
  onClose: () => void;
  onRequestAllowlist?: (experience: Experience) => Promise<void> | void;
}

export function AccessDataModal({ experience, onClose, onRequestAllowlist }: AccessDataProps) {
  const currentAccount = useCurrentAccount();
  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
  const {
    loading,
    error,
    canAccess,
    data,
    expiresAt,
    refetch,
    loadingStep,
    progress,
  } = useExperienceAccess(experience.id, taskosPackageId);
  const [requestStatus, setRequestStatus] = React.useState<'idle' | 'sent' | 'error'>('idle');

  const handleRequestAccess = async () => {
    try {
      setRequestStatus('sent');
      if (onRequestAllowlist) {
        await onRequestAllowlist(experience);
      }
    } catch (err) {
      console.error('Allowlist request failed:', err);
      setRequestStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass border-primary/20 bg-background/90 backdrop-blur-xl p-6 rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.1)] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10" onClick={onClose}>
          ✕
        </button>

        <h1 className="text-2xl font-bold font-display tracking-wide text-primary glow-text mb-6 flex items-center gap-2">
            <span className="text-xl">📊</span> EXPERIENCE_DATA_ACCESS
        </h1>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{progress}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-mono text-sm text-primary/80 text-center tracking-wider">
                {loadingStep || 'DECRYPTING_DATA_STREAM...'}
              </p>
            </div>
            
            <small className="text-xs font-mono text-muted-foreground animate-pulse">DO_NOT_CLOSE_WINDOW</small>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={{ message: error || 'Unknown error' }}
              onRetry={refetch}
              onDismiss={onClose}
            />
          </div>
        )}

        {/* Access Denied */}
        {!loading && !canAccess && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-8 text-center space-y-4">
            <h2 className="text-xl font-bold font-display text-destructive mb-2">🔒 ACCESS_DENIED</h2>
            <p className="text-muted-foreground font-mono mb-2">You do not have the required permissions to access this data stream.</p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-left">
              <p className="text-sm font-mono text-yellow-500 mb-2">⚠️ COMMON ISSUE:</p>
              <p className="text-xs font-mono text-muted-foreground mb-2">
                If you recently purchased this experience, the seller may need to manually add your wallet address to the SEAL policy allowlist.
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                Your wallet: <span className="text-foreground break-all">{currentAccount?.address || 'Not connected'}</span>
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-2">
                Seller: <span className="text-foreground break-all">{experience.seller}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                onClick={handleRequestAccess}
                disabled={requestStatus === 'sent'}
              >
                {requestStatus === 'sent' ? 'REQUEST_SENT' : 'REQUEST_ALLOWLIST'}
              </button>
              <button className="px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider" onClick={onClose}>
                RETURN_TO_MARKETPLACE
              </button>
            </div>
            {requestStatus === 'sent' && (
              <p className="mt-4 text-xs font-mono text-primary">Request submitted. Seller/admin should add your wallet to the allowlist.</p>
            )}
            {requestStatus === 'error' && (
              <p className="mt-4 text-xs font-mono text-destructive">Request failed. Try again or contact seller.</p>
            )}
          </div>
        )}

        {/* Data Display */}
        {!loading && canAccess && data && (
          <div className="space-y-6 animate-fade-in">
            {/* Expiration Notice */}
            {expiresAt && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                <span>⏰</span>
                <span>ACCESS_EXPIRES: {expiresAt.toLocaleDateString()} AT {expiresAt.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Metadata Section */}
            <div className="bg-card/50 border border-primary/10 rounded-lg p-6">
              <h2 className="text-sm font-bold font-display tracking-wider text-primary uppercase border-b border-primary/10 pb-2 mb-4 flex items-center gap-2">
                <span className="text-xs">📋</span> METADATA_LOG
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">SKILL</label>
                  <div className="text-sm font-bold text-foreground">{data.skill}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">DOMAIN</label>
                  <div className="text-sm font-bold text-foreground">{data.domain}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">DIFFICULTY</label>
                  <div className="text-sm font-bold text-foreground">{data.difficulty}/5</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">TIME_SPENT</label>
                  <div className="text-sm font-bold text-foreground">{Math.round(data.timeSpent / 3600)} HRS</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">QUALITY</label>
                  <div className="text-sm font-bold text-primary">{data.quality_score}/100</div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold font-display tracking-wider text-primary uppercase flex items-center gap-2">
                <span className="text-xs">📄</span> DECRYPTED_CONTENT
              </h2>
              <div className="bg-black/50 border border-primary/20 rounded-lg p-4 font-mono text-xs text-primary/80 overflow-auto max-h-[400px] shadow-inner">
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>📥</span> DOWNLOAD_JSON
                </button>
                <button className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> COPY_CLIPBOARD
                </button>
                <button className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>🔗</span> SHARE_LINK
                </button>
              </div>
            </div>

            {/* Related Experiences */}
            <div className="border-t border-primary/10 pt-6">
              <h2 className="text-sm font-bold font-display tracking-wider text-muted-foreground uppercase mb-2">
                🔗 RELATED_NODES
              </h2>
              <p className="text-xs font-mono text-muted-foreground italic">
                Scanning for related data streams from same source... [MOCK_DATA]
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-primary/10 mt-6">
          <button 
            className="px-6 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider" 
            onClick={onClose}
          >
            CLOSE_TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
}
