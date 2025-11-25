import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

interface PurchaseExperienceParams {
  listingId: string;
  paymentAmount: number;
}

type LicenseOption = 'personal' | 'commercial' | 'exclusive' | 'subscription' | 'view_only';

interface ListExperienceParams {
  experienceId: string;
  price: number;
  licenseType: LicenseOption;
  copies: number;
}

export function useMarketplace() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isProcessing, setIsProcessing] = useState(false);

  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

  /**
   * Purchase an experience from the marketplace
   * Based on: docs/integration-logic-module.md - Interaction 4
   */
  const purchaseExperience = async (
    params: PurchaseExperienceParams
  ): Promise<string> => {
    if (!taskosPackageId) {
      throw new Error('TASKOS_PACKAGE_ID is not configured');
    }

    setIsProcessing(true);

    try {
      const tx = new Transaction();

      // 1. Get listing object to verify it exists
      const listingObject = await client.getObject({
        id: params.listingId,
        options: { showContent: true },
      });

      if (!listingObject.data) {
        throw new Error('Listing not found');
      }

      // 2. Prepare payment (split coin if needed)
      const [coin] = tx.splitCoins(tx.gas, [params.paymentAmount]);

      // 3. Call marketplace::purchase_experience
      tx.moveCall({
        target: `${taskosPackageId}::marketplace::purchase_experience`,
        arguments: [tx.object(params.listingId), coin],
      });

      // 5. Execute transaction
      const response = await signAndExecute({
        transaction: tx,
      });

      console.log('Purchase completed:', response);

      // Extract purchase ID from events or digest
      const purchaseId = response.digest;

      return purchaseId;
    } catch (error) {
      console.error('Error purchasing experience:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * List an experience in the marketplace
   * Based on: docs/integration-logic-module.md - Interaction 5
   */
  const listExperience = async (
    params: ListExperienceParams
  ): Promise<string> => {
    if (!taskosPackageId) {
      throw new Error('TASKOS_PACKAGE_ID is not configured');
    }

    if (params.copies <= 0) {
      throw new Error('Copies must be greater than zero');
    }

    const licenseMap: Record<LicenseOption, number> = {
      personal: 0,
      commercial: 1,
      exclusive: 2,
      subscription: 3,
      view_only: 4,
    };

    const licenseValue = licenseMap[params.licenseType];

    setIsProcessing(true);

    try {
      const tx = new Transaction();

      // Call marketplace::list_experience
      tx.moveCall({
        target: `${taskosPackageId}::marketplace::list_experience`,
        arguments: [
          tx.object(params.experienceId),
          tx.pure.u64(params.price),
          tx.pure.u8(licenseValue),
          tx.pure.u64(params.copies),
        ],
      });

      const response = await signAndExecute({
        transaction: tx,
      });

      console.log('Experience listed:', response);

      return response.digest;
    } catch (error) {
      console.error('Error listing experience:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Fetch all marketplace listings
   */
  const fetchListings = async () => {
    if (!taskosPackageId) {
      throw new Error('TASKOS_PACKAGE_ID is not configured');
    }

    try {
      // Query for marketplace listings by filtering events
      // This is a simplified version - in production, use an indexer
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${taskosPackageId}::marketplace::ExperienceListed`,
        },
        limit: 50,
      });

      console.log('Marketplace listings:', events);

      return events.data;
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  };

  return {
    purchaseExperience,
    listExperience,
    fetchListings,
    isProcessing,
  };
}
