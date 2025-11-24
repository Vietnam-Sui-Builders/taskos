/// Module: task_manage::reward
/// Reward Distribution (Escrow)
/// Handles reward escrow and distribution

module task_manage::reward {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;

    /// Escrow struct - holds reward until task is approved
    public struct Escrow has key, store {
        id: UID,
        task_id: ID,
        creator: address,
        assignee: address,
        reward: Balance<SUI>,
        created_at: u64,
    }

    /// Event: RewardEscrowed
    public struct RewardEscrowed has copy, drop {
        escrow_id: ID,
        task_id: ID,
        amount: u64,
    }

    /// Event: RewardReleased
    public struct RewardReleased has copy, drop {
        escrow_id: ID,
        task_id: ID,
        assignee: address,
        amount: u64,
    }

    /// Create an escrow for task reward
    public fun create_escrow(
        task_id: ID,
        creator: address,
        assignee: address,
        reward: Coin<SUI>,
        ctx: &mut TxContext,
    ): ID {
        let amount = reward.balance().value();
        
        let escrow = Escrow {
            id: object::new(ctx),
            task_id,
            creator,
            assignee,
            reward: reward.into_balance(),
            created_at: tx_context::epoch(ctx),
        };

        let escrow_id = object::id(&escrow);

        event::emit(RewardEscrowed {
            escrow_id,
            task_id,
            amount,
        });

        transfer::public_share_object(escrow);
        escrow_id
    }

    /// Release reward to assignee (by creator after task approval)
    public fun release_reward(
        escrow: Escrow,
        ctx: &mut TxContext,
    ) {
        assert!(escrow.creator == tx_context::sender(ctx), 1); // only creator can release

        // Capture object id before moving out fields
        let escrow_id = object::id(&escrow);

        // Destructure to move out the reward and other fields
        let Escrow { id, task_id, creator: _, assignee, reward, created_at: _ } = escrow;

        let amount = balance::value(&reward);
        let reward_coin = coin::from_balance(reward, ctx);

        event::emit(RewardReleased {
            escrow_id,
            task_id,
            assignee,
            amount,
        });

        transfer::public_transfer(reward_coin, assignee);

        // Delete the consumed escrow object
        object::delete(id);
        
        // Escrow is consumed (dropped)
    }

    /// Cancel escrow and return to creator (if task rejected)
    public fun cancel_escrow(
        escrow: Escrow,
        ctx: &mut TxContext,
    ) {
        assert!(escrow.creator == tx_context::sender(ctx), 1);

        // Destructure to move out reward and creator
        let Escrow { id, task_id: _, creator, assignee: _, reward, created_at: _ } = escrow;

        let reward_coin = coin::from_balance(reward, ctx);
        transfer::public_transfer(reward_coin, creator);

        // Delete the consumed escrow object
        object::delete(id);
    }
}
