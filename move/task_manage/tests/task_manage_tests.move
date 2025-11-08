/* Table of Contents

- Test addresses and constants
- Helper function: create_simple_task
- Task CRUD Tests
  - test_create_task_success
  - test_update_task_info
  - test_update_priority
  - test_update_status
  - test_add_and_remove_tag
  - test_archive_task
  - test_delete_task
  - test_delete_task_not_owner
- Access Control Tests
  - test_share_task_with_role
  - test_update_user_role
  - test_remove_user_access
  - test_creator_has_owner_role
  - test_non_owner_cannot_share
  - test_cannot_share_with_self
- Walrus/Seal Integration Tests
  - test_add_content
  - test_add_files
  - test_verify_access_creator
  - test_verify_access_shared_user
  - test_namespace_generation
- Comments Tests
  - test_add_comment
  - test_edit_comment
  - test_delete_comment_by_author
  - test_delete_comment_by_owner
  - test_viewer_cannot_add_comment
- Validation Tests
  - test_invalid_priority
  - test_invalid_status
  - test_invalid_role
- Utility Function Tests
  - test_is_overdue
  - test_constants
- SUI Reward System Tests
  - test_deposit_reward_success
  - test_deposit_reward_multiple_owners
  - test_non_owner_cannot_deposit
  - test_deposit_zero_amount_fails
  - test_deposit_after_completed_fails
  - test_set_assignee_success
  - test_non_owner_cannot_set_assignee
  - test_approve_completion_success
  - test_approve_completion_twice_fails
  - test_approve_without_completed_fails
  - test_approve_without_assignee_fails
  - test_approve_without_reward_fails
  - test_cancel_task_refunds
  - test_archive_task_refunds
  - test_delete_task_refunds
  - test_non_owner_cannot_cancel
- Registry Tests
  - test_registry_status_indexing
*/

module task_manage::task_manage_tests;

#[test_only]
use sui::test_scenario::{Self as ts, Scenario};
#[test_only]
use sui::clock::{Clock};
#[test_only]
use sui::coin::{Self, Coin};
#[test_only]
use sui::sui::SUI;
#[test_only]
use std::string::{Self};
#[test_only]
use task_manage::task_manage::{
    Self,
    Task,
    TaskRegistry,
    priority_low,
    priority_medium,
    priority_high,
    priority_critical,
    status_todo,
    status_in_progress,
    status_completed,
    status_archived,
    role_viewer,
    role_editor,
    role_owner,
    init_registry,
};

// Test addresses
const CREATOR: address = @0xA;
const USER_B: address = @0xB;
const USER_C: address = @0xC;

// Helper function to create a simple task
fun create_simple_task(scenario: &mut Scenario, creator: address): address {
    ts::next_tx(scenario, creator);
    {
        let mut registry = ts::take_shared<TaskRegistry>(scenario);
        let clock = ts::take_shared<Clock>(scenario);
        let ctx = ts::ctx(scenario);
        let task = task_manage::create_task(
            b"Test Task",
            b"Test Description",
            1000000, // due_date
            priority_medium(),
            b"Development",
            vector[b"urgent", b"backend"],
            &clock,
            &mut registry,
            ctx,
        );
        let task_id = task_manage::get_task_id(&task);
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, creator);
        task_id
    }
}

// ==================== Task CRUD Tests ====================

#[test]
fun test_create_task_success() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            b"My First Task",
            b"This is a test task",
            1000000,
            priority_high(),
            b"Testing",
            vector[b"test", b"mvp"],
            &clock,
            &mut registry,
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"My First Task"), 0);
        assert!(task_manage::get_description(&task) == string::utf8(b"This is a test task"), 1);
        assert!(task_manage::get_creator(&task) == CREATOR, 2);
        assert!(task_manage::get_priority(&task) == priority_high(), 3);
        assert!(task_manage::get_status(&task) == status_todo(), 4);
        assert!(task_manage::get_category(&task) == string::utf8(b"Testing"), 5);
        assert!(vector::length(&task_manage::get_tags(&task)) == 2, 6);

        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}

