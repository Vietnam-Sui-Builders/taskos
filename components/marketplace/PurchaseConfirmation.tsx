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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-lg glass border-primary/20 bg-background/90 backdrop-blur-xl p-8 rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.1)] text-center animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.2)] animate-pulse">
          <span className="text-4xl">🎉</span>
        </div>

        <h1 className="text-3xl font-bold font-display tracking-wide text-primary glow-text mb-4">PURCHASE_CONFIRMED</h1>

        <p className="text-muted-foreground font-mono text-sm mb-8">
          Your purchase has been successfully recorded on the blockchain.
        </p>

        {/* Purchase Details */}
        <div className="bg-card/50 border border-primary/10 rounded-lg p-6 mb-8 text-left space-y-4">
          <h2 className="text-sm font-bold font-display tracking-wider text-primary uppercase border-b border-primary/10 pb-2 flex items-center gap-2">
            <span className="text-xs">📋</span> TRANSACTION_RECEIPT
          </h2>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-muted-foreground">PURCHASE_ID</span>
            <code className="bg-background/50 px-2 py-1 rounded border border-primary/10 text-primary">{purchaseId.substring(0, 12)}...</code>
          </div>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-muted-foreground">STATUS</span>
            <span className="text-green-500 flex items-center gap-1 font-bold">
                <span>✅</span> CONFIRMED
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-muted-foreground">TIMESTAMP</span>
            <span className="text-foreground">{new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Access Information */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-6 mb-8 text-left">
          <h2 className="text-sm font-bold font-display tracking-wider text-primary uppercase mb-4 flex items-center gap-2">
            <span className="text-xs">🔓</span> NEXT_STEPS
          </h2>
          <ol className="space-y-3 text-xs font-mono text-muted-foreground list-decimal list-inside">
            <li>Click <span className="text-foreground font-bold">"VIEW_DATA"</span> to access content</li>
            <li>Approve signature to verify ownership</li>
            <li>SEAL protocol decrypts your data</li>
            <li>Data is decrypted locally</li>
            <li>Access granted</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            className="flex-1 px-4 py-3 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider" 
            onClick={onClose}
          >
            CONTINUE_SHOPPING
          </button>
          <button 
            className="flex-[1.5] px-4 py-3 rounded-md bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)]" 
            onClick={onAccessData}
          >
            📊 VIEW_DATA
          </button>
        </div>
      </div>
    </div>
  );
}
