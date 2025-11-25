/// Task Management System with Walrus Integration and Role-Based Access Control
/// This module provides a comprehensive task management system with:
/// - Full CRUD operations
/// - Role-based access control (Owner, Editor, Viewer)
/// - Comments support
/// - Categories and tags
/// - Walrus storage integration for encrypted content
/// - Seal integration for identity-based encryption
/// - TaskRegistry for on-chain querying by status
module task_manage::task_manage;

use std::string::{Self, String};
use sui::address;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::display;
use sui::dynamic_field as df;
use sui::event;
use sui::package;
use sui::sui::SUI;
use sui::table::{Self, Table};
use task_manage::version::{Self, Version};

// ==================== One-Time Witness ====================

/// One-Time Witness for claiming Publisher
public struct TASK_MANAGE has drop {}

// ==================== Error Codes ====================

const ENotOwner: u64 = 0;
const ENoAccess: u64 = 1;
const EInvalidPriority: u64 = 2;
const EInvalidStatus: u64 = 3;
// const ETaskNotFound: u64 = 4;
const ETitleTooLong: u64 = 5;
const EDescriptionTooLong: u64 = 6;
const EInvalidRole: u64 = 7;
const ECommentNotFound: u64 = 8;
const EInsufficientPermission: u64 = 9;
const ECannotRemoveOwner: u64 = 10;
const ECannotShareWithSelf: u64 = 11;
const ECategoryTooLong: u64 = 12;
const ETagTooLong: u64 = 13;
const ETooManyTags: u64 = 14;
const ENoRewardBalance: u64 = 15;
const ETaskAlreadyCompleted: u64 = 16;
const EInvalidAmount: u64 = 17;
const ENoAssignee: u64 = 18;
const ETaskNotCompleted: u64 = 19;
const EAlreadyApproved: u64 = 20;

// ==================== Constants ====================

// Priority levels
const PRIORITY_LOW: u8 = 1;
const PRIORITY_MEDIUM: u8 = 2;
const PRIORITY_HIGH: u8 = 3;
const PRIORITY_CRITICAL: u8 = 4;

// Status levels
const STATUS_TODO: u8 = 0;  // open
const STATUS_IN_PROGRESS: u8 = 1;  // assigned
const STATUS_COMPLETED: u8 = 2;  // completed
const STATUS_APPROVED: u8 = 3;  // approved
const STATUS_ARCHIVED: u8 = 4;  // archived (soft deleted)

// Role levels
const ROLE_VIEWER: u8 = 1;
const ROLE_EDITOR: u8 = 2;
const ROLE_OWNER: u8 = 3;

// Validation limits
const MAX_TITLE_LENGTH: u64 = 200;
const MAX_DESCRIPTION_LENGTH: u64 = 2000;
const MAX_CATEGORY_LENGTH: u64 = 50;
const MAX_TAG_LENGTH: u64 = 30;
const MAX_TAGS_COUNT: u64 = 10;
const MAX_COMMENT_LENGTH: u64 = 1000;

// ==================== Dynamic Field Keys ====================

public struct AccessControlKey has copy, drop, store {}
public struct CommentsKey has copy, drop, store {}
public struct RewardBalanceKey has copy, drop, store {}
public struct DepositsKey has copy, drop, store {}
public struct DepositorsKey has copy, drop, store {}
public struct AssigneeKey has copy, drop, store {}
public struct CompletionApprovedKey has copy, drop, store {}

// ==================== Core Structs ====================

/// Main Task object - stored as owned object, not shared
public struct Task has key, store {
    id: UID,
    creator: address,
    title: String,
    description: String,
    image_url: String,
    content_blob_id: Option<String>,
    file_blob_ids: vector<String>,
    result_blob_id: Option<String>,  // Blob ID of submitted completed work
    created_at: u64,
    updated_at: u64,
    due_date: Option<u64>,
    priority: u8,
    status: u8, // 0 = open, 1 = assigned, 2 = completed, 3 = approved, 4 = archived
    visibility: u8,  // 0 = private, 1 = team, 2 = public
    category: String,
    tags: vector<String>,
}

/// Access control map stored as dynamic field
/// Maps user address to their role
public struct AccessControl has store {
    roles: Table<address, u8>,
}

/// Comment stored in dynamic field vector
public struct Comment has copy, drop, store {
    author: address,
    content: String,
    created_at: u64,
    edited_at: u64,
}

// ==================== Registry for On-Chain Query ====================

/// Shared registry to index tasks by status for on-chain querying
public struct TaskRegistry has key {
    id: UID,
    tasks_by_status: Table<u8, vector<ID>>, // Key: status (u8), Value: list of Task IDs
}