#[test]
fun test_update_task_info() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_task_info(
            &mut task,
            b"Updated Title",
            b"Updated Description",
            &clock,
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"Updated Title"), 0);
        assert!(task_manage::get_description(&task) == string::utf8(b"Updated Description"), 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_update_priority() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_priority(&mut task, priority_critical(), &clock, ctx);

        assert!(task_manage::get_priority(&task) == priority_critical(), 0);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_update_status() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, status_in_progress(), &clock, &mut registry, ctx);
        assert!(task_manage::get_status(&task) == status_in_progress(), 0);

        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);
        assert!(task_manage::get_status(&task) == status_completed(), 1);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_add_and_remove_tag() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let initial_count = vector::length(&task_manage::get_tags(&task));

        task_manage::add_tag(&mut task, b"new-tag", &clock, ctx);
        assert!(vector::length(&task_manage::get_tags(&task)) == initial_count + 1, 0);

        task_manage::remove_tag(&mut task, 0, &clock, ctx);
        assert!(vector::length(&task_manage::get_tags(&task)) == initial_count, 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_archive_task() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::archive_task(&mut task, &clock, &mut registry, ctx);

        assert!(task_manage::get_status(&task) == status_archived(), 0);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_delete_task() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(task, &mut registry, ctx);

        ts::return_shared(registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ENotOwner)]
fun test_delete_task_not_owner() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Transfer task to creator
    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // Try to delete as different user
    ts::next_tx(&mut scenario, USER_B);
    {
        let task = ts::take_from_address<Task>(&scenario, CREATOR);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(task, &mut registry, ctx); // Should fail

        ts::return_shared(registry);
    };

    ts::end(scenario);
}

// ==================== Access Control Tests ====================

#[test]
fun test_share_task_with_role() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        assert!(task_manage::get_user_role(&task, USER_B) == role_editor(), 0);
        assert!(task_manage::has_access(&task, USER_B), 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_update_user_role() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Add user as viewer
        task_manage::add_user_with_role(&mut task, USER_B, role_viewer(), &clock, ctx);
        assert!(task_manage::get_user_role(&task, USER_B) == role_viewer(), 0);

        // Upgrade to editor
        task_manage::update_user_role(&mut task, USER_B, role_editor(), &clock, ctx);
        assert!(task_manage::get_user_role(&task, USER_B) == role_editor(), 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_remove_user_access() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);
        assert!(task_manage::has_access(&task, USER_B), 0);

        task_manage::remove_user(&mut task, USER_B, &clock, ctx);
        assert!(!task_manage::has_access(&task, USER_B), 1);
        assert!(task_manage::get_user_role(&task, USER_B) == 0, 2);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_creator_has_owner_role() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);

        assert!(task_manage::get_user_role(&task, CREATOR) == role_owner(), 0);
        assert!(task_manage::has_access(&task, CREATOR), 1);

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInsufficientPermission)]
fun test_non_owner_cannot_share() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Share with USER_B as editor
        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // USER_B tries to share with USER_C (should fail)
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_C, role_viewer(), &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ECannotShareWithSelf)]
fun test_cannot_share_with_self() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, CREATOR, role_editor(), &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

// ==================== Walrus/Seal Integration Tests ====================

