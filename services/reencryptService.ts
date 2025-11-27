/**
 * Re-encryption Service
 * 
 * Handles re-encrypting experience data with proper SEAL policies
 */

import { encryptDataClient } from './walrusService';
import { SuiClient } from '@mysten/sui/client';

interface ReencryptionResult {
  success: boolean;
  encryptedData?: Uint8Array;
  key?: string; // hex-encoded
  nonce?: string; // hex-encoded
  error?: string;
}

/**
 * Re-encrypt experience data with new keys
 * 
 * This function:
 * 1. Takes the original (or new) plaintext data
 * 2. Generates new encryption keys
 * 3. Encrypts the data
 * 4. Returns the encrypted data and keys for SEAL policy
 */
export async function reencryptExperienceData(
  plaintextData: string | object
): Promise<ReencryptionResult> {
  try {
    console.log('🔄 Starting re-encryption process...');

    // Convert object to JSON string if needed
    const dataString = typeof plaintextData === 'string' 
      ? plaintextData 
      : JSON.stringify(plaintextData, null, 2);

    console.log(`📝 Data size: ${dataString.length} characters`);

    // Encrypt with new keys
    const { encryptedData, nonce, key } = await encryptDataClient(dataString);

    // Convert to hex for storage
    const keyHex = Buffer.from(key).toString('hex');
    const nonceHex = Buffer.from(nonce).toString('hex');

    console.log('✅ Re-encryption successful');
    console.log(`   Encrypted size: ${encryptedData.length} bytes`);
    console.log(`   Key: ${keyHex.substring(0, 16)}...`);
    console.log(`   Nonce: ${nonceHex.substring(0, 16)}...`);

    return {
      success: true,
      encryptedData,
      key: keyHex,
      nonce: nonceHex,
    };
  } catch (error) {
    console.error('❌ Re-encryption failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate sample experience data for testing
 */
export function generateSampleExperienceData(experienceId: string) {
  return {
    experienceId,
    skill: 'New Experience',
    domain: 'General',
    difficulty: 3,
    quality_score: 85,
    timeSpent: 7200, // 2 hours
    description: 'Sample experience data for testing',
    content: {
      summary: 'This is a sample experience that demonstrates the data structure.',
      learnings: [
        'Key learning point 1',
        'Key learning point 2',
        'Key learning point 3',
      ],
      challenges: [
        'Challenge faced during the task',
        'How it was overcome',
      ],
      recommendations: [
        'Best practice recommendation 1',
        'Best practice recommendation 2',
      ],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0',
      format: 'json',
    },
  };
}

/**
 * Prepare data for Walrus upload
 * Returns a Blob that can be uploaded
 */
export function prepareForWalrusUpload(encryptedData: Uint8Array): Blob {
  return new Blob([encryptedData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
}

/**
 * Validate experience data structure
 */
export function validateExperienceData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push('Data is null or undefined');
    return { valid: false, errors };
  }

  // Check required fields
  const requiredFields = ['skill', 'domain', 'difficulty', 'quality_score'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate types
  if (data.difficulty && (data.difficulty < 1 || data.difficulty > 5)) {
    errors.push('Difficulty must be between 1 and 5');
  }

  if (data.quality_score && (data.quality_score < 0 || data.quality_score > 100)) {
    errors.push('Quality score must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format encryption keys for display
 */
export function formatKeysForDisplay(key: string, nonce: string) {
  return {
    key: {
      full: key,
      preview: `${key.substring(0, 16)}...${key.substring(key.length - 8)}`,
      length: key.length,
    },
    nonce: {
      full: nonce,
      preview: `${nonce.substring(0, 16)}...${nonce.substring(nonce.length - 8)}`,
      length: nonce.length,
    },
  };
}

/**
 * Instructions for updating SEAL policy with new keys
 */
export function getUpdateInstructions(experienceId: string, key: string, nonce: string) {
  return {
    step1: 'Upload encrypted data to Walrus',
    step2: 'Get the blob ID from Walrus',
    step3: 'Update SEAL policy with new blob ID',
    step4: 'Store encryption keys in SEAL policy',
    keys: {
      key,
      nonce,
    },
    note: 'Keep these keys secure! They are needed to decrypt the data.',
  };
}