/// Initialize function - automatically runs when contract is published
fun init(otw: TASK_MANAGE, ctx: &mut TxContext) {
    // Create Publisher for Display
    let publisher = package::claim(otw, ctx);

    // Configure Display for Task
    let keys = vector[b"name".to_string(), b"image_url".to_string(), b"description".to_string()];
    let values = vector[
        b"{title}".to_string(),
        b"{image_url}".to_string(),
        b"{description}".to_string(),
    ];

    let mut display = display::new_with_fields<Task>(
        &publisher,
        keys,
        values,
        ctx,
    );
    display.update_version();

    // Transfer Publisher and Display to deployer
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());

    // Initialize TaskRegistry
    let mut registry = TaskRegistry {
        id: object::new(ctx),
        tasks_by_status: table::new(ctx),
    };
    // Initialize empty vectors for each status
    table::add(&mut registry.tasks_by_status, STATUS_TODO, vector::empty<ID>());
    table::add(&mut registry.tasks_by_status, STATUS_IN_PROGRESS, vector::empty<ID>());
    table::add(&mut registry.tasks_by_status, STATUS_COMPLETED, vector::empty<ID>());
    table::add(&mut registry.tasks_by_status, STATUS_APPROVED, vector::empty<ID>());
    table::add(&mut registry.tasks_by_status, STATUS_ARCHIVED, vector::empty<ID>());

    transfer::share_object(registry);
}

/// Test-only function to initialize registry in test environment
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(TASK_MANAGE {}, ctx);
}

// ==================== Events ====================

public struct TaskCreated has copy, drop {
    task_id: address,
    creator: address,
    title: String,
    category: String,
    has_encrypted_content: bool,  // Indicates if task was created with SEAL-encrypted content
    encrypted_files_count: u64,   // Number of SEAL-encrypted files attached at creation
}

public struct TaskUpdated has copy, drop {
    task_id: address,
    updated_by: address,
}

public struct TaskDeleted has copy, drop {
    task_id: address,
    deleted_by: address,
}

public struct TaskShared has copy, drop {
    task_id: address,
    shared_with: address,
    role: u8,
}

public struct TaskAccessRevoked has copy, drop {
    task_id: address,
    revoked_from: address,
}

public struct TaskContentUpdated has copy, drop {
    task_id: address,
    content_blob_id: String,
}

public struct TaskFilesAdded has copy, drop {
    task_id: address,
    file_count: u64,
}

public struct CommentAdded has copy, drop {
    task_id: address,
    author: address,
    comment_index: u64,
}

public struct CommentEdited has copy, drop {
    task_id: address,
    author: address,
    comment_index: u64,
}

public struct CommentDeleted has copy, drop {
    task_id: address,
    deleted_by: address,
    comment_index: u64,
}

public struct TaskRewardDeposited has copy, drop {
    task_id: address,
    depositor: address,
    amount: u64,
}

public struct TaskAssigneeSet has copy, drop {
    task_id: address,
    assignee: address,
}

public struct TaskCompletionApproved has copy, drop {
    task_id: address,
    assignee: address,
    reward_amount: u64,
}

public struct TaskRewardRefunded has copy, drop {
    task_id: address,
    recipient: address,
    amount: u64,
}

public struct TaskCompleted has copy, drop {
    task_id: address,
    assignee: address,
    result_blob_id: String,
    timestamp: u64,
}

// ==================== Helper Functions ====================

/// Check if user has at least the required role level
fun has_permission(task: &Task, user: address, required_role: u8): bool {
    // Creator always has owner permission
    if (task.creator == user) {
        return true
    };

    // Check if access control exists
    if (!df::exists_(&task.id, AccessControlKey {})) {
        return false
    };

    let access_control = df::borrow<AccessControlKey, AccessControl>(&task.id, AccessControlKey {});

    if (!table::contains(&access_control.roles, user)) {
        return false
    };

    let user_role = *table::borrow(&access_control.roles, user);
    user_role >= required_role
}

/// Validate string length
fun validate_string_length(s: &String, max_length: u64, error_code: u64) {
    let bytes = string::as_bytes(s);
    assert!(vector::length(bytes) <= max_length, error_code);
}

/// Validate priority value
fun validate_priority(priority: u8) {
    assert!(priority >= PRIORITY_LOW && priority <= PRIORITY_CRITICAL, EInvalidPriority);
}

/// Validate status value
fun validate_status(status: u8) {
    assert!(status <= STATUS_ARCHIVED, EInvalidStatus);
}

/// Validate visibility value
fun validate_visibility(visibility: u8) {
    assert!(visibility <= 2, EInvalidStatus);  // 0=private, 1=team, 2=public
}

/// Validate role value
fun validate_role(role: u8) {
    assert!(role >= ROLE_VIEWER && role <= ROLE_OWNER, EInvalidRole);
}

/// Initialize access control for a task
fun init_access_control(task: &mut Task, ctx: &mut TxContext) {
    if (!df::exists_(&task.id, AccessControlKey {})) {
        let access_control = AccessControl {
            roles: table::new(ctx),
        };
        df::add(&mut task.id, AccessControlKey {}, access_control);
    };
}

