// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICompany — Company Interface
/// @notice Interface of the Company contract deployed by the CompanyRegistry
///         factory: the company admin manages employees and grants MINTER_ROLE
///         to active employees who mint Kudos via recognize().
/// @dev Standalone interface (Company is NOT a factory registry, so it does
///      NOT inherit ICompanyRegistry). Company has no claim orchestration —
///      the factory orchestrates claims — so this interface declares NO
///      onClaimed. Signatures match the Company implementation 1:1, so Company
///      implements this interface with zero changes.
interface ICompany {
    /// @notice The name of the company
    /// @return The company display name
    function name() external view returns (string memory);

    /// @notice Check whether an address is registered as an active employee
    /// @param employee The address to check
    /// @return true if the address is an active employee
    function isEmployee(address employee) external view returns (bool);

    /// @notice Get the display name of an employee
    /// @param employee The employee address
    /// @return The stored name (empty string if not registered)
    function getEmployeeName(address employee) external view returns (string memory);

    /// @notice Register an employee to the company (admin-only)
    /// @param employee The employee address to register
    /// @param name The employee's display name
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can register employees.
    ///      Reverts with EmployeeAlreadyRegistered if the employee is already active.
    function registerEmployee(address employee, string calldata name) external;

    /// @notice Remove an employee from the company (admin-only)
    /// @param employee The employee address to remove
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can remove employees.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    function removeEmployee(address employee) external;

    /// @notice Update an employee's display name (admin-only)
    /// @param employee The employee address
    /// @param name The new display name
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can update employee names.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    function updateEmployeeName(address employee, string calldata name) external;

    /// @notice Recognize an employee by minting a Kudos NFT
    /// @param employee The employee address (must be an active employee)
    /// @param uri Metadata URI for the Kudos NFT
    /// @return tokenId The ID of the minted token
    /// @dev Only MINTER_ROLE holders (granted by the company admin) can mint.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    ///      This is the ONLY mint path.
    function recognize(address employee, string calldata uri) external returns (uint256 tokenId);

    /// @notice Grant MINTER_ROLE to an employee (admin-only)
    /// @param employee The employee address to grant minter rights to
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin).
    ///      Reverts with EmployeeNotRegistered if the employee is not active
    ///      (active employees only, spec C1.9).
    function grantMinterRole(address employee) external;

    /// @notice Revoke MINTER_ROLE from an employee (admin-only)
    /// @param employee The employee address to revoke minter rights from
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin).
    ///      Reverts with EmployeeNotRegistered if the employee is not active
    ///      (active employees only, spec C1.9).
    function revokeMinterRole(address employee) external;

    /// @notice Check whether an address holds MINTER_ROLE
    /// @param account The address to check
    /// @return true if the address has MINTER_ROLE
    function hasMinterRole(address account) external view returns (bool);

    /// @notice Get this Company's per-claim BonusReward amount
    /// @return The reward amount (in wei) configured for this Company
    /// @dev Delegates to the CompanyRegistry factory — the factory is the
    ///      source of truth for the per-company reward amount (spec C1.10).
    function rewardAmount() external view returns (uint256);

    /// @notice Set this Company's per-claim BonusReward amount (admin-only)
    /// @param amount The reward amount (in wei, e.g. 100 * 10^18)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin). Forwards
    ///      to the CompanyRegistry factory, which emits CompanyRewardAmountUpdated.
    function setRewardAmount(uint256 amount) external;
}
