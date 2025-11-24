# Marketplace Purchase Flow Component

This is a complete marketplace purchase flow implementation based on the design specification in `docs/MarketplaceFlow.md`.

## Components

### 1. `MarketplaceFlow.tsx` - Main Container
The orchestrator component that manages the entire purchase flow state machine:
- Browse marketplace
- View experience details
- Checkout process
- Purchase confirmation
- Data access

### 2. `SearchAndFilter.tsx` - Search & Filter Panel
Provides filtering and search capabilities:
- Full-text search
- Skills filter (Backend, Frontend, AI/ML, DevOps, UI/UX, Data)
- Domain filter (FinTech, Healthcare, E-commerce, SaaS, Web3)
- Price range slider
- Quality score minimum
- Sort options (newest, most bought, highest rated, cheapest)

### 3. `ExperienceCard.tsx` - Experience Preview Card
Displays experience summary in grid view:
- Skill and domain
- Quality score with visual bar
- Rating and statistics
- Seller information
- Price and CTA button

### 4. `ExperienceDetailModal.tsx` - Detailed View
Shows complete experience details:
- Full description
- Quality metrics
- Seller information
- License type selection (Personal, Commercial, AI Training)
- What's included list
- Pricing breakdown

### 5. `CheckoutModal.tsx` - Checkout & Payment
Handles the purchase transaction:
- Order summary
- Wallet information display
- Payment method info (blockchain transaction)
- Terms and conditions agreement
- Error handling with retry
- Processing state management

### 6. `PurchaseConfirmation.tsx` - Success Screen
Displays successful purchase confirmation:
- Purchase ID and details
- Transaction timestamp
- Next steps instructions
- Action buttons (Continue Shopping, View Data)

### 7. `AccessDataModal.tsx` - Data Access & Decryption
Integrates with SEAL and Walrus to access purchased data:
- Access verification
- Data decryption
- Content display
- Download and sharing options
- Expiration notice

### 8. `ErrorDisplay.tsx` - Common Error Component
Reusable error display with:
- Error message formatting
- Technical details (collapsible)
- Retry and dismiss actions

## Types

See `types.ts` for TypeScript interfaces:
- `Experience` - Experience data structure
- `PurchaseListing` - Purchase listing with license type
- `AppError` - Error object structure
- `ExperienceData` - Decrypted experience data

## Usage

### Basic Implementation

```tsx
import { MarketplaceFlow } from '@/components/marketplace';

export default function MarketplacePage() {
  return <MarketplaceFlow />;
}
```

### With Custom Data

```tsx
import { MarketplaceFlow } from '@/components/marketplace';
import { Experience } from '@/components/marketplace/types';

const customExperiences: Experience[] = [
  {
    id: 'exp_1',
    skill: 'Backend API Design',
    domain: 'FinTech',
    difficulty: 4,
    quality_score: 92,
    price: 250000000, // 0.25 SUI in Mist
    seller: '0x2f4...',
    rating: 4.8,
    soldCount: 47,
    walrus_blob_id: 'blob_xyz',
    seal_policy_id: 'policy_xyz',
  },
  // ... more experiences
];

// Pass to component via props (requires modification to accept props)
```

## Purchase Flow

```
1. Browse Marketplace
   ↓ (Select Experience)
2. View Details + Choose License
   ↓ (Proceed to Checkout)
3. Checkout (Review + Approve)
   ↓ (Complete Purchase)
4. Payment Processing
   ↓ (Transaction Confirmed)
5. Purchase Confirmation ✓
   ↓ (View Experience Data)
6. Access Data (SEAL + Decryption)
   ↓ (Data Decrypted)
7. View Decrypted Experience Data ✓
```

## Integration Points

### Required Hooks

1. **useExperienceAccess** - Already exists in `hooks/useExperienceAccess.ts`
   - Verifies access rights
   - Decrypts data via SEAL
   - Returns experience data

2. **useMarketplace** - TODO: Needs implementation
   - `purchaseExperience(experienceId, price)` - Execute purchase transaction
   - Returns purchase ID on success

### Environment Variables

```bash
NEXT_PUBLIC_TASKOS_PACKAGE_ID=<your-package-id>
```

## Styling

The component uses CSS custom properties (CSS variables) for theming:

```css
--background
--foreground
--card
--border
--primary
--secondary
--muted
--muted-foreground
--accent
```

These should be defined in your global CSS or use the existing theme variables.

## Features

### Implemented
✅ Complete purchase flow state machine
✅ Search and filtering
✅ Experience cards with quality indicators
✅ Detailed experience view
✅ License type selection (Personal, Commercial, AI Training)
✅ Checkout with order summary
✅ Wallet integration display
✅ Error handling and retry logic
✅ Purchase confirmation
✅ Data access with SEAL integration
✅ Responsive design
✅ TypeScript type safety

### TODO (Optional Enhancements)
- [ ] Implement `useMarketplace` hook for actual blockchain transactions
- [ ] Add pagination for experience grid
- [ ] Implement actual filtering logic
- [ ] Add experience reviews and ratings system
- [ ] Implement seller profile page
- [ ] Add purchase history page
- [ ] Enable JSON download functionality
- [ ] Add clipboard copy functionality
- [ ] Implement related experiences recommendation
- [ ] Add analytics tracking

## File Structure

```
components/
├── marketplace/
│   ├── MarketplaceFlow.tsx        # Main container
│   ├── SearchAndFilter.tsx        # Search & filter panel
│   ├── ExperienceCard.tsx         # Experience card component
│   ├── ExperienceDetailModal.tsx  # Detail modal
│   ├── CheckoutModal.tsx          # Checkout modal
│   ├── PurchaseConfirmation.tsx   # Success screen
│   ├── AccessDataModal.tsx        # Data access screen
│   ├── MarketplaceFlow.css        # All styles
│   ├── types.ts                   # TypeScript types
│   └── index.ts                   # Barrel exports
└── common/
    ├── ErrorDisplay.tsx           # Error component
    └── index.ts                   # Barrel exports
```

## Dependencies

```json
{
  "@mysten/dapp-kit": "^0.x.x",
  "react": "^18.x.x"
}
```

## Notes

- Mock data is currently used for experiences. Replace with actual API calls.
- Purchase transaction is mocked. Implement with actual Sui blockchain calls.
- CSS uses modern features (Grid, Flexbox, CSS Variables, Animations)
- All components are responsive and mobile-friendly
- Error states are handled gracefully with user-friendly messages

## License Types

| Type | Description | Price Multiplier |
|------|-------------|------------------|
| Personal | Personal use only. Cannot be shared or commercialized. | 1x |
| Commercial | Use in commercial projects and products. Team sharing allowed. | 1.5x |
| AI Training | License for AI model training and dataset creation. Unlimited use. | 2x |

## Support

For issues or questions, please refer to the main documentation in `docs/MarketplaceFlow.md`.