/// Initialize comments vector for a task
fun init_comments(task: &mut Task) {
    if (!df::exists_(&task.id, CommentsKey {})) {
        df::add(&mut task.id, CommentsKey {}, vector::empty<Comment>());
    };
}

/// Initialize reward balance for a task
fun init_reward_balance(task: &mut Task, _ctx: &mut TxContext) {
    if (!df::exists_(&task.id, RewardBalanceKey {})) {
        let balance = balance::zero<SUI>();
        df::add(&mut task.id, RewardBalanceKey {}, balance);
    };
}

/// Initialize deposits table for a task
fun init_deposits(task: &mut Task, ctx: &mut TxContext) {
    if (!df::exists_(&task.id, DepositsKey {})) {
        let deposits = table::new<address, u64>(ctx);
        df::add(&mut task.id, DepositsKey {}, deposits);
    };
    if (!df::exists_(&task.id, DepositorsKey {})) {
        let depositors = vector::empty<address>();
        df::add(&mut task.id, DepositorsKey {}, depositors);
    };
}

// Helper to add task ID to registry
fun add_to_registry(registry: &mut TaskRegistry, task_id: ID, status: u8) {
    let status_list = table::borrow_mut(&mut registry.tasks_by_status, status);
    if (!vector::contains(status_list, &task_id)) {
        // To avoid duplicate if needed
        vector::push_back(status_list, task_id);
    };
}

// Helper to remove task ID from registry
fun remove_from_registry(registry: &mut TaskRegistry, task_id: ID, status: u8) {
    let status_list = table::borrow_mut(&mut registry.tasks_by_status, status);
    let (found, index) = vector::index_of(status_list, &task_id);
    if (found) {
        vector::remove(status_list, index);
    };
}

// ==================== Task CRUD Operations ====================

/// Create a new task with optional SEAL-encrypted Walrus content and files
/// 
/// This function enables creating tasks with pre-encrypted content stored on Walrus:
/// - content_blob_id: Optional blob ID for SEAL-encrypted task description/content
/// - initial_file_blob_ids: Optional vector of SEAL-encrypted file blob IDs
/// 
/// SEAL Integration Flow:
/// 1. Client encrypts data using SEAL (Identity-Based Encryption)
/// 2. Client uploads encrypted data to Walrus, receives blob IDs
/// 3. Client calls create_task with blob IDs
/// 4. Only users with proper access (checked via seal_approve) can decrypt
public fun create_task(
    version: &Version,
    title: String,
    description: String,
    image_url: String,
    due_date: Option<u64>,
    priority: u8,
    visibility: u8,  // 0 = private, 1 = team, 2 = public
    category: String,
    tags: vector<String>,
    content_blob_id: Option<String>,  // NEW: Optional SEAL-encrypted content blob ID
    initial_file_blob_ids: vector<String>,  // NEW: Optional SEAL-encrypted file blob IDs
    clock: &Clock,
    registry: &mut TaskRegistry,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);

    // Validations
    validate_string_length(&title, MAX_TITLE_LENGTH, ETitleTooLong);
    validate_string_length(&description, MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);
    validate_string_length(&category, MAX_CATEGORY_LENGTH, ECategoryTooLong);
    validate_priority(priority);
    assert!(visibility <= 2, EInvalidStatus);  // visibility must be 0, 1, or 2
    assert!(vector::length(&tags) <= MAX_TAGS_COUNT, ETooManyTags);

    // Validate tags
    let mut i = 0;
    let tags_len = vector::length(&tags);
    while (i < tags_len) {
        let tag = vector::borrow(&tags, i);
        validate_string_length(tag, MAX_TAG_LENGTH, ETagTooLong);
        i = i + 1;
    };

    let current_time = clock::timestamp_ms(clock);

    let mut task = Task {
        id: object::new(ctx),
        creator: tx_context::sender(ctx),
        title,
        description,
        image_url,
        content_blob_id,  // Store encrypted content blob ID
        file_blob_ids: initial_file_blob_ids,  // Store encrypted file blob IDs
        result_blob_id: option::none(),
        created_at: current_time,
        updated_at: current_time,
        due_date,
        priority,
        status: STATUS_TODO,
        visibility,
        category,
        tags,
    };

    let task_id_addr = object::uid_to_address(&task.id);
    let task_id = object::id(&task); // ID for registry

    // Add to registry
    add_to_registry(registry, task_id, STATUS_TODO);

    event::emit(TaskCreated {
        task_id: task_id_addr,
        creator: tx_context::sender(ctx),
        title: task.title,
        category: task.category,
        has_encrypted_content: option::is_some(&content_blob_id),
        encrypted_files_count: vector::length(&initial_file_blob_ids),
    });

    // Share the task object so both creator and assignee can mutate it
    transfer::share_object(task);
}

