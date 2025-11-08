/// Version control module for the task management system
/// This module ensures backward compatibility and safe upgrades
module task_manage::version;

// ==================== Error Codes ====================

const EInvalidPackageVersion: u64 = 100;

// ==================== Constants ====================

/// Current package version
const VERSION: u64 = 1;

// ==================== Structs ====================

/// Shared Version object to verify package compatibility
public struct Version has key {
    id: UID,
    version: u64,
}

// ==================== Init Function ====================

/// Initialize and share the Version object
/// This should be called once during package deployment
fun init(ctx: &mut TxContext) {
    let version_obj = Version {
        id: object::new(ctx),
        version: VERSION,
    };
    transfer::share_object(version_obj);
}

// ==================== Public Functions ====================

/// Check if the version is valid
/// Aborts with EInvalidPackageVersion if version doesn't match
public fun check_is_valid(version: &Version) {
    assert!(version.version == VERSION, EInvalidPackageVersion);
}

// ==================== Test-Only Functions ====================

#[test_only]
/// Initialize version for testing purposes
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

