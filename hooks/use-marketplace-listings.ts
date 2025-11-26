import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { Experience } from '@/components/marketplace/types';
import { parseOptionString } from '@/lib/parseOptionString';

export function useMarketplaceListings() {
  const client = useSuiClient();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

  useEffect(() => {
    const fetchListings = async () => {
      // Validate PACKAGE_ID before making RPC calls
      if (!taskosPackageId) {
        setError('TASKOS_PACKAGE_ID is not configured. Please set NEXT_PUBLIC_PACKAGE_ID in your environment variables.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Query for ExperienceListed events with error handling
        let events;
        try {
          events = await client.queryEvents({
            query: {
              MoveEventType: `${taskosPackageId}::marketplace::ExperienceListed`,
            },
            limit: 50,
            order: 'descending',
          });
        } catch (rpcError: any) {
          console.error('RPC error querying events:', rpcError);
          throw new Error(`Failed to query blockchain events: ${rpcError.message || 'Network error'}`);
        }

        console.log('Marketplace events:', events);

        const parseDisplayField = (experienceObj: any, key: string): string => {
          try {
            return (
              experienceObj?.data?.display?.data?.[key] ||
              experienceObj?.data?.display?.data?.[`${key}#string`] ||
              ''
            );
          } catch (err) {
            console.warn(`Error parsing display field ${key}:`, err);
            return '';
          }
        };

        // Parse events to extract experience listings
        const experienceList: Experience[] = [];

        for (const event of events.data) {
          try {
            // Safely parse event data with validation
            const eventData = event.parsedJson as Record<string, unknown>;
            if (!eventData) {
              console.warn('Event has no parsedJson data, skipping');
              continue;
            }

            const listingId = (eventData.listing_id as string) || '';
            const experienceId = (eventData.experience_id as string) || '';
            
            if (!listingId || !experienceId) {
              console.warn('Event missing required fields (listing_id or experience_id), skipping');
              continue;
            }

            // Fetch listing for price/seller/copies with error handling
            let listingObj;
            try {
              listingObj = await client.getObject({
                id: listingId,
                options: { showContent: true },
              });
            } catch (objError: any) {
              console.warn(`Failed to fetch listing ${listingId}:`, objError);
              continue;
            }

            const listingFields =
              listingObj.data?.content?.dataType === 'moveObject'
                ? (listingObj.data.content.fields as Record<string, any>)
                : null;

            // Fetch experience for metadata with error handling
            let experienceObj;
            try {
              experienceObj = await client.getObject({
                id: experienceId,
                options: { showContent: true },
              });
            } catch (objError: any) {
              console.warn(`Failed to fetch experience ${experienceId}:`, objError);
              continue;
            }

            const expFields =
              experienceObj.data?.content?.dataType === 'moveObject'
                ? (experienceObj.data.content.fields as Record<string, any>)
                : null;

            if (!expFields || !listingFields) {
              console.warn('Missing fields in listing or experience object, skipping');
              continue;
            }

            // Parse optional fields safely using helper function
            const ratingCount = Number(expFields.rating_count || 0);
            const totalRating = Number(expFields.total_rating || 0);
            const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
            const walrusContent = parseOptionString(expFields.walrus_content_blob_id);
            const walrusResult = parseOptionString(expFields.walrus_result_blob_id);
            const description =
              parseDisplayField(experienceObj, 'description') ||
              parseOptionString(expFields.description) ||
              '';

            const experience: Experience = {
              id: experienceObj.data!.objectId,
              listingId,
              skill: String(expFields.skill || 'Unknown Skill'),
              domain: String(expFields.domain || 'General'),
              difficulty: parseInt(String(expFields.difficulty || '3')),
              quality_score: parseInt(String(expFields.quality_score || '80')),
              price: Number(listingFields.price || expFields.price || 0),
              seller: String(listingFields.seller || expFields.creator || '0x...'),
              rating: avgRating,
              soldCount: parseInt(String(expFields.sold_count || '0')),
              walrus_blob_id: walrusContent || walrusResult || '',
              seal_policy_id: String(expFields.seal_policy_id || ''),
              timeSpent: parseInt(String(expFields.time_spent || '3600')),
              description,
            };

            experienceList.push(experience);
          } catch (err: any) {
            console.warn('Error parsing experience event:', err);
            // Continue processing other events
          }
        }

        // Check if we should use mock data in development
        if (experienceList.length === 0 && process.env.NODE_ENV === 'development') {
          console.warn('No on-chain listings found. Using mock data for development.');
          setExperiences(getMockExperiences());
        } else {
          setExperiences(experienceList);
        }
      } catch (err: any) {
        console.error('Error fetching marketplace listings:', err);
        
        // Return specific error messages for different failure types
        if (err.message?.includes('query blockchain events')) {
          setError('Network error: Unable to connect to blockchain. Please check your connection and try again.');
        } else if (err.message?.includes('PACKAGE_ID')) {
          setError('Configuration error: TASKOS_PACKAGE_ID is not properly configured.');
        } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
          setError('Network error: Unable to reach the blockchain node. Please try again later.');
        } else {
          setError(`Failed to load marketplace listings: ${err.message || 'Unknown error'}`);
        }
        
        // Fallback to mock data in development if error occurs
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error occurred. Using mock data for development.');
          setExperiences(getMockExperiences());
        } else {
          setExperiences([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [client, taskosPackageId]);

  const refetch = async () => {
    setIsLoading(true);
    // Trigger re-fetch by updating a dependency
  };

  return {
    experiences,
    isLoading,
    error,
    refetch,
  };
}

// Mock data for development/demo
function getMockExperiences(): Experience[] {
  return [
    {
      id: 'exp_1',
      skill: 'Backend API Design',
      domain: 'FinTech',
      difficulty: 4,
      quality_score: 92,
      price: 250000000, // 0.25 SUI
      seller: '0x2f4a1b3c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s',
      rating: 4.8,
      soldCount: 47,
      walrus_blob_id: 'blob_backend_api_xyz',
      seal_policy_id: 'policy_backend_xyz',
      timeSpent: 14400, // 4 hours
    },
    {
      id: 'exp_2',
      skill: 'React Component Library',
      domain: 'Frontend',
      difficulty: 3,
      quality_score: 88,
      price: 180000000, // 0.18 SUI
      seller: '0x3g5b2c4d6e8f0g1h2i3j4k5l6m7n8o9p0q1r2s3t',
      rating: 4.6,
      soldCount: 35,
      walrus_blob_id: 'blob_react_components_abc',
      seal_policy_id: 'policy_frontend_abc',
      timeSpent: 10800, // 3 hours
    },
    {
      id: 'exp_3',
      skill: 'Machine Learning Pipeline',
      domain: 'AI/ML',
      difficulty: 5,
      quality_score: 95,
      price: 500000000, // 0.5 SUI
      seller: '0x4h6c3d5e7f9g1h3i4j5k6l7m8n9o0p1q2r3s4t5u',
      rating: 4.9,
      soldCount: 22,
      walrus_blob_id: 'blob_ml_pipeline_def',
      seal_policy_id: 'policy_ml_def',
      timeSpent: 28800, // 8 hours
    },
    {
      id: 'exp_4',
      skill: 'Smart Contract Audit',
      domain: 'Web3',
      difficulty: 5,
      quality_score: 97,
      price: 750000000, // 0.75 SUI
      seller: '0x5i7d4e6f8g0h2i4j5k6l7m8n9o0p1q2r3s4t5u6v',
      rating: 5.0,
      soldCount: 18,
      walrus_blob_id: 'blob_audit_ghi',
      seal_policy_id: 'policy_web3_ghi',
      timeSpent: 21600, // 6 hours
    },
    {
      id: 'exp_5',
      skill: 'E-commerce Platform Setup',
      domain: 'E-commerce',
      difficulty: 4,
      quality_score: 90,
      price: 350000000, // 0.35 SUI
      seller: '0x6j8e5f7g9h1i3j5k6l7m8n9o0p1q2r3s4t5u6v7w',
      rating: 4.7,
      soldCount: 41,
      walrus_blob_id: 'blob_ecommerce_jkl',
      seal_policy_id: 'policy_ecommerce_jkl',
      timeSpent: 18000, // 5 hours
    },
    {
      id: 'exp_6',
      skill: 'Healthcare Data Analytics',
      domain: 'Healthcare',
      difficulty: 4,
      quality_score: 93,
      price: 420000000, // 0.42 SUI
      seller: '0x7k9f6g8h0i2j4k6l7m8n9o0p1q2r3s4t5u6v7w8x',
      rating: 4.8,
      soldCount: 29,
      walrus_blob_id: 'blob_healthcare_mno',
      seal_policy_id: 'policy_healthcare_mno',
      timeSpent: 16200, // 4.5 hours
    },
  ];
}