/// Update task basic information
public fun update_task_info(
    version: &Version,
    task: &mut Task,
    title: String,
    description: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    validate_string_length(&title, MAX_TITLE_LENGTH, ETitleTooLong);
    validate_string_length(&description, MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);

    task.title = title;
    task.description = description;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task priority
public fun update_priority(
    version: &Version,
    task: &mut Task,
    priority: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    validate_priority(priority);

    task.priority = priority;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task due date
public fun update_due_date(
    version: &Version,
    task: &mut Task,
    due_date: Option<u64>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    task.due_date = due_date;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task status
public fun update_status(
    version: &Version,
    task: &mut Task,
    status: u8,
    clock: &Clock,
    registry: &mut TaskRegistry,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    validate_status(status);

    let old_status = task.status;
    let task_id = object::id(task);

    // Remove from old status in registry
    remove_from_registry(registry, task_id, old_status);

    task.status = status;
    task.updated_at = clock::timestamp_ms(clock);

    // Add to new status in registry
    add_to_registry(registry, task_id, status);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task visibility
public fun update_visibility(
    version: &Version,
    task: &mut Task,
    visibility: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    validate_visibility(visibility);

    task.visibility = visibility;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task category
public fun update_category(
    version: &Version,
    task: &mut Task,
    category: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    validate_string_length(&category, MAX_CATEGORY_LENGTH, ECategoryTooLong);

    task.category = category;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Add a tag to task
public fun add_tag(
    version: &Version,
    task: &mut Task,
    tag: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    assert!(vector::length(&task.tags) < MAX_TAGS_COUNT, ETooManyTags);

    validate_string_length(&tag, MAX_TAG_LENGTH, ETagTooLong);

    vector::push_back(&mut task.tags, tag);
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Remove a tag from task
public fun remove_tag(
    version: &Version,
    task: &mut Task,
    tag_index: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    assert!(tag_index < vector::length(&task.tags), ETagTooLong);

    vector::remove(&mut task.tags, tag_index);
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Archive task (soft delete)
public fun archive_task(
    version: &Version,
    task: &mut Task,
    clock: &Clock,
    registry: &mut TaskRegistry,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);

    // Refund all deposits before archiving
    refund_deposits(task, ctx);

    let old_status = task.status;
    let task_id = object::id(task);

    // Remove from old status
    remove_from_registry(registry, task_id, old_status);

    task.status = STATUS_ARCHIVED;
    task.updated_at = clock::timestamp_ms(clock);

    // Add to archived
    add_to_registry(registry, task_id, STATUS_ARCHIVED);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Delete task (hard delete) - only owner can delete
public fun delete_task(
    version: &Version,
    mut task: Task,
    registry: &mut TaskRegistry,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(task.creator == sender, ENotOwner);

    let task_id_addr = object::uid_to_address(&task.id);
    let task_id = object::id(&task);

    // Remove from registry
    remove_from_registry(registry, task_id, task.status);

    event::emit(TaskDeleted {
        task_id: task_id_addr,
        deleted_by: sender,
    });

    // Refund all deposits before deleting
    refund_deposits(&mut task, ctx);

    // Clean up dynamic fields if they exist
    if (df::exists_(&task.id, AccessControlKey {})) {
        let AccessControl { roles } = df::remove<AccessControlKey, AccessControl>(
            &mut task.id,
            AccessControlKey {},
        );
        table::drop(roles);
    };

    if (df::exists_(&task.id, CommentsKey {})) {
        let _comments: vector<Comment> = df::remove(&mut task.id, CommentsKey {});
    };

    if (df::exists_(&task.id, AssigneeKey {})) {
        let _assignee: address = df::remove(&mut task.id, AssigneeKey {});
    };

    if (df::exists_(&task.id, CompletionApprovedKey {})) {
        let _approved: bool = df::remove(&mut task.id, CompletionApprovedKey {});
    };

    if (df::exists_(&task.id, DepositorsKey {})) {
        let _depositors: vector<address> = df::remove(&mut task.id, DepositorsKey {});
    };

    let Task {
        id,
        creator: _,
        title: _,
        description: _,
        image_url: _,
        content_blob_id: _,
        file_blob_ids: _,
        result_blob_id: _,
        created_at: _,
        updated_at: _,
        due_date: _,
        priority: _,
        status: _,
        visibility: _,
        category: _,
        tags: _,
    } = task;

    object::delete(id);
}

// ==================== Registry Getters for On-Chain Query ====================

/// Get list of task IDs by status (view function for on-chain/off-chain query)
public fun get_tasks_by_status(registry: &TaskRegistry, status: u8): vector<ID> {
    if (!table::contains(&registry.tasks_by_status, status)) {
        return vector::empty<ID>()
    };
    *table::borrow(&registry.tasks_by_status, status)
}

/// Get count of tasks by status
public fun get_task_count_by_status(registry: &TaskRegistry, status: u8): u64 {
    if (!table::contains(&registry.tasks_by_status, status)) {
        return 0
    };
    vector::length(table::borrow(&registry.tasks_by_status, status))
}

// ==================== Access Control Functions ====================

/// Share task with a user and assign role
public fun add_user_with_role(
    version: &Version,
    task: &mut Task,
    user: address,
    role: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    assert!(user != sender, ECannotShareWithSelf);
    validate_role(role);

    init_access_control(task, ctx);

    let access_control = df::borrow_mut<AccessControlKey, AccessControl>(
        &mut task.id,
        AccessControlKey {},
    );

    if (table::contains(&access_control.roles, user)) {
        // Update existing role
        let user_role = table::borrow_mut(&mut access_control.roles, user);
        *user_role = role;
    } else {
        // Add new user
        table::add(&mut access_control.roles, user, role);
    };

    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskShared {
        task_id: object::uid_to_address(&task.id),
        shared_with: user,
        role,
    });
}

/// Remove user access from task
public fun remove_user(
    version: &Version,
    task: &mut Task,
    user: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    assert!(user != task.creator, ECannotRemoveOwner);

    if (!df::exists_(&task.id, AccessControlKey {})) {
        return
    };

    let access_control = df::borrow_mut<AccessControlKey, AccessControl>(
        &mut task.id,
        AccessControlKey {},
    );

    if (table::contains(&access_control.roles, user)) {
        table::remove(&mut access_control.roles, user);
        task.updated_at = clock::timestamp_ms(clock);

        event::emit(TaskAccessRevoked {
            task_id: object::uid_to_address(&task.id),
            revoked_from: user,
        });
    };
}

/// Update user role
public fun update_user_role(
    version: &Version,
    task: &mut Task,
    user: address,
    new_role: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    assert!(user != task.creator, ECannotRemoveOwner);
    validate_role(new_role);

    if (!df::exists_(&task.id, AccessControlKey {})) {
        return
    };

    let access_control = df::borrow_mut<AccessControlKey, AccessControl>(
        &mut task.id,
        AccessControlKey {},
    );

    if (table::contains(&access_control.roles, user)) {
        let user_role = table::borrow_mut(&mut access_control.roles, user);
        *user_role = new_role;
        task.updated_at = clock::timestamp_ms(clock);

        event::emit(TaskShared {
            task_id: object::uid_to_address(&task.id),
            shared_with: user,
            role: new_role,
        });
    };
}

// ==================== Walrus/Seal Integration ====================

/// Add encrypted content blob ID from Walrus
public fun add_content(
    version: &Version,
    task: &mut Task,
    content_blob_id: Option<String>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    task.content_blob_id = content_blob_id;
    task.updated_at = clock::timestamp_ms(clock);

    // Only emit event if content_blob_id is Some
    if (option::is_some(&content_blob_id)) {
        let blob_id_string = *option::borrow(&content_blob_id);
        event::emit(TaskContentUpdated {
            task_id: object::uid_to_address(&task.id),
            content_blob_id: blob_id_string,
        });
    };
}

/// Add encrypted file blob IDs from Walrus
public fun add_files(
    version: &Version,
    task: &mut Task,
    file_blob_ids: vector<String>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    let mut i = 0;
    let len = vector::length(&file_blob_ids);

    while (i < len) {
        let blob_id = vector::borrow(&file_blob_ids, i);
        vector::push_back(&mut task.file_blob_ids, *blob_id);
        i = i + 1;
    };

    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskFilesAdded {
        task_id: object::uid_to_address(&task.id),
        file_count: len,
    });
}

/// Get namespace for Seal ID verification
public fun namespace(task: &Task): vector<u8> {
    let task_id = object::uid_to_address(&task.id);
    address::to_bytes(task_id)
}

/// Verify access for Seal decryption
public fun verify_access(task: &Task, ctx: &TxContext): bool {
    let user = tx_context::sender(ctx);
    has_permission(task, user, ROLE_VIEWER)
}

/// Seal approve function for IBE decryption
entry fun seal_approve(id: vector<u8>, task: &Task, ctx: &TxContext) {
    let _namespace_bytes = id; // Use the ID parameter
    assert!(verify_access(task, ctx), ENoAccess);
}

// ==================== Comments System ====================

/// Add a comment to task
public fun add_comment(
    version: &Version,
    task: &mut Task,
    content: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    validate_string_length(&content, MAX_COMMENT_LENGTH, EDescriptionTooLong);

    init_comments(task);

    let current_time = clock::timestamp_ms(clock);
    let comment = Comment {
        author: sender,
        content,
        created_at: current_time,
        edited_at: current_time,
    };

    let comments = df::borrow_mut<CommentsKey, vector<Comment>>(&mut task.id, CommentsKey {});
    vector::push_back(comments, comment);

    let comment_index = vector::length(comments) - 1;

    event::emit(CommentAdded {
        task_id: object::uid_to_address(&task.id),
        author: sender,
        comment_index,
    });
}

/// Edit own comment
public fun edit_comment(
    version: &Version,
    task: &mut Task,
    comment_index: u64,
    new_content: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);

    assert!(df::exists_(&task.id, CommentsKey {}), ECommentNotFound);

    let comments = df::borrow_mut<CommentsKey, vector<Comment>>(&mut task.id, CommentsKey {});
    assert!(comment_index < vector::length(comments), ECommentNotFound);

    let comment = vector::borrow_mut(comments, comment_index);
    assert!(comment.author == sender, EInsufficientPermission);

    validate_string_length(&new_content, MAX_COMMENT_LENGTH, EDescriptionTooLong);

    comment.content = new_content;
    comment.edited_at = clock::timestamp_ms(clock);

    event::emit(CommentEdited {
        task_id: object::uid_to_address(&task.id),
        author: sender,
        comment_index,
    });
}

/// Delete comment (author or owner can delete)
public fun delete_comment(
    version: &Version,
    task: &mut Task,
    comment_index: u64,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);

    assert!(df::exists_(&task.id, CommentsKey {}), ECommentNotFound);

    // Check if user is owner first (before borrowing comments)
    let is_owner = has_permission(task, sender, ROLE_OWNER);

    let comments = df::borrow_mut<CommentsKey, vector<Comment>>(&mut task.id, CommentsKey {});
    assert!(comment_index < vector::length(comments), ECommentNotFound);

    // Check if user is comment author or task owner
    let comment_author = vector::borrow(comments, comment_index).author;
    assert!(comment_author == sender || is_owner, EInsufficientPermission);

    vector::remove(comments, comment_index);

    event::emit(CommentDeleted {
        task_id: object::uid_to_address(&task.id),
        deleted_by: sender,
        comment_index,
    });
}

// ==================== SUI Reward System ====================

/// Deposit SUI reward into task (only Owner can deposit)
public fun deposit_reward(
    version: &Version,
    task: &mut Task,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    assert!(task.status != STATUS_COMPLETED, ETaskAlreadyCompleted);

    let amount = coin::value(&payment);
    assert!(amount > 0, EInvalidAmount);

    init_reward_balance(task, ctx);
    init_deposits(task, ctx);

    // Add full payment to total balance
    let payment_balance = coin::into_balance(payment);
    let balance = df::borrow_mut<RewardBalanceKey, Balance<SUI>>(&mut task.id, RewardBalanceKey {});
    balance::join(balance, payment_balance);

    // Track individual deposit amount (as u64)
    let deposits = df::borrow_mut<DepositsKey, Table<address, u64>>(
        &mut task.id,
        DepositsKey {},
    );

    if (table::contains(deposits, sender)) {
        // Add to existing deposit amount
        let user_amount = table::borrow_mut(deposits, sender);
        *user_amount = *user_amount + amount;
    } else {
        // Create new deposit entry
        table::add(deposits, sender, amount);
        // Track depositor
        let depositors = df::borrow_mut<DepositorsKey, vector<address>>(
            &mut task.id,
            DepositorsKey {},
        );
        vector::push_back(depositors, sender);
    };

    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskRewardDeposited {
        task_id: object::uid_to_address(&task.id),
        depositor: sender,
        amount,
    });
}

/// Set assignee for task (only Owner can set)
public fun set_assignee(
    version: &Version,
    task: &mut Task,
    assignee: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);

    if (!df::exists_(&task.id, AssigneeKey {})) {
        df::add(&mut task.id, AssigneeKey {}, assignee);
    } else {
        let assignee_ref = df::borrow_mut<AssigneeKey, address>(&mut task.id, AssigneeKey {});
        *assignee_ref = assignee;
    };

    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskAssigneeSet {
        task_id: object::uid_to_address(&task.id),
        assignee,
    });
}

/// Submit task completion with result (only assignee can submit)
public fun complete_task_with_result(
    version: &Version,
    task: &mut Task,
    result_blob_id: String,
    clock: &Clock,
    registry: &mut TaskRegistry,
    ctx: &mut TxContext,
) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    
    // Check that sender is the assignee
    assert!(df::exists_(&task.id, AssigneeKey {}), ENoAssignee);
    let assignee = *df::borrow<AssigneeKey, address>(&task.id, AssigneeKey {});
    assert!(assignee == sender, EInsufficientPermission);
    
    // Task must be in progress
    assert!(task.status == STATUS_IN_PROGRESS, EInvalidStatus);
    
    let old_status = task.status;
    let task_id = object::id(task);
    let current_time = clock::timestamp_ms(clock);
    
    // Update task status and result
    task.result_blob_id = option::some(result_blob_id);
    task.status = STATUS_COMPLETED;
    task.updated_at = current_time;
    
    // Update registry
    remove_from_registry(registry, task_id, old_status);
    add_to_registry(registry, task_id, STATUS_COMPLETED);
    
    event::emit(TaskCompleted {
        task_id: object::uid_to_address(&task.id),
        assignee: sender,
        result_blob_id,
        timestamp: current_time,
    });
}

