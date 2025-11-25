/// Module: task_manage::experience
/// Experience Data Asset Generation & NFT Minting
/// Generates Experience Data from approved tasks and mints NFTs with Walrus/SEAL references

module task_manage::experience {
    use std::string::String;
    use sui::event;

    const EInvalidLicense: u64 = 0;
    const EInvalidCopyLimit: u64 = 1;
    const ENoCopies: u64 = 2;

    const LICENSE_PERSONAL: u8 = 0;
    const LICENSE_COMMERCIAL: u8 = 1;
    const LICENSE_EXCLUSIVE: u8 = 2;
    const LICENSE_SUBSCRIPTION: u8 = 3;
    const LICENSE_VIEW_ONLY: u8 = 4;

    /// Experience Data struct - represents a tradeable experience asset
    public struct ExperienceNFT has key, store {
        id: UID,
        task_id: ID,
        creator: address,
        skill: String,
        domain: String,
        difficulty: u8,      // 1-5 scale
        time_spent: u64,     // in seconds
        quality_score: u8,   // 0-100
        rating_count: u64,
        total_rating: u64,   // sum of ratings for average calculation
        walrus_content_blob_id: Option<String>,  // Encrypted content blob
        walrus_result_blob_id: Option<String>,   // Encrypted result blob
        seal_policy_id: String,  // Reference to SEAL access policy
        license_type: u8,    // see LICENSE_* constants
        copy_limit: u64,
        royalty_bps: u64,
        created_at: u64,
        price: u64,          // in Mist
        available_copies: u64,
        sold_count: u64,
    }

    /// Event: ExperienceDataGenerated
    public struct ExperienceDataGenerated has copy, drop {
        experience_id: ID,
        task_id: ID,
        creator: address,
        domain: String,
        quality_score: u8,
        walrus_content_blob_id: Option<String>,
        walrus_result_blob_id: Option<String>,
    }

    /// Event: ExperienceMinted
    public struct ExperienceMinted has copy, drop {
        experience_id: ID,
        task_id: ID,
        creator: address,
        walrus_content_blob_id: Option<String>,
        walrus_result_blob_id: Option<String>,
        seal_policy_id: String,
        license_type: u8,
        copy_limit: u64,
        price: u64,
    }

    /// Generate experience data from an approved task
    public fun generate_experience(
        task_id: ID,
        creator: address,
        skill: String,
        domain: String,
        difficulty: u8,
        time_spent: u64,
        quality_score: u8,
        walrus_content_blob_id: Option<String>,
        walrus_result_blob_id: Option<String>,
        seal_policy_id: String,
        license_type: u8,
        copy_limit: u64,
        royalty_bps: u64,
        price: u64,
        ctx: &mut TxContext,
    ): ID {
        assert!(license_type <= LICENSE_VIEW_ONLY, EInvalidLicense);
        assert!(copy_limit > 0, EInvalidCopyLimit);

        let enforced_copy_limit = if (license_type == LICENSE_EXCLUSIVE) {
            1
        } else {
            copy_limit
        };

        let experience = ExperienceNFT {
            id: object::new(ctx),
            task_id,
            creator,
            skill,
            domain,
            difficulty,
            time_spent,
            quality_score,
            rating_count: 0,
            total_rating: 0,
            walrus_content_blob_id,
            walrus_result_blob_id,
            seal_policy_id: seal_policy_id,
            license_type,
            copy_limit: enforced_copy_limit,
            royalty_bps,
            created_at: tx_context::epoch(ctx),
            price,
            available_copies: enforced_copy_limit,
            sold_count: 0,
        };

        let experience_id = object::id(&experience);

        event::emit(ExperienceDataGenerated {
            experience_id,
            task_id,
            creator,
            domain,
            quality_score,
            walrus_content_blob_id,
            walrus_result_blob_id,
        });

        event::emit(ExperienceMinted {
            experience_id,
            task_id,
            creator,
            walrus_content_blob_id,
            walrus_result_blob_id,
            seal_policy_id,
            license_type,
            copy_limit: enforced_copy_limit,
            price,
        });

        transfer::public_share_object(experience);
        experience_id
    }

    /// Add a rating to the experience (for quality feedback)
    public fun rate_experience(
        experience: &mut ExperienceNFT,
        rating: u8,
    ) {
        assert!(rating >= 1 && rating <= 5, 1); // rating must be 1-5
        
        experience.rating_count = experience.rating_count + 1;
        experience.total_rating = experience.total_rating + (rating as u64);

        // Optionally update quality score based on average rating
        let avg_rating = experience.total_rating / experience.rating_count;
        experience.quality_score = ((avg_rating * 100) / 5) as u8;
    }

    /// Update price (by creator/owner)
    public fun update_price(
        experience: &mut ExperienceNFT,
        new_price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(experience.creator == tx_context::sender(ctx), 2);
        experience.price = new_price;
    }

    /// Increment sold count (called by marketplace after purchase)
    public fun increment_sold_count(
        experience: &mut ExperienceNFT,
    ) {
        assert!(experience.available_copies > 0, ENoCopies);
        experience.available_copies = experience.available_copies - 1;
        experience.sold_count = experience.sold_count + 1;
    }

    /// Getters
    public fun get_creator(exp: &ExperienceNFT): address { exp.creator }
    public fun get_domain(exp: &ExperienceNFT): String { exp.domain }
    public fun get_quality_score(exp: &ExperienceNFT): u8 { exp.quality_score }
    public fun get_price(exp: &ExperienceNFT): u64 { exp.price }
    public fun get_avg_rating(exp: &ExperienceNFT): u8 {
        if (exp.rating_count == 0) {
            return 0
        };
        ((exp.total_rating * 100) / exp.rating_count / 5) as u8
    }
    public fun get_content_blob_id(exp: &ExperienceNFT): Option<String> { exp.walrus_content_blob_id }
    public fun get_result_blob_id(exp: &ExperienceNFT): Option<String> { exp.walrus_result_blob_id }
    public fun get_seal_policy_id(exp: &ExperienceNFT): String { exp.seal_policy_id }
    public fun get_license_type(exp: &ExperienceNFT): u8 { exp.license_type }
    public fun get_copy_limit(exp: &ExperienceNFT): u64 { exp.copy_limit }
    public fun get_royalty_bps(exp: &ExperienceNFT): u64 { exp.royalty_bps }
    public fun license_personal(): u8 { LICENSE_PERSONAL }
    public fun license_commercial(): u8 { LICENSE_COMMERCIAL }
    public fun license_exclusive(): u8 { LICENSE_EXCLUSIVE }
    public fun license_subscription(): u8 { LICENSE_SUBSCRIPTION }
    public fun license_view_only(): u8 { LICENSE_VIEW_ONLY }
}
