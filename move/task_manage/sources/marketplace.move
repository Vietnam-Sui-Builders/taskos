/// Module: task_manage::marketplace
/// Buy/Sell Experience Data
/// Marketplace for buying and selling experience data

module task_manage::marketplace {
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::event;

    /// Listing struct - represents an experience data for sale
    public struct Listing has key, store {
        id: UID,
        experience_id: ID,
        seller: address,
        price: u64,
        license_type: u8,    // 0 = personal, 1 = commercial, 2 = ai_training
        available_copies: u64,
        sold_copies: u64,
        created_at: u64,
    }

    /// Purchase struct - tracks ownership after purchase
    public struct Purchase has key, store {
        id: UID,
        experience_id: ID,
        buyer: address,
        seller: address,
        price_paid: u64,
        license_type: u8,
        purchase_timestamp: u64,
        // SEAL policy rights added by backend/oracle
        seal_access_granted: bool,
    }

    /// Event: ExperienceListed
    public struct ExperienceListed has copy, drop {
        listing_id: ID,
        experience_id: ID,
        seller: address,
        price: u64,
        license_type: u8,
    }

    /// Event: ExperiencePurchased
    public struct ExperiencePurchased has copy, drop {
        purchase_id: ID,
        experience_id: ID,
        buyer: address,
        seller: address,
        price: u64,
    }

    /// List an experience data for sale
    public fun list_experience(
        experience_id: ID,
        price: u64,
        license_type: u8,
        available_copies: u64,
        ctx: &mut TxContext,
    ): ID {
        let listing = Listing {
            id: object::new(ctx),
            experience_id,
            seller: tx_context::sender(ctx),
            price,
            license_type,
            available_copies,
            sold_copies: 0,
            created_at: tx_context::epoch(ctx),
        };

        let listing_id = object::id(&listing);

        event::emit(ExperienceListed {
            listing_id,
            experience_id,
            seller: tx_context::sender(ctx),
            price,
            license_type,
        });

        transfer::public_share_object(listing);
        listing_id
    }

    /// Purchase experience data
    public fun purchase_experience(
        listing: &mut Listing,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ): Purchase {
        assert!(payment.balance().value() >= listing.price, 1); // insufficient payment
        assert!(listing.sold_copies < listing.available_copies, 2); // sold out

        let buyer = tx_context::sender(ctx);
        let purchase = Purchase {
            id: object::new(ctx),
            experience_id: listing.experience_id,
            buyer,
            seller: listing.seller,
            price_paid: listing.price,
            license_type: listing.license_type,
            purchase_timestamp: tx_context::epoch(ctx),
            seal_access_granted: false, // will be set by backend
        };

        // Update listing
        listing.sold_copies = listing.sold_copies + 1;

        event::emit(ExperiencePurchased {
            purchase_id: object::id(&purchase),
            experience_id: listing.experience_id,
            buyer,
            seller: listing.seller,
            price: listing.price,
        });

        // Transfer payment to seller (simplified; real escrow would be more complex)
        transfer::public_transfer(payment, listing.seller);

        // Return purchase record to caller (buyer) for further handling
        purchase
    }

    /// Update listing status (by seller)
    public fun update_listing_price(
        listing: &mut Listing,
        new_price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(listing.seller == tx_context::sender(ctx), 3);
        listing.price = new_price;
    }

    /// Delist (by seller)
    public fun delist(
        listing: Listing,
        ctx: &mut TxContext,
    ) {
        assert!(listing.seller == tx_context::sender(ctx), 3);
        // Extract seller before moving `listing`, then transfer the listing to seller
        let seller = listing.seller;
        // Listing is transferred to seller (can be discarded or stored)
        transfer::public_transfer(listing, seller);
    }

    /// Getters
    public fun get_seller(listing: &Listing): address { listing.seller }
    public fun get_price(listing: &Listing): u64 { listing.price }
    public fun get_available(listing: &Listing): u64 { listing.available_copies }
    public fun get_sold(listing: &Listing): u64 { listing.sold_copies }
}