/// Approve completion and transfer reward to assignee (only Owner can approve)
public fun approve_completion(version: &Version, task: &mut Task, registry: &mut TaskRegistry, ctx: &mut TxContext) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);
    assert!(task.status == STATUS_COMPLETED, ETaskNotCompleted);

    assert!(df::exists_(&task.id, AssigneeKey {}), ENoAssignee);
    let assignee = *df::borrow<AssigneeKey, address>(&task.id, AssigneeKey {});

    // Check if already approved
    if (df::exists_(&task.id, CompletionApprovedKey {})) {
        let approved = *df::borrow<CompletionApprovedKey, bool>(&task.id, CompletionApprovedKey {});
        assert!(!approved, EAlreadyApproved);
    };

    // Check if there's reward balance
    assert!(df::exists_(&task.id, RewardBalanceKey {}), ENoRewardBalance);
    let balance = df::remove<RewardBalanceKey, Balance<SUI>>(&mut task.id, RewardBalanceKey {});
    let reward_amount = balance::value(&balance);

    // Transfer reward to assignee
    let reward_coin = coin::from_balance(balance, ctx);
    sui::transfer::public_transfer(reward_coin, assignee);

    // Update status to APPROVED and update registry
    let old_status = task.status;
    let task_id = object::id(task);
    task.status = STATUS_APPROVED;
    
    remove_from_registry(registry, task_id, old_status);
    add_to_registry(registry, task_id, STATUS_APPROVED);

    // Mark as approved
    if (!df::exists_(&task.id, CompletionApprovedKey {})) {
        df::add(&mut task.id, CompletionApprovedKey {}, true);
    } else {
        let approved_ref = df::borrow_mut<CompletionApprovedKey, bool>(
            &mut task.id,
            CompletionApprovedKey {},
        );
        *approved_ref = true;
    };

    // Clean up deposits and depositors
    if (df::exists_(&task.id, DepositsKey {})) {
        let mut deposits = df::remove<DepositsKey, Table<address, u64>>(
            &mut task.id,
            DepositsKey {},
        );
        // Remove all entries to allow destroy_empty
        let depositors = if (df::exists_(&task.id, DepositorsKey {})) {
            df::remove<DepositorsKey, vector<address>>(&mut task.id, DepositorsKey {})
        } else {
            vector::empty<address>()
        };
        let mut i = 0;
        let len = vector::length(&depositors);
        while (i < len) {
            let recipient = *vector::borrow(&depositors, i);
            if (table::contains(&deposits, recipient)) {
                let _amount = table::remove(&mut deposits, recipient);
            };
            i = i + 1;
        };
        table::destroy_empty(deposits);
    };

    event::emit(TaskCompletionApproved {
        task_id: object::uid_to_address(&task.id),
        assignee,
        reward_amount,
    });
}

