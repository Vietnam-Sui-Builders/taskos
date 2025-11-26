/**
 * Backend Service: Purchase Event Listener
 * 
 * Listens for ExperiencePurchased events on the Sui blockchain
 * and automatically adds buyers to SEAL policy allowlists.
 * 
 * This service should run as a separate backend process.
 */

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { HealthCheckServer } from "./listenerHealthCheck";

interface ExperiencePurchasedEvent {
  purchase_id: string;
  experience_id: string;
  buyer: string;
  seller: string;
  price: number;
}

interface SEALPolicy {
  id: string;
  experience_id: string;
  policy_type: 0 | 1 | 2;
  owner: string;
  allowlist: string[];
}

class PurchaseEventListener {
  private client: SuiClient;
  private adminKeypair: Ed25519Keypair;
  private packageId: string;
  private isRunning: boolean = false;
  private lastProcessedEventSeq: string | null = null;
  private healthCheck: HealthCheckServer;

  constructor(
    adminPrivateKey: string,
    packageId: string,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet',
    healthCheckPort: number = 3001
  ) {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    
    // Initialize admin keypair from private key
    const privateKeyBytes = fromBase64(adminPrivateKey);
    this.adminKeypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    
    this.packageId = packageId;
    this.healthCheck = new HealthCheckServer(healthCheckPort);
    
    console.log('🔧 Purchase Event Listener initialized');
    console.log(`📦 Package ID: ${packageId}`);
    console.log(`👤 Admin Address: ${this.adminKeypair.getPublicKey().toSuiAddress()}`);
  }

  /**
   * Start listening for purchase events
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Listener is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting purchase event listener...');

    // Start health check server
    this.healthCheck.start();

    // Poll for new events every 5 seconds
    while (this.isRunning) {
      try {
        await this.pollEvents();
        await this.sleep(5000); // 5 second interval
      } catch (error) {
        console.error('❌ Error polling events:', error);
        this.healthCheck.recordError(error instanceof Error ? error.message : String(error));
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  /**
   * Stop the listener
   */
  stop() {
    console.log('🛑 Stopping purchase event listener...');
    this.isRunning = false;
    this.healthCheck.stop();
  }

  /**
   * Poll for new ExperiencePurchased events
   */
  private async pollEvents() {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::marketplace::ExperiencePurchased`,
        },
        limit: 50,
        order: 'descending',
      });

      if (events.data.length === 0) {
        return;
      }

      // Process events in chronological order (oldest first)
      const eventsToProcess = events.data.reverse();

      for (const event of eventsToProcess) {
        // Skip if we've already processed this event
        if (this.lastProcessedEventSeq && event.id.eventSeq <= this.lastProcessedEventSeq) {
          continue;
        }

        await this.handlePurchaseEvent(event.parsedJson as ExperiencePurchasedEvent);
        this.lastProcessedEventSeq = event.id.eventSeq;
      }
    } catch (error) {
      console.error('❌ Error querying events:', error);
      throw error;
    }
  }

  /**
   * Handle a single purchase event
   */
  private async handlePurchaseEvent(event: ExperiencePurchasedEvent) {
    console.log('\n📦 New purchase detected:');
    console.log(`  Experience: ${event.experience_id}`);
    console.log(`  Buyer: ${event.buyer}`);
    console.log(`  Seller: ${event.seller}`);
    console.log(`  Price: ${event.price / 1e9} SUI`);

    try {
      // 1. Find SEAL policy for this experience
      const policy = await this.getSEALPolicy(event.experience_id);

      if (!policy) {
        console.warn(`⚠️ No SEAL policy found for experience ${event.experience_id}`);
        return;
      }

      console.log(`🔐 Found SEAL policy: ${policy.id}`);
      console.log(`  Policy Type: ${this.getPolicyTypeLabel(policy.policy_type)}`);

      // 2. Only process allowlist-type policies
      if (policy.policy_type !== 1) {
        console.log(`ℹ️ Policy is not allowlist type, skipping automatic access grant`);
        return;
      }

      // 3. Check if buyer is already in allowlist
      if (policy.allowlist.some(addr => addr.toLowerCase() === event.buyer.toLowerCase())) {
        console.log(`✓ Buyer already in allowlist, skipping`);
        return;
      }

      // 4. Add buyer to allowlist
      await this.addToAllowlist(policy.id, event.buyer);

      console.log(`✅ Successfully added buyer to allowlist`);
      this.healthCheck.recordEvent(event.purchase_id);
    } catch (error) {
      console.error(`❌ Failed to process purchase event:`, error);
      this.healthCheck.recordError(error instanceof Error ? error.message : String(error));
      // Don't throw - continue processing other events
    }
  }

  /**
   * Fetch SEAL policy for an experience
   */
  private async getSEALPolicy(experienceId: string): Promise<SEALPolicy | null> {
    try {
      // Query for SEALPolicyCreated events
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::seal_integration::SEALPolicyCreated`,
        },
        limit: 100,
      });

      // Find matching policy event
      const policyEvent = events.data.find((event) => {
        const parsed = event.parsedJson as { experience_id?: string };
        return parsed?.experience_id === experienceId;
      });

      if (!policyEvent) {
        return null;
      }

      const eventData = policyEvent.parsedJson as {
        policy_id: string;
        experience_id: string;
        policy_type: 0 | 1 | 2;
      };

      // Fetch the actual policy object
      const policyObject = await this.client.getObject({
        id: eventData.policy_id,
        options: { showContent: true },
      });

      if (!policyObject.data?.content || policyObject.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = policyObject.data.content.fields as Record<string, any>;

      return {
        id: policyObject.data.objectId,
        experience_id: fields.experience_id as string,
        policy_type: fields.policy_type as 0 | 1 | 2,
        owner: fields.owner as string,
        allowlist: (fields.allowlist as string[]) || [],
      };
    } catch (error) {
      console.error('Error fetching SEAL policy:', error);
      return null;
    }
  }

  /**
   * Add buyer to SEAL policy allowlist
   */
  private async addToAllowlist(policyId: string, buyerAddress: string) {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${this.packageId}::seal_integration::add_to_allowlist`,
        arguments: [
          tx.object(policyId),
          tx.pure.address(buyerAddress),
        ],
      });

      // Sign and execute with admin wallet
      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Wait for transaction to be confirmed
      await this.client.waitForTransaction({
        digest: result.digest,
      });

      console.log(`  Transaction: ${result.digest}`);
    } catch (error) {
      console.error('Error adding to allowlist:', error);
      throw error;
    }
  }

  /**
   * Get policy type label
   */
  private getPolicyTypeLabel(type: 0 | 1 | 2): string {
    const labels = {
      0: 'Private',
      1: 'Allowlist',
      2: 'Subscription',
    };
    return labels[type];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in backend service
export { PurchaseEventListener };

// Example usage (for standalone script)
if (require.main === module) {
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;
  const NETWORK = (process.env.SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet';

  if (!ADMIN_PRIVATE_KEY) {
    console.error('❌ ADMIN_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  if (!PACKAGE_ID) {
    console.error('❌ NEXT_PUBLIC_PACKAGE_ID environment variable is required');
    process.exit(1);
  }

  const listener = new PurchaseEventListener(ADMIN_PRIVATE_KEY, PACKAGE_ID, NETWORK);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    listener.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    listener.stop();
    process.exit(0);
  });

  // Start the listener
  listener.start().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
