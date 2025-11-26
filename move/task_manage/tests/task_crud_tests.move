module task_manage::task_crud_tests;

#[test_only]
use sui::test_scenario::{Self as ts, Scenario};
#[test_only]
use sui::clock::{Clock};
#[test_only]
use sui::display::{Display};
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
    init_for_testing as init_task_registry,
};
#[test_only]
use task_manage::version::{Version, init_for_testing as init_version};

// Test addresses
const CREATOR: address = @0xA;
const USER_B: address = @0xB;

// Default image URL for tests
const DEFAULT_IMAGE_URL: vector<u8> =
    b"https://static.vecteezy.com/system/resources/previews/025/638/355/large_2x/simple-task-icon-the-icon-can-be-used-for-websites-print-templates-presentation-templates-illustrations-etc-free-vector.jpg";

// Helper function to create a simple task
fun create_simple_task(scenario: &mut Scenario, creator: address): address {
    ts::next_tx(scenario, creator);
    {
        let version = ts::take_shared<Version>(scenario);
        let mut registry = ts::take_shared<TaskRegistry>(scenario);
        let clock = ts::take_shared<Clock>(scenario);
        let ctx = ts::ctx(scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"Test Task"),
            string::utf8(b"Test Description"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000), // due_date
            priority_medium(),
            string::utf8(b"Development"),
            vector[string::utf8(b"urgent"), string::utf8(b"backend")],
            &clock,
            &mut registry,
            ctx,
        );
        let task_id = task_manage::get_task_id(&task);
        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"My First Task"),
            string::utf8(b"This is a test task"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            priority_high(),
            string::utf8(b"Testing"),
            vector[string::utf8(b"test"), string::utf8(b"mvp")],
            &clock,
            &mut registry,
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"My First Task"), 0);
        assert!(task_manage::get_description(&task) == string::utf8(b"This is a test task"), 1);
        assert!(task_manage::get_image_url(&task) == string::utf8(DEFAULT_IMAGE_URL), 2);
        assert!(task_manage::get_creator(&task) == CREATOR, 3);
        assert!(task_manage::get_priority(&task) == priority_high(), 4);
        assert!(task_manage::get_status(&task) == status_todo(), 5);
        assert!(task_manage::get_category(&task) == string::utf8(b"Testing"), 6);
        assert!(vector::length(&task_manage::get_tags(&task)) == 2, 7);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_task_info(
            &version,
            &mut task,
            string::utf8(b"Updated Title"),
            string::utf8(b"Updated Description"),
            &clock,
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"Updated Title"), 0);
        assert!(task_manage::get_description(&task) == string::utf8(b"Updated Description"), 1);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_priority(&version, &mut task, priority_critical(), &clock, ctx);

        assert!(task_manage::get_priority(&task) == priority_critical(), 0);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(
            &version,
            &mut task,
            status_in_progress(),
            &clock,
            &mut registry,
            ctx,
        );
        assert!(task_manage::get_status(&task) == status_in_progress(), 0);

        task_manage::update_status(
            &version,
            &mut task,
            status_completed(),
            &clock,
            &mut registry,
            ctx,
        );
        assert!(task_manage::get_status(&task) == status_completed(), 1);

        ts::return_shared(version);
        ts::return_shared(registry);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_assignee_can_start_task() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Set USER_B as assignee (no editor role granted)
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::set_assignee(&version, &mut task, USER_B, &clock, ctx);

        ts::return_shared(version);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // Assignee moves task from TODO to IN_PROGRESS
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(
            &version,
            &mut task,
            status_in_progress(),
            &clock,
            &mut registry,
            ctx,
        );

        assert!(task_manage::get_status(&task) == status_in_progress(), 0);
        assert!(task_manage::get_task_count_by_status(&registry, status_todo()) == 0, 1);
        assert!(task_manage::get_task_count_by_status(&registry, status_in_progress()) == 1, 2);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        let initial_count = vector::length(&task_manage::get_tags(&task));

        task_manage::add_tag(&version, &mut task, string::utf8(b"new-tag"), &clock, ctx);
        assert!(vector::length(&task_manage::get_tags(&task)) == initial_count + 1, 0);

        task_manage::remove_tag(&version, &mut task, 0, &clock, ctx);
        assert!(vector::length(&task_manage::get_tags(&task)) == initial_count, 1);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::archive_task(&version, &mut task, &clock, &mut registry, ctx);

        assert!(task_manage::get_status(&task) == status_archived(), 0);

        ts::return_shared(registry);
        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(&version, task, &mut registry, ctx);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
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
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::delete_task(&version, task, &mut registry, ctx); // Should fail

        ts::return_shared(version);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}

// ==================== Comments Tests ====================