/// Refund all deposits (internal helper)
fun refund_deposits(task: &mut Task, ctx: &mut TxContext) {
    if (df::exists_(&task.id, RewardBalanceKey {})) {
        let mut balance = df::remove<RewardBalanceKey, Balance<SUI>>(
            &mut task.id,
            RewardBalanceKey {},
        );

        if (df::exists_(&task.id, DepositsKey {})) {
            let mut deposits = df::remove<DepositsKey, Table<address, u64>>(
                &mut task.id,
                DepositsKey {},
            );

            // Get depositors list
            let depositors = if (df::exists_(&task.id, DepositorsKey {})) {
                df::remove<DepositorsKey, vector<address>>(&mut task.id, DepositorsKey {})
            } else {
                vector::empty<address>()
            };

            // Refund each deposit by splitting from total balance
            let mut i = 0;
            let len = vector::length(&depositors);
            while (i < len) {
                let recipient = *vector::borrow(&depositors, i);
                if (table::contains(&deposits, recipient)) {
                    let amount = table::remove(&mut deposits, recipient);
                    let user_balance = balance::split(&mut balance, amount);
                    let refund_coin = coin::from_balance(user_balance, ctx);
                    sui::transfer::public_transfer(refund_coin, recipient);

                    event::emit(TaskRewardRefunded {
                        task_id: object::uid_to_address(&task.id),
                        recipient,
                        amount,
                    });
                };
                i = i + 1;
            };

            table::destroy_empty(deposits);
        };

        // If any remaining balance (due to mismatch), refund to creator
        let remaining = balance::value(&balance);
        if (remaining > 0) {
            let refund_coin = coin::from_balance(balance, ctx);
            sui::transfer::public_transfer(refund_coin, task.creator);
        } else {
            balance::destroy_zero(balance);
        };
    };
}

