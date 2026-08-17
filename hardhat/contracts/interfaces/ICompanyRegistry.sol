// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IReward.sol";

/// @title ICompanyRegistry — Company Factory Interface
/// @notice Single interface of the CompanyRegistry contract in its factory role:
///         deploys one standalone Company per company, routes claims, and
///         maintains the employee → Company routing index.
/// @dev Consolidates the claim callback (onClaimed) and the factory API into ONE
///      interface (ICompanyFactory was merged into this file). onClaimed is the
///      claim entry point called by NFT57B after a successful claim;
///      bonusReward/recognitionToken getters are informational (deploy
///      verification — no longer read by Company).
interface ICompanyRegistry {
    /// @notice Called by NFT57B after a token is claimed (burned)
    /// @param employee The address that claimed the token
    /// @param tokenId The ID of the claimed token
    /// @param uri The metadata URI of the claimed token
    function onClaimed(address employee, uint256 tokenId, string calldata uri) external;

    /// @notice Deploy and register a new Company — the factory is the sole Company deployer
    /// @param name Company name
    /// @param adminWallet Address that receives DEFAULT_ADMIN_ROLE on the new Company
    /// @return companyAddress The deployed Company contract address
    /// @dev Only the platform admin (DEFAULT_ADMIN_ROLE) may register a company
    function registerCompany(
        string calldata name,
        address adminWallet
    ) external returns (address);

    /// @notice Check whether an address is a factory-deployed Company
    /// @param addr The address to check
    /// @return true iff addr was returned by registerCompany
    function isCompany(address addr) external view returns (bool);

    /// @notice Get the Company address an employee belongs to
    /// @param employee The employee address
    /// @return companyAddress The Company contract address
    /// @dev Reverts EmployeeNotRegistered if the employee is not mapped
    function getCompanyAddressByEmployee(address employee) external view returns (address);

    /// @notice Get the Company address for a 1-based registration id
    /// @param companyId The company id (>= 1)
    /// @return companyAddress The Company contract address
    /// @dev Reverts CompanyNotFound for id 0 or ids beyond companyCount()
    function getCompanyAddress(uint256 companyId) external view returns (address);

    /// @notice Get the address of every registered Company, in registration order
    /// @return companies All deployed Company addresses
    function getCompanies() external view returns (address[] memory);

    /// @notice Total number of registered companies
    /// @return count The number of deployed Companies
    function companyCount() external view returns (uint256);

    /// @notice The BonusReward contract the factory mints on claims (informational)
    /// @return The BonusReward IReward contract
    function bonusReward() external view returns (IReward);

    /// @notice The RecognitionToken contract the factory mints on claims (informational)
    /// @return The RecognitionToken IReward contract
    function recognitionToken() external view returns (IReward);

    /// @notice Map an employee to the calling Company — claim-routing index only
    /// @param employee The employee address to route to the caller
    /// @dev Only a factory-deployed Company may call
    function recordEmployee(address employee) external;

    /// @notice Remove the calling Company's mapping for an employee
    /// @param employee The employee address to unmap
    /// @dev Only a factory-deployed Company may call
    function removeEmployeeRecord(address employee) external;

    /// @notice Set the calling Company's own reward amount
    /// @param amount The new per-company reward amount used on claims
    /// @dev Only the deployed Company itself may call
    function setCompanyRewardAmount(uint256 amount) external;

    /// @notice Get a company's per-claim BonusReward amount
    /// @param company The Company address
    /// @return The configured reward amount (0 for non-companies)
    /// @dev Read by the deployed Companies as the rewardAmount() delegate
    function companyRewardAmount(address company) external view returns (uint256);
}
