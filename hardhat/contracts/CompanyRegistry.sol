// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/INFT57B.sol";
import "./interfaces/IReward.sol";
import "./interfaces/ICompanyRegistry.sol";
import "./Company.sol";

/// @title CompanyRegistry — 57Blocks Kudos Company Factory
/// @notice Factory contract that deploys one standalone Company per company.
///         Platform admin (DEFAULT_ADMIN_ROLE) registers companies; the factory
///         holds the reward contracts as immutables and orchestrates claims.
/// @dev AccessControl-inherited DEFAULT_ADMIN_ROLE gates all factory admin ops
///      (registerCompany, platform rewardAmount knob, etc.). Reward addresses
///      are pinned at construction time — no post-deploy reward wiring.
contract CompanyRegistry is AccessControl {
    /// @notice The NFT57B contract that mints Kudos tokens (immutable)
    INFT57B public immutable nft57b;

    /// @notice The BonusReward ERC-20 contract (immutable)
    IReward public immutable bonusReward;

    /// @notice The RecognitionToken ERC-721 contract (immutable)
    IReward public immutable recognitionToken;

    /// @notice Emitted when a new company is registered
    event CompanyRegistered(address indexed companyAddress, address indexed owner, string name);

    /// @notice Revert when trying to operate on a company that does not exist
    error CompanyNotFound(uint256 companyId);

    /// @notice Revert when caller is not the company admin nor the DEFAULT_ADMIN
    error OnlyCompanyAdminOrAdmin(address caller, uint256 companyId);

    uint256 private _nextCompanyId;
    Company[] public deployedCompanies;

    /// @notice Initializes the factory
    /// @param nft57b_ The NFT57B contract address (mint + claim orchestration)
    /// @param bonusReward_ The BonusReward contract address
    /// @param recognitionToken_ The RecognitionToken contract address
    /// @param defaultAdmin_ Address that receives DEFAULT_ADMIN_ROLE
    constructor(
        address nft57b_,
        address bonusReward_,
        address recognitionToken_,
        address defaultAdmin_
    ) {
        nft57b = INFT57B(nft57b_);
        bonusReward = IReward(bonusReward_);
        recognitionToken = IReward(recognitionToken_);
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin_);
    }

    /// @notice Register a new company
    /// @param _name Company name
    /// @return companyId The assigned company ID
    /// @dev Only DEFAULT_ADMIN_ROLE can register a company
    function registerCompany(
        string calldata _name
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (address) {
        Company newCompany = new Company(_name, msg.sender);
        address companyAddress = address(newCompany);

        deployedCompanies.push(newCompany);

        emit CompanyRegistered(companyAddress, msg.sender, _name);
        return companyAddress;
    }
}
