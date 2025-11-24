/// Module: task_manage::experience
/// Experience Data Asset Generation & NFT Minting
/// Generates Experience Data from completed tasks and mints NFTs

module task_manage::experience {
    use std::string::String;
    use sui::event;

    /// Experience Data struct - represents a tradeable experience asset
    public struct ExperienceNFT has key, store {
        id: UID,
        task_id: ID,
        executor: address,
        skill: String,
        domain: String,
        difficulty: u8,      // 1-5 scale
        time_spent: u64,     // in seconds
        quality_score: u8,   // 0-100
        rating_count: u64,
        total_rating: u64,   // sum of ratings for average calculation
        walrus_blob_id: String,  // Reference to encrypted detailed data
        seal_policy_id: String,  // Reference to SEAL access policy
        created_at: u64,
        price: u64,          // in Mist
        available_copies: u64,
        sold_count: u64,
    }

    /// Event: ExperienceDataGenerated
    public struct ExperienceDataGenerated has copy, drop {
        experience_id: ID,
        task_id: ID,
        executor: address,
        domain: String,
        quality_score: u8,
    }

    /// Event: ExperienceMinted
    public struct ExperienceMinted has copy, drop {
        experience_id: ID,
        executor: address,
        price: u64,
    }

    /// Generate experience data from a completed task
    public fun generate_experience(
        task_id: ID,
        executor: address,
        skill: String,
        domain: String,
        difficulty: u8,
        time_spent: u64,
        quality_score: u8,
        walrus_blob_id: String,
        seal_policy_id: String,
        price: u64,
        available_copies: u64,
        ctx: &mut TxContext,
    ): ID {
        let experience = ExperienceNFT {
            id: object::new(ctx),
            task_id,
            executor,
            skill,
            domain,
            difficulty,
            time_spent,
            quality_score,
            rating_count: 0,
            total_rating: 0,
            walrus_blob_id,
            seal_policy_id,
            created_at: tx_context::epoch(ctx),
            price,
            available_copies,
            sold_count: 0,
        };

        let experience_id = object::id(&experience);

        event::emit(ExperienceDataGenerated {
            experience_id,
            task_id,
            executor,
            domain,
            quality_score,
        });

        event::emit(ExperienceMinted {
            experience_id,
            executor,
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

    /// Update price (by executor/owner)
    public fun update_price(
        experience: &mut ExperienceNFT,
        new_price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(experience.executor == tx_context::sender(ctx), 2);
        experience.price = new_price;
    }

    /// Increment sold count (called by marketplace after purchase)
    public fun increment_sold_count(
        experience: &mut ExperienceNFT,
    ) {
        experience.sold_count = experience.sold_count + 1;
    }

    /// Getters
    public fun get_executor(exp: &ExperienceNFT): address { exp.executor }
    public fun get_domain(exp: &ExperienceNFT): String { exp.domain }
    public fun get_quality_score(exp: &ExperienceNFT): u8 { exp.quality_score }
    public fun get_price(exp: &ExperienceNFT): u64 { exp.price }
    public fun get_avg_rating(exp: &ExperienceNFT): u8 {
        if (exp.rating_count == 0) {
            return 0
        };
        ((exp.total_rating * 100) / exp.rating_count / 5) as u8
    }
    public fun get_walrus_blob_id(exp: &ExperienceNFT): String { exp.walrus_blob_id }
    public fun get_seal_policy_id(exp: &ExperienceNFT): String { exp.seal_policy_id }
}
