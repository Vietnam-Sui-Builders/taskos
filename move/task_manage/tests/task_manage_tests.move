module task_manage::task_manage_tests;

#[test_only]
use sui::test_scenario::{Self as ts, Scenario};
#[test_only]
use sui::clock::{Clock};
#[test_only]
use std::string::{Self};
#[test_only]
use task_manage::task_manage::{
    Self,
    Task,
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
};

// Test addresses
const CREATOR: address = @0xA;
const USER_B: address = @0xB;
const USER_C: address = @0xC;

// Helper function to create a simple task
fun create_simple_task(scenario: &mut Scenario, creator: address): address {
    ts::next_tx(scenario, creator);
    {
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
            ctx,
        );
        let task_id = task_manage::get_task_id(&task);
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

    ts::next_tx(&mut scenario, CREATOR);
    {
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
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"My First Task"), 0);
        assert!(task_manage::get_description(&task) == string::utf8(b"This is a test task"), 1);
        assert!(task_manage::get_creator(&task) == CREATOR, 2);
        assert!(task_manage::get_priority(&task) == priority_high(), 3);
        assert!(task_manage::get_status(&task) == status_todo(), 4);
        assert!(task_manage::get_category(&task) == string::utf8(b"Testing"), 5);
        assert!(vector::length(&task_manage::get_tags(&task)) == 2, 6);

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

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, status_in_progress(), &clock, ctx);
        assert!(task_manage::get_status(&task) == status_in_progress(), 0);

        task_manage::update_status(&mut task, status_completed(), &clock, ctx);
        assert!(task_manage::get_status(&task) == status_completed(), 1);

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

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::archive_task(&mut task, &clock, ctx);

        assert!(task_manage::get_status(&task) == status_archived(), 0);

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

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(task, ctx);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::task_manage::ENotOwner)]
fun test_delete_task_not_owner() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

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
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(task, ctx); // Should fail
    };

    ts::end(scenario);
}

// ==================== Access Control Tests ====================

#[test]
fun test_share_task_with_role() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

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

    ts::next_tx(&mut scenario, CREATOR);
    {
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
            ctx,
        );

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

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&mut task, 99, &clock, ctx); // Invalid status

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

    ts::next_tx(&mut scenario, CREATOR);
    {
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
            ctx,
        );

        // Task is overdue if current_time > due_date and not completed
        assert!(task_manage::is_overdue(&task, 200), 0);
        assert!(!task_manage::is_overdue(&task, 50), 1);

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
