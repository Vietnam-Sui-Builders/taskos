/// Task Management System with Walrus Integration and Role-Based Access Control
/// This module provides a comprehensive task management system with:
/// - Full CRUD operations
/// - Role-based access control (Owner, Editor, Viewer)
/// - Comments support
/// - Categories and tags
/// - Walrus storage integration for encrypted content
/// - Seal integration for identity-based encryption
module task_manage::task_manage;

use std::string::{Self, String};
use sui::address;
use sui::clock::{Self, Clock};
use sui::dynamic_field as df;
use sui::event;
use sui::table::{Self, Table};

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

// ==================== Constants ====================

// Priority levels
const PRIORITY_LOW: u8 = 1;
const PRIORITY_MEDIUM: u8 = 2;
const PRIORITY_HIGH: u8 = 3;
const PRIORITY_CRITICAL: u8 = 4;

// Status levels
const STATUS_TODO: u8 = 0;
const STATUS_IN_PROGRESS: u8 = 1;
const STATUS_COMPLETED: u8 = 2;
const STATUS_ARCHIVED: u8 = 3;

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

// ==================== Core Structs ====================

/// Main Task object - stored as owned object, not shared
public struct Task has key, store {
    id: UID,
    creator: address,
    title: String,
    description: String,
    content_blob_id: String,
    file_blob_ids: vector<String>,
    created_at: u64,
    updated_at: u64,
    due_date: u64,
    priority: u8,
    status: u8,
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

// ==================== Events ====================

public struct TaskCreated has copy, drop {
    task_id: address,
    creator: address,
    title: String,
    category: String,
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

// ==================== Task CRUD Operations ====================

/// Create a new task
public fun create_task(
    title: vector<u8>,
    description: vector<u8>,
    due_date: u64,
    priority: u8,
    category: vector<u8>,
    tags: vector<vector<u8>>,
    clock: &Clock,
    ctx: &mut TxContext,
): Task {
    let task_title = string::utf8(title);
    let task_description = string::utf8(description);
    let task_category = string::utf8(category);

    // Validations
    validate_string_length(&task_title, MAX_TITLE_LENGTH, ETitleTooLong);
    validate_string_length(&task_description, MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);
    validate_string_length(&task_category, MAX_CATEGORY_LENGTH, ECategoryTooLong);
    validate_priority(priority);
    assert!(vector::length(&tags) <= MAX_TAGS_COUNT, ETooManyTags);

    // Convert and validate tags
    let mut task_tags = vector::empty<String>();
    let mut i = 0;
    let tags_len = vector::length(&tags);
    while (i < tags_len) {
        let tag = string::utf8(*vector::borrow(&tags, i));
        validate_string_length(&tag, MAX_TAG_LENGTH, ETagTooLong);
        vector::push_back(&mut task_tags, tag);
        i = i + 1;
    };

    let current_time = clock::timestamp_ms(clock);

    let task = Task {
        id: object::new(ctx),
        creator: tx_context::sender(ctx),
        title: task_title,
        description: task_description,
        content_blob_id: string::utf8(b""),
        file_blob_ids: vector::empty(),
        created_at: current_time,
        updated_at: current_time,
        due_date,
        priority,
        status: STATUS_TODO,
        category: task_category,
        tags: task_tags,
    };

    let task_id = object::uid_to_address(&task.id);

    event::emit(TaskCreated {
        task_id,
        creator: tx_context::sender(ctx),
        title: task.title,
        category: task.category,
    });

    task
}

/// Update task basic information
public fun update_task_info(
    task: &mut Task,
    title: vector<u8>,
    description: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    let new_title = string::utf8(title);
    let new_description = string::utf8(description);

    validate_string_length(&new_title, MAX_TITLE_LENGTH, ETitleTooLong);
    validate_string_length(&new_description, MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);

    task.title = new_title;
    task.description = new_description;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task priority
public fun update_priority(task: &mut Task, priority: u8, clock: &Clock, ctx: &mut TxContext) {
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
public fun update_due_date(task: &mut Task, due_date: u64, clock: &Clock, ctx: &mut TxContext) {
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
public fun update_status(task: &mut Task, status: u8, clock: &Clock, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    validate_status(status);

    task.status = status;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Update task category
public fun update_category(
    task: &mut Task,
    category: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    let new_category = string::utf8(category);
    validate_string_length(&new_category, MAX_CATEGORY_LENGTH, ECategoryTooLong);

    task.category = new_category;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Add a tag to task
public fun add_tag(task: &mut Task, tag: vector<u8>, clock: &Clock, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);
    assert!(vector::length(&task.tags) < MAX_TAGS_COUNT, ETooManyTags);

    let new_tag = string::utf8(tag);
    validate_string_length(&new_tag, MAX_TAG_LENGTH, ETagTooLong);

    vector::push_back(&mut task.tags, new_tag);
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Remove a tag from task
public fun remove_tag(task: &mut Task, tag_index: u64, clock: &Clock, ctx: &mut TxContext) {
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
public fun archive_task(task: &mut Task, clock: &Clock, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_OWNER), EInsufficientPermission);

    task.status = STATUS_ARCHIVED;
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskUpdated {
        task_id: object::uid_to_address(&task.id),
        updated_by: sender,
    });
}

/// Delete task (hard delete) - only owner can delete
public fun delete_task(mut task: Task, ctx: &TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(task.creator == sender, ENotOwner);

    let task_id = object::uid_to_address(&task.id);

    event::emit(TaskDeleted {
        task_id,
        deleted_by: sender,
    });

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

    let Task {
        id,
        creator: _,
        title: _,
        description: _,
        content_blob_id: _,
        file_blob_ids: _,
        created_at: _,
        updated_at: _,
        due_date: _,
        priority: _,
        status: _,
        category: _,
        tags: _,
    } = task;

    object::delete(id);
}

// ==================== Access Control Functions ====================

/// Share task with a user and assign role
public fun add_user_with_role(
    task: &mut Task,
    user: address,
    role: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
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
public fun remove_user(task: &mut Task, user: address, clock: &Clock, ctx: &mut TxContext) {
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
    task: &mut Task,
    user: address,
    new_role: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
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
    task: &mut Task,
    content_blob_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    task.content_blob_id = string::utf8(content_blob_id);
    task.updated_at = clock::timestamp_ms(clock);

    event::emit(TaskContentUpdated {
        task_id: object::uid_to_address(&task.id),
        content_blob_id: task.content_blob_id,
    });
}

/// Add encrypted file blob IDs from Walrus
public fun add_files(
    task: &mut Task,
    file_blob_ids: vector<vector<u8>>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    let mut i = 0;
    let len = vector::length(&file_blob_ids);

    while (i < len) {
        let blob_id = vector::borrow(&file_blob_ids, i);
        vector::push_back(&mut task.file_blob_ids, string::utf8(*blob_id));
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
public fun add_comment(task: &mut Task, content: vector<u8>, clock: &Clock, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(has_permission(task, sender, ROLE_EDITOR), EInsufficientPermission);

    let comment_content = string::utf8(content);
    validate_string_length(&comment_content, MAX_COMMENT_LENGTH, EDescriptionTooLong);

    init_comments(task);

    let current_time = clock::timestamp_ms(clock);
    let comment = Comment {
        author: sender,
        content: comment_content,
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
    task: &mut Task,
    comment_index: u64,
    new_content: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);

    assert!(df::exists_(&task.id, CommentsKey {}), ECommentNotFound);

    let comments = df::borrow_mut<CommentsKey, vector<Comment>>(&mut task.id, CommentsKey {});
    assert!(comment_index < vector::length(comments), ECommentNotFound);

    let comment = vector::borrow_mut(comments, comment_index);
    assert!(comment.author == sender, EInsufficientPermission);

    let new_comment_content = string::utf8(new_content);
    validate_string_length(&new_comment_content, MAX_COMMENT_LENGTH, EDescriptionTooLong);

    comment.content = new_comment_content;
    comment.edited_at = clock::timestamp_ms(clock);

    event::emit(CommentEdited {
        task_id: object::uid_to_address(&task.id),
        author: sender,
        comment_index,
    });
}

/// Delete comment (author or owner can delete)
public fun delete_comment(task: &mut Task, comment_index: u64, ctx: &mut TxContext) {
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

public fun get_content_blob_id(task: &Task): String {
    task.content_blob_id
}

public fun get_file_blob_ids(task: &Task): vector<String> {
    task.file_blob_ids
}

public fun get_created_at(task: &Task): u64 {
    task.created_at
}

public fun get_updated_at(task: &Task): u64 {
    task.updated_at
}

public fun get_due_date(task: &Task): u64 {
    task.due_date
}

public fun get_priority(task: &Task): u8 {
    task.priority
}

public fun get_status(task: &Task): u8 {
    task.status
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
    task.due_date > 0 && current_time > task.due_date && task.status != STATUS_COMPLETED && task.status != STATUS_ARCHIVED
}

/// Check if user has access to task
public fun has_access(task: &Task, user: address): bool {
    has_permission(task, user, ROLE_VIEWER)
}

// ==================== Constants Getters ====================

public fun priority_low(): u8 { PRIORITY_LOW }

public fun priority_medium(): u8 { PRIORITY_MEDIUM }

public fun priority_high(): u8 { PRIORITY_HIGH }

public fun priority_critical(): u8 { PRIORITY_CRITICAL }

public fun status_todo(): u8 { STATUS_TODO }

public fun status_in_progress(): u8 { STATUS_IN_PROGRESS }

public fun status_completed(): u8 { STATUS_COMPLETED }

public fun status_archived(): u8 { STATUS_ARCHIVED }

public fun role_viewer(): u8 { ROLE_VIEWER }

public fun role_editor(): u8 { ROLE_EDITOR }

public fun role_owner(): u8 { ROLE_OWNER }
