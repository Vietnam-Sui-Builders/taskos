#!/usr/bin/env tsx
/**
 * Script to run the Purchase Event Listener
 * 
 * This script starts a background service that listens for ExperiencePurchased
 * events and automatically adds buyers to SEAL policy allowlists.
 * 
 * Usage:
 *   npm run listen:purchases
 *   # or
 *   tsx scripts/run-purchase-listener.ts
 * 
 * Environment Variables Required:
 *   - ADMIN_PRIVATE_KEY: Base64-encoded private key for admin wallet
 *   - NEXT_PUBLIC_PACKAGE_ID: Deployed package ID
 *   - SUI_NETWORK: Network to connect to (mainnet/testnet/devnet)
 */

import { PurchaseEventListener } from '../services/purchaseEventListener';

async function main() {
  console.log('🚀 Starting Purchase Event Listener Service\n');

  // Validate environment variables
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;
  const NETWORK = (process.env.SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet';

  if (!ADMIN_PRIVATE_KEY) {
    console.error('❌ Error: ADMIN_PRIVATE_KEY environment variable is required');
    console.error('\nTo generate an admin keypair:');
    console.error('  1. Run: sui client new-address ed25519');
    console.error('  2. Export the private key from ~/.sui/sui_config/sui.keystore');
    console.error('  3. Set ADMIN_PRIVATE_KEY=<base64_private_key>');
    process.exit(1);
  }

  if (!PACKAGE_ID) {
    console.error('❌ Error: NEXT_PUBLIC_PACKAGE_ID environment variable is required');
    console.error('\nSet the deployed package ID:');
    console.error('  export NEXT_PUBLIC_PACKAGE_ID=0x...');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`  Network: ${NETWORK}`);
  console.log(`  Package ID: ${PACKAGE_ID}`);
  console.log(`  Admin Key: ${ADMIN_PRIVATE_KEY.substring(0, 10)}...`);
  console.log('');

  // Create and start listener
  const listener = new PurchaseEventListener(ADMIN_PRIVATE_KEY, PACKAGE_ID, NETWORK);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
    listener.stop();
    setTimeout(() => process.exit(0), 1000);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
    listener.stop();
    setTimeout(() => process.exit(0), 1000);
  });

  // Start the listener
  try {
    await listener.start();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
