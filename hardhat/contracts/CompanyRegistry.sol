// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
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

    /// @notice MINTER_ROLE identifier on the reward contracts, granted to each deployed Company
    bytes32 private constant _MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Emitted when a new company is registered
    event CompanyRegistered(
        uint256 indexed companyId,
        address indexed companyAddress,
        address indexed owner,
        string name
    );

    /// @notice Revert when trying to operate on a company that does not exist
    error CompanyNotFound(uint256 companyId);

    /// @notice Revert when querying an employee that is not mapped to any company
    error EmployeeNotRegistered(address employee);

    /// @notice Revert when registering a company with a zero admin wallet
    error InvalidAdminWallet();

    /// @notice All deployed companies in registration order. The 1-based
    ///         registration id of a company is its index here + 1.
    Company[] private _companies;

    /// @notice company address → companyId + 1 (sentinel 0 = not a company)
    mapping(address => uint256) private _companyIdByAddress;

    /// @notice employee address → Company address (sentinel address(0) = unmapped)
    /// @dev Maintained by the deployed Companies via recordEmployee/removeEmployeeRecord (T1.3)
    mapping(address => address) private _companyByEmployee;

    /// @notice company address → per-company reward amount used by onClaimed (T1.4)
    mapping(address => uint256) private _companyRewardAmount;

    /// @notice Platform seed knob that bootstraps _companyRewardAmount for FUTURE
    ///         registrations. The public setRewardAmount knob (T1.3) updates it.
    uint256 private _defaultRewardAmount;

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
        _defaultRewardAmount = 0; // platform seed knob; T1.3 owns the admin setter
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin_);
    }

    /// @notice Deploy and register a new Company — the factory is the sole Company deployer
    /// @param name Company name
    /// @param adminWallet Address that receives DEFAULT_ADMIN_ROLE on the new Company
    /// @return companyAddress The deployed Company contract address
    /// @dev Only DEFAULT_ADMIN_ROLE can register a company. The new Company is
    ///      granted MINTER_ROLE on both reward contracts and its reward amount
    ///      is bootstrapped from the platform default seed knob.
    function registerCompany(
        string calldata name,
        address adminWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (address) {
        if (adminWallet == address(0)) {
            revert InvalidAdminWallet();
        }

        Company newCompany = new Company(name, adminWallet, nft57b);
        address companyAddress = address(newCompany);

        _companies.push(newCompany);
        uint256 companyId = _companies.length; // 1-based registration id
        _companyIdByAddress[companyAddress] = companyId;
        _companyRewardAmount[companyAddress] = _defaultRewardAmount;

        // Known Integration Point 1: IReward exposes no grantRole, but both reward
        // contracts are AccessControl exposing MINTER_ROLE — grant via IAccessControl.
        IAccessControl(address(bonusReward)).grantRole(_MINTER_ROLE, companyAddress);
        IAccessControl(address(recognitionToken)).grantRole(_MINTER_ROLE, companyAddress);

        emit CompanyRegistered(companyId, companyAddress, adminWallet, name);
        return companyAddress;
    }

    /// @notice Check whether an address is a factory-deployed Company
    /// @param addr The address to check
    /// @return true iff addr was returned by registerCompany (companyId != 0)
    function isCompany(address addr) external view returns (bool) {
        return _companyIdByAddress[addr] != 0;
    }

    /// @notice Get the Company address for a 1-based registration id
    /// @param companyId The company id (>= 1)
    /// @return companyAddress The Company contract address
    /// @dev Reverts CompanyNotFound for id 0 or ids beyond companyCount()
    function getCompanyAddress(uint256 companyId) external view returns (address) {
        if (companyId == 0 || companyId > _companies.length) {
            revert CompanyNotFound(companyId);
        }
        return address(_companies[companyId - 1]);
    }

    /// @notice Get the address of every registered Company, in registration order
    function getCompanies() external view returns (address[] memory) {
        address[] memory companies = new address[](_companies.length);
        for (uint256 i; i < _companies.length; ++i) {
            companies[i] = address(_companies[i]);
        }
        return companies;
    }

    /// @notice Total number of registered companies
    function companyCount() external view returns (uint256) {
        return _companies.length;
    }

    /// @notice Get the Company address an employee belongs to
    /// @param employee The employee address
    /// @return companyAddress The Company contract address
    /// @dev Reverts EmployeeNotRegistered if the employee is not mapped.
    ///      No numeric company getter exists — removed by revision v2.
    function getCompanyAddressByEmployee(address employee) external view returns (address) {
        address company = _companyByEmployee[employee];
        if (company == address(0)) {
            revert EmployeeNotRegistered(employee);
        }
        return company;
    }
}