#[test]
fun test_add_content() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_content(&mut task, b"blob_id_12345", &clock, ctx);

        assert!(task_manage::get_content_blob_id(&task) == string::utf8(b"blob_id_12345"), 0);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_add_files() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let file_ids = vector[b"file_1", b"file_2", b"file_3"];
        task_manage::add_files(&mut task, file_ids, &clock, ctx);

        let files = task_manage::get_file_blob_ids(&task);
        assert!(vector::length(&files) == 3, 0);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_verify_access_creator() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        assert!(task_manage::verify_access(&task, ctx), 0);

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_verify_access_shared_user() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_viewer(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::next_tx(&mut scenario, USER_B);
    {
        let task = ts::take_from_address<Task>(&scenario, CREATOR);
        let ctx = ts::ctx(&mut scenario);

        assert!(task_manage::verify_access(&task, ctx), 0);

        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
fun test_namespace_generation() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);

        let namespace = task_manage::namespace(&task);
        assert!(vector::length(&namespace) == 32, 0); // Address is 32 bytes

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

// ==================== Comments Tests ====================

#[test]
fun test_add_comment() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&mut task, b"This is my first comment", &clock, ctx);

        let comments = task_manage::get_comments(&task);
        assert!(vector::length(&comments) == 1, 0);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_edit_comment() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&mut task, b"Original comment", &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::edit_comment(&mut task, 0, b"Edited comment", &clock, ctx);

        let comments = task_manage::get_comments(&task);
        assert!(vector::length(&comments) == 1, 0);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_delete_comment_by_author() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&mut task, b"Comment to delete", &clock, ctx);
        assert!(vector::length(&task_manage::get_comments(&task)) == 1, 0);

        task_manage::delete_comment(&mut task, 0, ctx);
        assert!(vector::length(&task_manage::get_comments(&task)) == 0, 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_delete_comment_by_owner() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Share task with USER_B as editor
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B adds a comment
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&mut task, b"Comment by USER_B", &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    // CREATOR (owner) deletes USER_B's comment
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        assert!(vector::length(&task_manage::get_comments(&task)) == 1, 0);

        task_manage::delete_comment(&mut task, 0, ctx);

        assert!(vector::length(&task_manage::get_comments(&task)) == 0, 1);

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInsufficientPermission)]
fun test_viewer_cannot_add_comment() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_viewer(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&mut task, b"Should fail", &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

// ==================== Validation Tests ====================

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInvalidPriority)]
fun test_invalid_priority() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            b"Task",
            b"Description",
            1000000,
            99, // Invalid priority
            b"Category",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInvalidStatus)]
fun test_invalid_status() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, 99, &clock, &mut registry, ctx); // Invalid status

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInvalidRole)]
fun test_invalid_role() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, 99, &clock, ctx); // Invalid role

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

// ==================== Utility Function Tests ====================

#[test]
fun test_is_overdue() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            b"Task",
            b"Description",
            100, // due_date in the past
            priority_medium(),
            b"Category",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        // Task is overdue if current_time > due_date and not completed
        assert!(task_manage::is_overdue(&task, 200), 0);
        assert!(!task_manage::is_overdue(&task, 50), 1);

        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}

#[test]
fun test_constants() {
    assert!(priority_low() == 1, 0);
    assert!(priority_medium() == 2, 1);
    assert!(priority_high() == 3, 2);
    assert!(priority_critical() == 4, 3);

    assert!(status_todo() == 0, 4);
    assert!(status_in_progress() == 1, 5);
    assert!(status_completed() == 2, 6);
    assert!(status_archived() == 3, 7);

    assert!(role_viewer() == 1, 8);
    assert!(role_editor() == 2, 9);
    assert!(role_owner() == 3, 10);
}

// ==================== SUI Reward System Tests ====================

#[test]
fun test_deposit_reward_success() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        assert!(task_manage::get_reward_balance(&task) == 1000, 0);
        assert!(task_manage::get_deposit_amount(&task, CREATOR) == 1000, 1);

        // Deposit more from same user
        let payment2 = coin::mint_for_testing<SUI>(500, ctx);
        task_manage::deposit_reward(&mut task, payment2, &clock, ctx);

        assert!(task_manage::get_reward_balance(&task) == 1500, 2);
        assert!(task_manage::get_deposit_amount(&task, CREATOR) == 1500, 3);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_deposit_reward_multiple_owners() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Make USER_B an owner
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_owner(), &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // CREATOR deposits
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        assert!(task_manage::get_reward_balance(&task) == 1000, 0);
        assert!(task_manage::get_deposit_amount(&task, CREATOR) == 1000, 1);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B deposits
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(500, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        assert!(task_manage::get_reward_balance(&task) == 1500, 2);
        assert!(task_manage::get_deposit_amount(&task, USER_B) == 500, 3);
        assert!(task_manage::get_deposit_amount(&task, CREATOR) == 1000, 4);

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInsufficientPermission)]
fun test_non_owner_cannot_deposit() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Share with USER_B as editor (not owner)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B tries to deposit (should fail)
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInvalidAmount)]
fun test_deposit_zero_amount_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(0, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ETaskAlreadyCompleted)]
fun test_deposit_after_completed_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_set_assignee_success() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&mut task, USER_B, &clock, ctx);

        assert!(task_manage::get_assignee(&task) == USER_B, 0);

        // Update assignee
        task_manage::set_assignee(&mut task, USER_C, &clock, ctx);
        assert!(task_manage::get_assignee(&task) == USER_C, 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInsufficientPermission)]