#[test]
fun test_add_comment() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(
            &version,
            &mut task,
            string::utf8(b"This is my first comment"),
            &clock,
            ctx,
        );

        let comments = task_manage::get_comments(&task);
        assert!(vector::length(&comments) == 1, 0);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(
            &version,
            &mut task,
            string::utf8(b"Original comment"),
            &clock,
            ctx,
        );

        ts::return_shared(version);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::edit_comment(
            &version,
            &mut task,
            0,
            string::utf8(b"Edited comment"),
            &clock,
            ctx,
        );

        let comments = task_manage::get_comments(&task);
        assert!(vector::length(&comments) == 1, 0);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(
            &version,
            &mut task,
            string::utf8(b"Comment to delete"),
            &clock,
            ctx,
        );
        assert!(vector::length(&task_manage::get_comments(&task)) == 1, 0);

        task_manage::delete_comment(&version, &mut task, 0, ctx);
        assert!(vector::length(&task_manage::get_comments(&task)) == 0, 1);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Share task with USER_B as editor
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&version, &mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(version);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    // USER_B adds a comment
    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(
            &version,
            &mut task,
            string::utf8(b"Comment by USER_B"),
            &clock,
            ctx,
        );

        ts::return_shared(version);
        ts::return_shared(clock);
        ts::return_to_address(CREATOR, task);
    };

    // CREATOR (owner) deletes USER_B's comment
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        assert!(vector::length(&task_manage::get_comments(&task)) == 1, 0);

        task_manage::delete_comment(&version, &mut task, 0, ctx);

        assert!(vector::length(&task_manage::get_comments(&task)) == 0, 1);

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&version, &mut task, USER_B, role_viewer(), &clock, ctx);

        ts::return_shared(version);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::next_tx(&mut scenario, USER_B);
    {
        let mut task = ts::take_from_address<Task>(&scenario, CREATOR);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_comment(&version, &mut task, string::utf8(b"Should fail"), &clock, ctx); // Should fail

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"Task"),
            string::utf8(b"Description"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            99, // Invalid priority
            string::utf8(b"Category"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::update_status(&version, &mut task, 99, &clock, &mut registry, ctx); // Invalid status

        ts::return_shared(registry);
        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        task_manage::add_user_with_role(&version, &mut task, USER_B, 99, &clock, ctx); // Invalid role

        ts::return_shared(version);
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

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"Task"),
            string::utf8(b"Description"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(100), // due_date in the past
            priority_medium(),
            string::utf8(b"Category"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        // Task is overdue if current_time > due_date and not completed
        assert!(task_manage::is_overdue(&task, 200), 0);
        assert!(!task_manage::is_overdue(&task, 50), 1);

        ts::return_shared(version);
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

// ==================== Option<T> Tests ====================

#[test]
fun test_task_with_no_due_date() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Create task without due date
        let task = task_manage::create_task(
            &version,
            string::utf8(b"No Deadline Task"),
            string::utf8(b"This task has no deadline"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::none(), // No due date
            priority_medium(),
            string::utf8(b"Flexible"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        // Verify due_date is None
        let due_date = task_manage::get_due_date(&task);
        assert!(option::is_none(&due_date), 0);

        // Verify task is not overdue (because no due date)
        assert!(!task_manage::is_overdue(&task, 999999999), 1);

        ts::return_shared(version);
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}

#[test]
fun test_task_content_blob_id_none_initially() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let task = ts::take_from_sender<Task>(&scenario);

        // Verify content_blob_id is None initially
        let content_blob_id = task_manage::get_content_blob_id(&task);
        assert!(option::is_none(&content_blob_id), 0);

        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

#[test]
fun test_update_due_date_to_none() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut task = ts::take_from_sender<Task>(&scenario);
        let version = ts::take_shared<Version>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Verify initially has due date
        let due_date = task_manage::get_due_date(&task);
        assert!(option::is_some(&due_date), 0);

        // Update to None (remove due date)
        task_manage::update_due_date(&version, &mut task, option::none(), &clock, ctx);

        // Verify due_date is now None
        let due_date_after = task_manage::get_due_date(&task);
        assert!(option::is_none(&due_date_after), 1);

        // Verify task is not overdue anymore
        assert!(!task_manage::is_overdue(&task, 999999999), 2);

        ts::return_shared(version);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

// ==================== Registry Tests ====================

#[test]
fun test_registry_status_indexing() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    // Create 4 tasks, all start as TODO
    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Create task 1
        let task1 = task_manage::create_task(
            &version,
            string::utf8(b"Task 1"),
            string::utf8(b"Desc 1"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            priority_medium(),
            string::utf8(b"Cat1"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task1_id = object::id(&task1);

        // Create task 2
        let mut task2 = task_manage::create_task(
            &version,
            string::utf8(b"Task 2"),
            string::utf8(b"Desc 2"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            priority_medium(),
            string::utf8(b"Cat2"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task2_id = object::id(&task2);

        // Create task 3
        let mut task3 = task_manage::create_task(
            &version,
            string::utf8(b"Task 3"),
            string::utf8(b"Desc 3"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            priority_medium(),
            string::utf8(b"Cat3"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );
        let task3_id = object::id(&task3);

        // Create task 4
        let mut task4 = task_manage::create_task(
            &version,
            string::utf8(b"Task 4"),
            string::utf8(b"Desc 4"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::some(1000000),
            priority_medium(),
            string::utf8(b"Cat4"),
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
        task_manage::update_status(
            &version,
            &mut task2,
            status_in_progress(),
            &clock,
            &mut registry,
            ctx,
        );
        task_manage::update_status(
            &version,
            &mut task3,
            status_completed(),
            &clock,
            &mut registry,
            ctx,
        );
        task_manage::archive_task(&version, &mut task4, &clock, &mut registry, ctx);

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
        ts::return_shared(version);
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task1, CREATOR);
        sui::transfer::public_transfer(task2, CREATOR);
        sui::transfer::public_transfer(task3, CREATOR);
        sui::transfer::public_transfer(task4, CREATOR);
    };

    ts::end(scenario);
}

// ==================== Version Control Tests ====================

#[test]
fun test_version_check_valid() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    // Create task with valid version - should succeed
    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"Test Task"),
            string::utf8(b"Description"),
            string::utf8(DEFAULT_IMAGE_URL),
            option::none(),
            priority_medium(),
            string::utf8(b"Testing"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        assert!(task_manage::get_title(&task) == string::utf8(b"Test Task"), 0);

        ts::return_shared(version);
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}

#[test]
fun test_version_check_on_all_operations() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let _task_id = create_simple_task(&mut scenario, CREATOR);

    // Test various operations with valid version - all should succeed
    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut task = ts::take_from_sender<Task>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        // Update task info
        task_manage::update_task_info(
            &version,
            &mut task,
            string::utf8(b"Updated"),
            string::utf8(b"Updated desc"),
            &clock,
            ctx,
        );

        // Add comment
        task_manage::add_comment(&version, &mut task, string::utf8(b"Test comment"), &clock, ctx);

        // Add user with role
        task_manage::add_user_with_role(&version, &mut task, USER_B, role_editor(), &clock, ctx);

        ts::return_shared(version);
        ts::return_shared(clock);
        ts::return_to_sender(&scenario, task);
    };

    ts::end(scenario);
}

// ==================== Display Tests ====================

#[test]
fun test_display_object_created() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    // Check that Display object is transferred to deployer
    ts::next_tx(&mut scenario, CREATOR);
    {
        let display = ts::take_from_sender<Display<Task>>(&scenario);

        // Verify display was created (we can take it means it exists)
        let fields = display.fields();

        // Verify the display has the correct fields
        assert!(fields.get(&string::utf8(b"name")) == &string::utf8(b"{title}"), 0);
        assert!(fields.get(&string::utf8(b"image_url")) == &string::utf8(b"{image_url}"), 1);
        assert!(fields.get(&string::utf8(b"description")) == &string::utf8(b"{description}"), 2);
        assert!(display.version() == 1, 3);

        ts::return_to_sender(&scenario, display);
    };

    ts::end(scenario);
}

#[test]
fun test_task_has_image_url() {
    let mut scenario = ts::begin(CREATOR);

    // Create system objects including Clock
    ts::create_system_objects(&mut scenario);

    // Initialize version and registry
    ts::next_tx(&mut scenario, CREATOR);
    {
        let ctx = ts::ctx(&mut scenario);
        init_version(ctx);
        init_task_registry(ctx);
    };

    let custom_image = b"https://example.com/custom-image.jpg";

    ts::next_tx(&mut scenario, CREATOR);
    {
        let version = ts::take_shared<Version>(&scenario);
        let mut registry = ts::take_shared<TaskRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let task = task_manage::create_task(
            &version,
            string::utf8(b"Task with Custom Image"),
            string::utf8(b"This task has a custom image"),
            string::utf8(custom_image),
            option::none(),
            priority_high(),
            string::utf8(b"Visual"),
            vector::empty(),
            &clock,
            &mut registry,
            ctx,
        );

        // Verify image_url is stored correctly
        assert!(task_manage::get_image_url(&task) == string::utf8(custom_image), 0);

        ts::return_shared(version);
        ts::return_shared(registry);
        ts::return_shared(clock);
        sui::transfer::public_transfer(task, CREATOR);
    };

    ts::end(scenario);
}