/// Cancel task and refund all deposits (only Owner can cancel)
public fun cancel_task(version: &Version, task: &mut Task, clock: &Clock, ctx: &mut TxContext) {
    version::check_is_valid(version);
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);

    // Refund all deposits
    refund_deposits(task, ctx);

    // Reset status to TODO
    task.status = STATUS_TODO;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

// ==================== Getter Functions ====================

public fun get_task_id(task: &Task): address {
    object::uid_to_address(&task.id)
}

public fun get_creator(task: &Task): address {
    task.creator
}

public fun get_title(task: &Task): String {
    task.title
}

public fun get_description(task: &Task): String {
    task.description
}

public fun get_image_url(task: &Task): String {
    task.image_url
}

public fun get_content_blob_id(task: &Task): Option<String> {
    task.content_blob_id
}

public fun get_file_blob_ids(task: &Task): vector<String> {
    task.file_blob_ids
}

public fun get_result_blob_id(task: &Task): Option<String> {
    task.result_blob_id
}

public fun get_created_at(task: &Task): u64 {
    task.created_at
}

public fun get_updated_at(task: &Task): u64 {
    task.updated_at
}

public fun get_due_date(task: &Task): Option<u64> {
    task.due_date
}

public fun get_priority(task: &Task): u8 {
    task.priority
}

