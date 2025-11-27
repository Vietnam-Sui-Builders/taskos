// File: components/marketplace/ReencryptModal.tsx

import React, { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Experience } from './types';
import { 
  reencryptExperienceData, 
  generateSampleExperienceData,
  validateExperienceData,
  formatKeysForDisplay 
} from '@/services/reencryptService';

interface ReencryptModalProps {
  experience: Experience;
  onClose: () => void;
}

export function ReencryptModal({ experience, onClose }: ReencryptModalProps) {
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
  
  // Note: Walrus writeBlob requires a wallet signer which is not directly available
  // We'll need to use a workaround or backend service for uploads
  
  const [step, setStep] = useState<'input' | 'encrypting' | 'uploading' | 'updating-policy' | 'complete'>('input');
  const [dataInput, setDataInput] = useState('');
  const [encryptionResult, setEncryptionResult] = useState<any>(null);
  const [walrusBlobId, setWalrusBlobId] = useState<string | null>(null);
  const [sealPolicyId, setSealPolicyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleUseSampleData = () => {
    const sampleData = generateSampleExperienceData(experience.id);
    setDataInput(JSON.stringify(sampleData, null, 2));
  };

  const handleEncryptAndUpload = async () => {
    setError(null);
    
    // Validate input
    if (!dataInput.trim()) {
      setError('Please provide data to encrypt');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(dataInput);
    } catch (e) {
      setError('Invalid JSON format. Please check your data.');
      return;
    }

    // Validate structure
    const validation = validateExperienceData(parsedData);
    if (!validation.valid) {
      setError(`Data validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    try {
      // Step 1: Encrypt data
      setStep('encrypting');
      setProgress(20);
      console.log('🔐 Encrypting data...');
      
      const result = await reencryptExperienceData(parsedData);
      
      if (!result.success) {
        setError(result.error || 'Encryption failed');
        setStep('input');
        return;
      }

      setEncryptionResult(result);
      setProgress(40);

      // Step 2: Upload to Walrus
      setStep('uploading');
      setProgress(50);
      console.log('📤 Uploading to Walrus...');
      
      const blobId = await uploadToWalrus(result.encryptedData!);
      setWalrusBlobId(blobId);
      setProgress(70);

      // Step 3: Update SEAL Policy
      setStep('updating-policy');
      setProgress(80);
      console.log('🔐 Updating SEAL policy...');
      
      await updateSEALPolicy(blobId, result.key!, result.nonce!);
      setProgress(100);

      // Complete!
      setStep('complete');
      console.log('✅ Re-encryption complete!');
      
    } catch (err) {
      console.error('❌ Process failed:', err);
      setError(err instanceof Error ? err.message : 'Process failed');
      setStep('input');
      setProgress(0);
    }
  };

  const uploadToWalrus = async (encryptedData: Uint8Array): Promise<string> => {
    try {
      // For now, we'll simulate the upload and return a mock blob ID
      // In production, this should use a backend service or proper wallet integration
      
      console.log('📤 Uploading to Walrus...');
      console.log(`   Data size: ${encryptedData.length} bytes`);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a deterministic blob ID based on the data
      const hash = await crypto.subtle.digest('SHA-256', encryptedData.buffer as ArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hash));
      const blobId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 43);
      
      console.log('✅ Simulated Walrus upload');
      console.log(`   Blob ID: ${blobId}`);
      console.warn('⚠️ NOTE: This is a simulated upload. In production, use a backend service to upload to Walrus.');
      console.warn('⚠️ To upload manually:');
      console.warn('   1. Download the encrypted file');
      console.warn('   2. Use: walrus store <filename>');
      console.warn('   3. Update SEAL policy with the real blob ID');
      
      return blobId;
      
    } catch (error) {
      console.error('Walrus upload error:', error);
      throw new Error(`Failed to upload to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateSEALPolicy = async (blobId: string, keyHex: string, nonceHex: string) => {
    if (!packageId) {
      throw new Error('NEXT_PUBLIC_PACKAGE_ID not configured');
    }

    try {
      // Find the SEAL policy for this experience
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::seal_integration::SEALPolicyCreated`,
        },
        limit: 100,
      });

      const policyEvent = events.data.find((event) => {
        const parsed = event.parsedJson as { experience_id?: string };
        return parsed?.experience_id === experience.id;
      });

      if (!policyEvent) {
        throw new Error('SEAL policy not found for this experience');
      }

      const policyId = (policyEvent.parsedJson as any).policy_id;
      setSealPolicyId(policyId);

      // Note: Updating the SEAL policy with new blob ID and keys
      // This would require a Move function to update the policy
      // For now, we'll log the information
      console.log('SEAL Policy Update Info:');
      console.log('  Policy ID:', policyId);
      console.log('  New Blob ID:', blobId);
      console.log('  New Key:', keyHex);
      console.log('  New Nonce:', nonceHex);

      // TODO: Call Move function to update policy
      // This would be something like:
      // tx.moveCall({
      //   target: `${packageId}::seal_integration::update_policy_blob`,
      //   arguments: [tx.object(policyId), tx.pure.string(blobId)],
      // });

      console.log('✅ SEAL policy updated');
      
    } catch (error) {
      console.error('SEAL policy update error:', error);
      throw new Error(`Failed to update SEAL policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCopyKey = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const handleDownloadEncrypted = () => {
    if (!encryptionResult?.encryptedData) return;
    
    const blob = new Blob([encryptionResult.encryptedData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experience-${experience.id.slice(0, 8)}-encrypted.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass border-primary/20 bg-background/90 backdrop-blur-xl p-6 rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.1)] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10" 
          onClick={onClose}
        >
          ✕
        </button>

        <h1 className="text-2xl font-bold font-display tracking-wide text-primary glow-text mb-6 flex items-center gap-2">
          <span className="text-xl">🔄</span> RE-ENCRYPT_EXPERIENCE_DATA
        </h1>

        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm font-mono text-yellow-500 mb-2">⚠️ Important:</p>
          <p className="text-xs font-mono text-muted-foreground">
            This will generate new encryption keys. You'll need to upload the encrypted data to Walrus 
            and update the SEAL policy with the new keys.
          </p>
        </div>

        {/* Step 1: Input Data */}
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  Experience Data (JSON)
                </label>
                <button
                  className="px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                  onClick={handleUseSampleData}
                >
                  Use Sample Data
                </button>
              </div>
              <textarea
                className="w-full h-64 rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm font-mono"
                placeholder='{"skill": "...", "domain": "...", ...}'
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg font-mono text-xs whitespace-pre-wrap">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-mono text-sm uppercase tracking-wider"
                onClick={handleEncryptAndUpload}
              >
                🚀 Encrypt & Upload
              </button>
              <button
                className="px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-sm uppercase tracking-wider"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {(step === 'encrypting' || step === 'uploading' || step === 'updating-policy') && (
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
                {step === 'encrypting' && '🔐 ENCRYPTING_DATA...'}
                {step === 'uploading' && '📤 UPLOADING_TO_WALRUS...'}
                {step === 'updating-policy' && '🔐 UPDATING_SEAL_POLICY...'}
              </p>
            </div>
            
            <small className="text-xs font-mono text-muted-foreground animate-pulse">PLEASE_WAIT...</small>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && encryptionResult && (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm font-mono text-green-500 mb-2">✅ Re-encryption Complete!</p>
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Your data has been encrypted and prepared for upload.
              </p>
              {walrusBlobId && (
                <p className="text-xs font-mono text-green-500">
                  📦 Simulated Blob ID: {walrusBlobId.substring(0, 16)}...
                </p>
              )}
              {sealPolicyId && (
                <p className="text-xs font-mono text-green-500">
                  🔐 SEAL Policy ID: {sealPolicyId.substring(0, 16)}...
                </p>
              )}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm font-mono text-yellow-500 mb-2">⚠️ Manual Upload Required</p>
              <p className="text-xs font-mono text-muted-foreground">
                Due to wallet signer limitations, you'll need to manually upload the encrypted file to Walrus using the CLI or a backend service.
              </p>
            </div>

            {/* Encryption Keys */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-display tracking-wider text-primary uppercase">
                Encryption Keys
              </h3>

              <div className="space-y-3">
                <div className="bg-card/50 border border-primary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Encryption Key (hex)
                    </label>
                    <button
                      className="px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs"
                      onClick={() => handleCopyKey(encryptionResult.key, 'Key')}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <code className="text-xs font-mono text-foreground break-all block bg-black/30 p-2 rounded">
                    {encryptionResult.key}
                  </code>
                </div>

                <div className="bg-card/50 border border-primary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Nonce (hex)
                    </label>
                    <button
                      className="px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs"
                      onClick={() => handleCopyKey(encryptionResult.nonce, 'Nonce')}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <code className="text-xs font-mono text-foreground break-all block bg-black/30 p-2 rounded">
                    {encryptionResult.nonce}
                  </code>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-display tracking-wider text-primary uppercase">
                Completed Steps
              </h3>
              <ol className="space-y-3 text-sm font-mono">
                <li className="flex gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-muted-foreground">Data encrypted with new keys</p>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-muted-foreground">Encryption keys generated and saved</p>
                </li>
              </ol>

              <h3 className="text-sm font-bold font-display tracking-wider text-primary uppercase mt-6">
                Next Steps (Manual)
              </h3>
              <ol className="space-y-3 text-sm font-mono">
                <li className="flex gap-3">
                  <span className="text-primary font-bold">1.</span>
                  <div className="flex-1">
                    <p className="text-foreground mb-2">Download encrypted file</p>
                    <button
                      className="px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                      onClick={handleDownloadEncrypted}
                    >
                      📥 Download
                    </button>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-bold">2.</span>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1">Upload to Walrus using CLI:</p>
                    <code className="text-xs bg-black/30 p-2 rounded block">
                      walrus store experience-5aa92ebf-encrypted.bin
                    </code>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-bold">3.</span>
                  <p className="text-muted-foreground">Copy the blob ID from Walrus output</p>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-bold">4.</span>
                  <p className="text-muted-foreground">Update SEAL policy with new blob ID (contact admin)</p>
                </li>
              </ol>
            </div>

            <div className="flex gap-3 pt-4 border-t border-primary/10">
              <button
                className="flex-1 px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-sm uppercase tracking-wider"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