fun test_non_owner_cannot_set_assignee() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Share with USER_B as editor
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B tries to set assignee (should fail)
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&mut task, USER_C, &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
fun test_approve_completion_success() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Deposit reward
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Set assignee and complete task
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&mut task, USER_B, &clock, ctx);
        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Approve completion
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx);

        // Check dynamic fields cleaned up
        assert!(task_manage::get_reward_balance(&task) == 0, 0); // Since removed
        assert!(task_manage::get_deposit_amount(&task, CREATOR) == 0, 1); // Since removed

        ts::return_to_sender(&scenario, task);
    };

    // Check reward transferred to assignee (USER_B)
    ts::next_tx(&mut scenario, USER_B);
    {
        let reward_coin = ts::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&reward_coin) == 1000, 2);

        ts::return_to_sender(&scenario, reward_coin);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EAlreadyApproved)]
fun test_approve_completion_twice_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Deposit, set assignee, complete
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);
        task_manage::set_assignee(&mut task, USER_B, &clock, ctx);
        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // First approve
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx);

        ts::return_to_sender(&scenario, task);
    };

    // Second approve (should fail)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx); // Should fail

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ETaskNotCompleted)]
fun test_approve_without_completed_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Set assignee but not completed
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&mut task, USER_B, &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Try approve (should fail)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx); // Should fail

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ENoAssignee)]
fun test_approve_without_assignee_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Complete but no assignee
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Try approve (should fail)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx); // Should fail

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ENoRewardBalance)]
fun test_approve_without_reward_fails() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Set assignee and complete, no deposit
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&mut task, USER_B, &clock, ctx);
        task_manage::update_status(&mut task, status_completed(), &clock, &mut registry, ctx);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Try approve (should fail)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::approve_completion(&mut task, ctx); // Should fail

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_cancel_task_refunds() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Make USER_B an owner and both deposit
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_owner(), &clock, ctx);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(500, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    // Cancel task (by CREATOR)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::cancel_task(&mut task, &clock, ctx);

        assert!(task_manage::get_status(&task) == status_todo(), 0);
        assert!(task_manage::get_reward_balance(&task) == 0, 1);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Check refunds
    ts::next_tx(&mut scenario, CREATOR);
    {
        let refund_coin = ts::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&refund_coin) == 1000, 2);
        ts::return_to_sender(&scenario, refund_coin);
    };

    ts::next_tx(&mut scenario, USER_B);
    {
        let refund_coin = ts::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&refund_coin) == 500, 3);
        ts::return_to_sender(&scenario, refund_coin);
    };

    ts::end(scenario);
}

#[test]
fun test_archive_task_refunds() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Deposit
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Archive task
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::archive_task(&mut task, &clock, &mut registry, ctx);

        assert!(task_manage::get_status(&task) == status_archived(), 0);
        assert!(task_manage::get_reward_balance(&task) == 0, 1);

        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Check refund to CREATOR
    ts::next_tx(&mut scenario, CREATOR);
    {
        let refund_coin = ts::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&refund_coin) == 1000, 2);
        ts::return_to_sender(&scenario, refund_coin);
    };

    ts::end(scenario);
}

