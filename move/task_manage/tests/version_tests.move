/// Tests for version migration functionality
module task_manage::version_tests;

use sui::test_scenario::{Self as ts, Scenario};
use task_manage::version::{Self, Version};

// ==================== Test Setup ====================

/// Setup function to create test scenario with version object
fun setup_test(): Scenario {
    let mut scenario = ts::begin(@0xA);

    // Initialize version object
    {
        let ctx = ts::ctx(&mut scenario);
        version::init_for_testing(ctx);
    };

    scenario
}

// ==================== Version Check Tests ====================

#[test]
/// Test version validation with correct version
/// This is critical - ensures version check works correctly for valid versions
fun test_check_version_valid() {
    let mut scenario = setup_test();
    let user = @0xA;

    // Check that initialized version is valid
    ts::next_tx(&mut scenario, user);
    {
        let version_obj = ts::take_shared<Version>(&scenario);

        // This should pass without error
        version::check_is_valid(&version_obj);

        // Verify we can read the version value
        let current_version = version::version(&version_obj);
        assert!(current_version == 1, 0); // VERSION constant is 1

        ts::return_shared(version_obj);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ::task_manage::version::EInvalidPackageVersion)]
/// Test version validation fails with incorrect version
/// This is critical for security - ensures incompatible versions are rejected
fun test_check_version_invalid() {
    let mut scenario = setup_test();
    let user = @0xA;

    // Simulate an old/invalid version by modifying it
    ts::next_tx(&mut scenario, user);
    {
        let mut version_obj = ts::take_shared<Version>(&scenario);

        // Set to an invalid version (simulating old package version)
        version::set_version_for_testing(&mut version_obj, 999);

        // This should abort with EInvalidPackageVersion
        version::check_is_valid(&version_obj);

        ts::return_shared(version_obj);
    };

    ts::end(scenario);
}

// ==================== Version Migration Tests ====================

#[test]
/// Test simulating version upgrade from v1 to v2
/// This tests the migration path when package is upgraded
fun test_version_migration_upgrade() {
    let mut scenario = setup_test();
    let user = @0xA;

    // Initially version should be 1
    ts::next_tx(&mut scenario, user);
    {
        let version_obj = ts::take_shared<Version>(&scenario);
        assert!(version::version(&version_obj) == 1, 0);
        ts::return_shared(version_obj);
    };

    // Simulate version upgrade to v2
    ts::next_tx(&mut scenario, user);
    {
        let mut version_obj = ts::take_shared<Version>(&scenario);

        // Simulate upgrading to version 2
        version::set_version_for_testing(&mut version_obj, 2);

        // Verify version is now 2
        assert!(version::version(&version_obj) == 2, 1);

        ts::return_shared(version_obj);
    };

    ts::end(scenario);
}
