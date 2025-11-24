/// Module: task_manage::seal_integration
/// SEAL Access Control Integration
/// Integrates SEAL encryption policies with experience data

module task_manage::seal_integration {
    use std::string::String;
    use sui::event;

    /// SEALPolicy struct - represents access control for encrypted data
    public struct SEALPolicy has key, store {
        id: UID,
        experience_id: ID,
        policy_type: u8,     // 0 = private, 1 = allowlist, 2 = subscription
        owner: address,
        walrus_blob_id: String,
        seal_policy_id: String,  // Reference to SEAL on-chain policy
        allowlist: vector<address>,  // For allowlist type
        subscription_product_id: ID,  // For subscription type
        created_at: u64,
    }

    /// Event: SEALPolicyCreated
    public struct SEALPolicyCreated has copy, drop {
        policy_id: ID,
        experience_id: ID,
        policy_type: u8,
    }

    /// Event: AllowlistUpdated
    public struct AllowlistUpdated has copy, drop {
        policy_id: ID,
        new_address: address,
        added: bool, // true if added, false if removed
    }

    /// Create a SEAL policy for experience data
    public fun create_seal_policy(
        experience_id: ID,
        policy_type: u8,
        walrus_blob_id: String,
        seal_policy_id: String,
        ctx: &mut TxContext,
    ): ID {
        let policy = SEALPolicy {
            id: object::new(ctx),
            experience_id,
            policy_type,
            owner: tx_context::sender(ctx),
            walrus_blob_id,
            seal_policy_id,
            allowlist: vector::empty(),
            subscription_product_id: object::id_from_address(@0x0),
            created_at: tx_context::epoch(ctx),
        };

        let policy_id = object::id(&policy);

        event::emit(SEALPolicyCreated {
            policy_id,
            experience_id,
            policy_type,
        });

        transfer::public_share_object(policy);
        policy_id
    }

    /// Add address to allowlist (PRIVATE type)
    public fun add_to_allowlist(
        policy: &mut SEALPolicy,
        address_to_add: address,
        ctx: &mut TxContext,
    ) {
        assert!(policy.owner == tx_context::sender(ctx), 1);
        assert!(policy.policy_type == 1, 2); // must be allowlist type

        if (!vector::contains(&policy.allowlist, &address_to_add)) {
            vector::push_back(&mut policy.allowlist, address_to_add);
            
            event::emit(AllowlistUpdated {
                policy_id: object::id(policy),
                new_address: address_to_add,
                added: true,
            });
        };
    }

    /// Remove address from allowlist
    public fun remove_from_allowlist(
        policy: &mut SEALPolicy,
        address_to_remove: address,
        ctx: &mut TxContext,
    ) {
        assert!(policy.owner == tx_context::sender(ctx), 1);
        assert!(policy.policy_type == 1, 2);

        let (found, index) = vector::index_of(&policy.allowlist, &address_to_remove);
        if (found) {
            vector::remove(&mut policy.allowlist, index);
            
            event::emit(AllowlistUpdated {
                policy_id: object::id(policy),
                new_address: address_to_remove,
                added: false,
            });
        };
    }

    /// Set subscription product (SUBSCRIPTION type)
    public fun set_subscription_product(
        policy: &mut SEALPolicy,
        subscription_product_id: ID,
        ctx: &mut TxContext,
    ) {
        assert!(policy.owner == tx_context::sender(ctx), 1);
        assert!(policy.policy_type == 2, 3); // must be subscription type
        
        policy.subscription_product_id = subscription_product_id;
    }

    /// Check access (query function for frontend/backend validation)
    public fun can_access(
        policy: &SEALPolicy,
        accessor: address,
    ): bool {
        // Private: only owner
        if (policy.policy_type == 0) {
            return accessor == policy.owner
        };

        // Allowlist: check if in list
        if (policy.policy_type == 1) {
            return vector::contains(&policy.allowlist, &accessor)
        };

        // Subscription: handled off-chain (backend checks on-chain subscription state)
        if (policy.policy_type == 2) {
            return true // backend will validate subscription
        };

        false
    }

    /// Getters
    public fun get_policy_type(policy: &SEALPolicy): u8 { policy.policy_type }
    public fun get_walrus_blob_id(policy: &SEALPolicy): String { policy.walrus_blob_id }
    public fun get_seal_policy_id(policy: &SEALPolicy): String { policy.seal_policy_id }
    public fun get_allowlist(policy: &SEALPolicy): &vector<address> { &policy.allowlist }
}