#[test]
fun test_delete_task_refunds() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Deposit
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        task_manage::deposit_reward(&mut task, payment, &clock, ctx);

        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    // Delete task
    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(task, &mut registry, ctx);

        ts::return_shared(registry);
    };

    // Check refund to CREATOR
    ts::next_tx(&mut scenario, CREATOR);
    {
        let refund_coin = ts::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&refund_coin) == 1000, 0);
        ts::return_to_sender(&scenario, refund_coin);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::EInsufficientPermission)]
fun test_non_owner_cannot_cancel() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Share with USER_B as editor
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B tries to cancel (should fail)
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::cancel_task(&mut task, &clock, ctx); // Should fail

        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    ts::end(scenario);
}

#[test]
fun test_registry_status_indexing() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_registry(ctx);
    };

    // Create 4 tasks, all start as TODO
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Create task 1
        let task1 = task_manage::create_task(
            b"Task 1",
            b"Desc 1",
            1000000,
            priority_medium(),
            b"Cat1",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task1_id = object::id(&task1);

        // Create task 2
        let mut task2 = task_manage::create_task(
            b"Task 2",
            b"Desc 2",
            1000000,
            priority_medium(),
            b"Cat2",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task2_id = object::id(&task2);

        // Create task 3
        let mut task3 = task_manage::create_task(
            b"Task 3",
            b"Desc 3",
            1000000,
            priority_medium(),
            b"Cat3",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task3_id = object::id(&task3);

        // Create task 4
        let mut task4 = task_manage::create_task(
            b"Task 4",
            b"Desc 4",
            1000000,
            priority_medium(),
            b"Cat4",
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task4_id = object::id(&task4);

        // All should be in TODO
        let todo_ids = task_manage::get_tasks_by_status(&registry, status_todo());
        assert!(vector::length(&todo_ids) == 4, 0);
        assert!(vector::contains(&todo_ids, &task1_id), 1);
        assert!(vector::contains(&todo_ids, &task2_id), 2);
        assert!(vector::contains(&todo_ids, &task3_id), 3);
        assert!(vector::contains(&todo_ids, &task4_id), 4);
        assert!(task_manage::get_task_count_by_status(&registry, status_todo()) == 4, 5);

        // Update statuses
        task_manage::update_status(&mut task2, status_in_progress(), &clock, &mut registry, ctx);
        task_manage::update_status(&mut task3, status_completed(), &clock, &mut registry, ctx);
        task_manage::archive_task(&mut task4, &clock, &mut registry, ctx);

        // Check each status
        let todo_ids = task_manage::get_tasks_by_status(&registry, status_todo());
        assert!(vector::length(&todo_ids) == 1, 6);
        assert!(vector::contains(&todo_ids, &task1_id), 7);

        let in_progress_ids = task_manage::get_tasks_by_status(&registry, status_in_progress());
        assert!(vector::length(&in_progress_ids) == 1, 8);
        assert!(vector::contains(&in_progress_ids, &task2_id), 9);

        let completed_ids = task_manage::get_tasks_by_status(&registry, status_completed());
        assert!(vector::length(&completed_ids) == 1, 10);
        assert!(vector::contains(&completed_ids, &task3_id), 11);

        let archived_ids = task_manage::get_tasks_by_status(&registry, status_archived());
        assert!(vector::length(&archived_ids) == 1, 12);
        assert!(vector::contains(&archived_ids, &task4_id), 13);

        // Check counts
        assert!(task_manage::get_task_count_by_status(&registry, status_todo()) == 1, 14);
        assert!(task_manage::get_task_count_by_status(&registry, status_in_progress()) == 1, 15);
        assert!(task_manage::get_task_count_by_status(&registry, status_completed()) == 1, 16);
        assert!(task_manage::get_task_count_by_status(&registry, status_archived()) == 1, 17);

        // Clean up
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task1, CREATOR);
        sui::transfer::public_transfer(task2, CREATOR);
        sui::transfer::public_transfer(task3, CREATOR);
        sui::transfer::public_transfer(task4, CREATOR);
    };

    ts::end(scenario);
}