public fun get_status(task: &Task): u8 {
    task.status
}

public fun get_visibility(task: &Task): u8 {
    task.visibility
}

public fun get_category(task: &Task): String {
    task.category
}

public fun get_tags(task: &Task): vector<String> {
    task.tags
}

/// Get user's role for a task (returns 0 if no access)
public fun get_user_role(task: &Task, user: address): u8 {
    if (task.creator == user) {
        return ROLE_OWNER
    };

    if (!df::exists_(&task.id, AccessControlKey {})) {
        return 0
    };

    let access_control = df::borrow<AccessControlKey, AccessControl>(&task.id, AccessControlKey {});

    if (table::contains(&access_control.roles, user)) {
        *table::borrow(&access_control.roles, user)
    } else {
        0
    }
}

/// Get all comments for a task
public fun get_comments(task: &Task): vector<Comment> {
    if (!df::exists_(&task.id, CommentsKey {})) {
        return vector::empty<Comment>()
    };

    *df::borrow<CommentsKey, vector<Comment>>(&task.id, CommentsKey {})
}

/// Check if task is overdue
public fun is_overdue(task: &Task, current_time: u64): bool {
    if (option::is_none(&task.due_date)) {
        return false
    };

    let due_date_value = *option::borrow(&task.due_date);
    current_time > due_date_value && task.status != STATUS_COMPLETED && task.status != STATUS_ARCHIVED
}

/// Check if user has access to task
public fun has_access(task: &Task, user: address): bool {
    has_permission(task, user, ROLE_VIEWER)
}

/// Get reward balance for a task
public fun get_reward_balance(task: &Task): u64 {
    if (!df::exists_(&task.id, RewardBalanceKey {})) {
        return 0
    };

    let balance = df::borrow<RewardBalanceKey, Balance<SUI>>(&task.id, RewardBalanceKey {});
    balance::value(balance)
}

/// Get assignee for a task (returns @0x0 if no assignee)
public fun get_assignee(task: &Task): address {
    if (!df::exists_(&task.id, AssigneeKey {})) {
        return @0x0
    };

    *df::borrow<AssigneeKey, address>(&task.id, AssigneeKey {})
}

/// Get deposit amount for a specific address
public fun get_deposit_amount(task: &Task, depositor: address): u64 {
    if (!df::exists_(&task.id, DepositsKey {})) {
        return 0
    };

    let deposits = df::borrow<DepositsKey, Table<address, u64>>(&task.id, DepositsKey {});

    if (table::contains(deposits, depositor)) {
        *table::borrow(deposits, depositor)
    } else {
        0
    }
}
// ==================== Constants Getters ====================

public fun priority_low(): u8 { PRIORITY_LOW }

public fun priority_medium(): u8 { PRIORITY_MEDIUM }

public fun priority_high(): u8 { PRIORITY_HIGH }

public fun priority_critical(): u8 { PRIORITY_CRITICAL }

public fun status_todo(): u8 { STATUS_TODO }

public fun status_in_progress(): u8 { STATUS_IN_PROGRESS }

public fun status_completed(): u8 { STATUS_COMPLETED }

public fun status_approved(): u8 { STATUS_APPROVED }

public fun status_archived(): u8 { STATUS_ARCHIVED }

public fun role_viewer(): u8 { ROLE_VIEWER }

public fun role_editor(): u8 { ROLE_EDITOR }

public fun role_owner(): u8 { ROLE_OWNER }
