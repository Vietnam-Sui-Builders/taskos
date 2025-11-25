// Example: How to integrate marketplace functionality in other components

import { useMarketplace } from '@/hooks/use-marketplace';
import { useMarketplaceListings } from '@/hooks/use-marketplace-listings';
import { useExperienceAccess } from '@/hooks/useExperienceAccess';

/**
 * Example 1: List your completed task as an experience
 */
export function ListTaskAsExperience({ taskId, price }: { taskId: string; price: number }) {
  const { listExperience, isProcessing } = useMarketplace();

  const handleList = async () => {
    try {
      // After task is completed and experience is minted
      const experienceId = await getExperienceIdFromTask(taskId);
      
      // List in marketplace
      const listingId = await listExperience({
        experienceId,
        price,
        licenseType: 'personal',
        copies: 5,
      });
      
      console.log('Experience listed:', listingId);
      alert('Your experience is now listed in the marketplace!');
    } catch (error) {
      console.error('Failed to list experience:', error);
    }
  };

  return (
    <button onClick={handleList} disabled={isProcessing}>
      {isProcessing ? 'Listing...' : 'List in Marketplace'}
    </button>
  );
}

/**
 * Example 2: Show marketplace listings in dashboard
 */
export function DashboardMarketplace() {
  const { experiences, isLoading } = useMarketplaceListings();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="dashboard-marketplace">
      <h2>Latest Marketplace Listings</h2>
      <div className="grid">
        {experiences.slice(0, 3).map((exp) => (
          <div key={exp.id} className="card">
            <h3>{exp.skill}</h3>
            <p>{exp.domain}</p>
            <span>{(exp.price / 1e9).toFixed(2)} SUI</span>
          </div>
        ))}
      </div>
      <a href="/marketplace">View All →</a>
    </div>
  );
}

/**
 * Example 3: Quick purchase button
 */
export function QuickPurchaseButton({ listingId, price }: { listingId: string; price: number }) {
  const { purchaseExperience, isProcessing } = useMarketplace();

  const handleQuickBuy = async () => {
    const confirmed = window.confirm(
      `Purchase this experience for ${(price / 1e9).toFixed(2)} SUI?`
    );
    
    if (!confirmed) return;

    try {
      const purchaseId = await purchaseExperience({
        listingId,
        paymentAmount: price,
      });
      
      alert('Purchase successful! ID: ' + purchaseId);
      // Redirect to access page
      window.location.href = `/experience/${listingId}`;
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  return (
    <button onClick={handleQuickBuy} disabled={isProcessing}>
      {isProcessing ? 'Processing...' : '🛒 Quick Buy'}
    </button>
  );
}

/**
 * Example 4: Check if user owns an experience
 */
export function MyExperiencesPage() {
  const { experiences } = useMarketplaceListings();
  const currentWallet = '0x...'; // Get from wallet hook

  const myPurchases = experiences.filter((exp) => 
    // In production, query purchase records from blockchain
    checkIfPurchased(exp.id, currentWallet)
  );

  return (
    <div>
      <h1>My Purchased Experiences</h1>
      {myPurchases.map((exp) => (
        <ExperienceAccessCard key={exp.id} experienceId={exp.id} />
      ))}
    </div>
  );
}

/**
 * Example 5: Access purchased experience data
 */
export function ExperienceAccessCard({ experienceId }: { experienceId: string }) {
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
  const { data, loading, error, canAccess } = useExperienceAccess(experienceId, packageId);

  if (loading) return <div>Verifying access...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!canAccess) return <div>Access denied. Purchase required.</div>;

  return (
    <div>
      <h3>Experience Data</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => downloadAsJSON(data)}>
        📥 Download
      </button>
    </div>
  );
}

// Helper functions (implement as needed)
function getExperienceIdFromTask(taskId: string): Promise<string> {
  // Query blockchain for experience minted from task
  return Promise.resolve('exp_' + taskId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkIfPurchased(_experienceId: string, _wallet: string): boolean {
  // Query purchase records from blockchain
  return false; // Placeholder
}

function downloadAsJSON(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'experience-data.json';
  a.click();
}
