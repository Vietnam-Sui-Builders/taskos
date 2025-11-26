import { useEffect, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { Experience } from '@/components/marketplace/types';

export interface PurchasedExperience extends Experience {
  purchaseId: string;
  buyer: string;
  seller: string;
  pricePaid: number;
  licenseType: number;
  purchasedAt: number;
}

export function usePurchasedExperiences(ownerAddress?: string) {
  const client = useSuiClient();
  const [purchases, setPurchases] = useState<PurchasedExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

  useEffect(() => {
    if (!ownerAddress) {
      setError('Wallet address is required to load purchases');
      setPurchases([]);
      setIsLoading(false);
      return;
    }

    fetchPurchases(ownerAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAddress, taskosPackageId]);

  const fetchPurchases = async (wallet: string) => {
    if (!taskosPackageId) {
      setError('TASKOS_PACKAGE_ID is not configured');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch Purchase objects owned by the wallet
      const owned = await client.getOwnedObjects({
        owner: wallet,
        filter: {
          StructType: `${taskosPackageId}::marketplace::Purchase`,
        },
        options: {
          showContent: true,
        },
      });

      const results: PurchasedExperience[] = [];

      for (const item of owned.data) {
        try {
          const purchaseObj = item.data;
          if (!purchaseObj || purchaseObj.content?.dataType !== 'moveObject') continue;

          const fields = purchaseObj.content.fields as Record<string, any>;
          const experienceId = String(fields.experience_id || '');
          if (!experienceId) continue;

          // Fetch the experience object for metadata
          const experienceObj = await client.getObject({
            id: experienceId,
            options: { showContent: true, showDisplay: true },
          });

          const expFields =
            experienceObj.data?.content?.dataType === 'moveObject'
              ? (experienceObj.data.content.fields as Record<string, any>)
              : null;

          if (!expFields || !experienceObj.data) continue;

          const parseOptionString = (value: any): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) return value[0] || '';
            if (typeof value === 'object' && 'vec' in value) {
              const vecVal = (value as any).vec;
              if (Array.isArray(vecVal)) return vecVal[0] || '';
            }
            if (typeof value === 'object' && 'fields' in value) {
              const maybeSome = (value as any).fields?.some;
              if (typeof maybeSome === 'string') return maybeSome;
              if (typeof maybeSome === 'object' && maybeSome?.fields?.bytes) {
                return maybeSome.fields.bytes;
              }
            }
            return '';
          };

          const parseDisplayField = (experience: any, key: string) => {
            return (
              experience?.data?.display?.data?.[key] ||
              experience?.data?.display?.data?.[`${key}#string`] ||
              ''
            );
          };

          const ratingCount = Number(expFields.rating_count || 0);
          const totalRating = Number(expFields.total_rating || 0);
          const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
          const walrusContent = parseOptionString(expFields.walrus_content_blob_id);
          const walrusResult = parseOptionString(expFields.walrus_result_blob_id);
          const description =
            parseDisplayField(experienceObj, 'description') ||
            parseOptionString(expFields.description) ||
            '';

          results.push({
            purchaseId: purchaseObj.objectId,
            buyer: String(fields.buyer || wallet),
            seller: String(fields.seller || ''),
            pricePaid: Number(fields.price_paid || 0),
            licenseType: Number(fields.license_type || 0),
            purchasedAt: Number(fields.purchase_timestamp || 0),
            id: experienceObj.data.objectId,
            skill: String(expFields.skill || 'Unknown Skill'),
            domain: String(expFields.domain || 'General'),
            difficulty: parseInt(String(expFields.difficulty || '3')),
            quality_score: parseInt(String(expFields.quality_score || '80')),
            price: Number(expFields.price || 0),
            seller: String(expFields.creator || ''),
            rating: avgRating,
            soldCount: parseInt(String(expFields.sold_count || '0')),
            walrus_blob_id: walrusContent || walrusResult || '',
            seal_policy_id: String(expFields.seal_policy_id || ''),
            timeSpent: parseInt(String(expFields.time_spent || '0')),
            description,
          });
        } catch (innerErr) {
          console.warn('Failed to parse purchase item:', innerErr);
        }
      }

      setPurchases(results);
    } catch (err) {
      console.error('Error fetching purchased experiences:', err);
      setError('Failed to load purchased experiences');
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    if (ownerAddress) {
      fetchPurchases(ownerAddress);
    }
  };

  return {
    purchases,
    isLoading,
    error,
    refetch,
  };
}
