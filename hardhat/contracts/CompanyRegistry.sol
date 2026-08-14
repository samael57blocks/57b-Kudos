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
contract CompanyRegistry is AccessControl, ReentrancyGuard {
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

    /// @notice Emitted when a deployed Company updates its own reward amount
    event CompanyRewardAmountUpdated(address indexed company, uint256 amount);

    /// @notice Revert when trying to operate on a company that does not exist
    error CompanyNotFound(uint256 companyId);

    /// @notice Revert when a caller that is not a factory-deployed Company
    ///         tries to use Company-only functions (recordEmployee,
    ///         removeEmployeeRecord, setCompanyRewardAmount)
    error NotCompany(address caller);

    /// @notice Revert when querying an employee that is not mapped to any company
    error EmployeeNotRegistered(address employee);

    /// @notice Revert when registering a company with a zero admin wallet
    error InvalidAdminWallet();

    /// @notice Revert when onClaimed is called by anyone other than the
    ///         factory's immutable NFT57B contract
    error NotNFT57B(address caller);

    /// @notice Revert when onClaimed runs with a zero reward contract address
    ///         (defense-in-depth on the construction-pinned immutables)
    error RewardContractsNotSet();

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
    /// @dev public (not external) so factory functions can call it internally
    ///      as a gate — solc only permits internal-call syntax for public/internal
    ///      functions. ABI is identical for external callers.
    function isCompany(address addr) public view returns (bool) {
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

    /// @notice Claim entry point called by NFT57B after a token is claimed (burned)
    /// @param employee The employee address that claimed the token
    /// @param uri The metadata URI of the claimed token, forwarded to both rewards
    /// @dev Only the factory's immutable NFT57B may call (inline msg.sender
    ///      gate — reverts NotNFT57B). The claim is EXACTLY 2 hops —
    ///      NFT57B.claim → this function — with the factory minting
    ///      BonusReward + RecognitionToken DIRECTLY: NO Company involvement.
    ///      The employee's Company is resolved via the internal routing index
    ///      (EmployeeNotRegistered if unmapped) and its per-company reward
    ///      amount is minted as BonusReward; RecognitionToken is minted with
    ///      amount 0 (token id auto-increments). Reverts RewardContractsNotSet
    ///      if either immutable reward address is zero (defense-in-depth on
    ///      construction inputs). nonReentrant guards the cross-contract
    ///      reward mints. The tokenId parameter exists only to satisfy the
    ///      ICompanyRegistry.onClaimed callback signature and is unused in
    ///      the 2-hop direct path (the rewards' emitReward mints by
    ///      employee/amount/uri).
    function onClaimed(
        address employee,
        uint256 /* tokenId */, // callback signature only — unused in the 2-hop direct path
        string calldata uri
    ) external nonReentrant {
        // Inline onlyNFT57B gate (no modifier): the factory mints on behalf
        // of its immutable NFT57B and no other caller
        if (msg.sender != address(nft57b)) {
            revert NotNFT57B(msg.sender);
        }

        // Resolve the employee's Company via the claim-routing index
        address company = _companyByEmployee[employee];
        if (company == address(0)) {
            revert EmployeeNotRegistered(employee);
        }

        // Defense-in-depth on the construction-pinned immutables
        if (address(bonusReward) == address(0) || address(recognitionToken) == address(0)) {
            revert RewardContractsNotSet();
        }

        // Exactly 2 hops: mint the employee's per-company BonusReward amount,
        // then the RecognitionToken badge — no Company call in the chain
        IReward(bonusReward).emitReward(employee, _companyRewardAmount[company], uri);
        IReward(recognitionToken).emitReward(employee, 0, uri);
    }

    /// @notice Map an employee to the calling Company — claim-routing index only
    /// @param employee The employee address to route to msg.sender
    /// @dev Only a factory-deployed Company may map employees (NotCompany).
    ///      This is NOT an employee-management system: the factory merely
    ///      maintains a routing index (employee → Company address) consumed by
    ///      onClaimed (T1.4). The Company is the source of truth for its own
    ///      employee records and calls this as a side effect of its own
    ///      employee management. Idempotent: if the employee is already mapped
    ///      (sentinel check, address(0) = unmapped), the existing mapping is
    ///      NOT rewritten and the call does NOT revert — a no-op.
    function recordEmployee(address employee) external {
        if (!isCompany(msg.sender)) {
            revert NotCompany(msg.sender);
        }
        if (_companyByEmployee[employee] != address(0)) {
            return; // idempotent: keep the existing mapping, no-op
        }
        _companyByEmployee[employee] = msg.sender;
    }

    /// @notice Remove the calling Company's mapping for an employee
    /// @param employee The employee address to unmap
    /// @dev Only a factory-deployed Company may call (NotCompany). Idempotent:
    ///      only deletes when the mapping points at msg.sender — a Company can
    ///      NEVER delete another Company's mapping; unrelated/absent entries
    ///      are a no-op. The Company drives this from its own removeEmployee.
    function removeEmployeeRecord(address employee) external {
        if (!isCompany(msg.sender)) {
            revert NotCompany(msg.sender);
        }
        if (_companyByEmployee[employee] == msg.sender) {
            delete _companyByEmployee[employee];
        }
    }

    /// @notice Set the calling Company's own reward amount
    /// @param amount The new per-company reward amount used by onClaimed (T1.4)
    /// @dev Only the deployed Company itself may set its reward amount
    ///      (NotCompany) — the factory never edits a Company's value. Emits
    ///      CompanyRewardAmountUpdated. Per-company value; does NOT touch the
    ///      platform seed knob or other companies.
    function setCompanyRewardAmount(uint256 amount) external {
        if (!isCompany(msg.sender)) {
            revert NotCompany(msg.sender);
        }
        _companyRewardAmount[msg.sender] = amount;
        emit CompanyRewardAmountUpdated(msg.sender, amount);
    }

    /// @notice Platform seed knob for the default reward amount
    /// @param amount The new default bootstrapped into FUTURE registrations
    /// @dev Only DEFAULT_ADMIN_ROLE may update the platform knob. It seeds
    ///      _companyRewardAmount only for companies registered AFTER this call;
    ///      per-company values already set are NOT retroactively changed.
    function setRewardAmount(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _defaultRewardAmount = amount;
    }
}
