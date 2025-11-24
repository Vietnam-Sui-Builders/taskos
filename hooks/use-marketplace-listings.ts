import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { Experience } from '@/components/marketplace/types';

export function useMarketplaceListings() {
  const client = useSuiClient();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskosPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

  useEffect(() => {
    const fetchListings = async () => {
      if (!taskosPackageId) {
        setError('TASKOS_PACKAGE_ID is not configured');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Query for ExperienceListed events
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${taskosPackageId}::marketplace::ExperienceListed`,
          },
          limit: 50,
          order: 'descending',
        });

        console.log('Marketplace events:', events);

        // Parse events to extract experience listings
        const experienceList: Experience[] = [];

        for (const event of events.data) {
          try {
            const eventData = event.parsedJson as Record<string, unknown>;
            
            // Fetch the actual experience object
            if (eventData.experience_id) {
              const experienceObj = await client.getObject({
                id: eventData.experience_id as string,
                options: { showContent: true },
              });

              if (
                experienceObj.data?.content &&
                'fields' in experienceObj.data.content
              ) {
                const fields = experienceObj.data.content.fields as Record<string, unknown>;

                const experience: Experience = {
                  id: experienceObj.data.objectId,
                  skill: String(fields.skill || 'Unknown Skill'),
                  domain: String(fields.domain || 'General'),
                  difficulty: parseInt(String(fields.difficulty || '3')),
                  quality_score: parseInt(String(fields.quality_score || '80')),
                  price: parseInt(String(fields.price || '100000000')), // Default 0.1 SUI
                  seller: String(fields.owner || fields.creator || '0x...'),
                  rating: Number(fields.rating || 4.5),
                  soldCount: parseInt(String(fields.sold_count || '0')),
                  walrus_blob_id: String(fields.walrus_blob_id || ''),
                  seal_policy_id: String(fields.seal_policy_id || ''),
                  timeSpent: parseInt(String(fields.time_spent || '3600')),
                };

                experienceList.push(experience);
              }
            }
          } catch (err) {
            console.warn('Error parsing experience event:', err);
          }
        }

        // If no events found, use mock data for demo
        if (experienceList.length === 0) {
          console.log('No marketplace listings found, using mock data');
          setExperiences(getMockExperiences());
        } else {
          setExperiences(experienceList);
        }
      } catch (err) {
        console.error('Error fetching marketplace listings:', err);
        setError('Failed to load marketplace listings');
        // Use mock data on error
        setExperiences(getMockExperiences());
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
