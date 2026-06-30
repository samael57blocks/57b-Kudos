// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./INFT57B.sol";
import "./IReward.sol";
import "./ICompanyRegistry.sol";

/// @title CompanyRegistry — 57Blocks Kudos Company Registration
/// @notice Manages company lifecycle (Pending → Approved → Rejected), minter assignments,
///         and reward orchestration (recognize + claim callbacks).
/// @dev Holds no roles directly. The external admin MUST grant this contract MINTER_ADMIN_ROLE
///      on NFT57B so addMinter/removeMinter can call grantRole/revokeRole.
contract CompanyRegistry is AccessControl, ICompanyRegistry, ReentrancyGuard {
    /// @notice Company lifecycle status
    enum CompanyStatus { Pending, Approved, Rejected }

    /// @notice Company data
    struct Company {
        uint256 id;
        string name;
        address admin;
        CompanyStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    /// @notice Emitted when a new company is registered
    event CompanyRegistered(uint256 indexed companyId, string name, address indexed admin);

    /// @notice Emitted when a company is approved
    event CompanyApproved(uint256 indexed companyId);

    /// @notice Emitted when a company is rejected
    event CompanyRejected(uint256 indexed companyId);

    /// @notice Emitted when an employee registers to a company
    event EmployeeRegistered(uint256 indexed companyId, address indexed employee);

    /// @notice Emitted when an employee is removed from a company
    event EmployeeRemoved(uint256 indexed companyId, address indexed employee);

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Events
    // ══════════════════════════════════════════════════════

    /// @notice Emitted when a company admin recognizes an employee (mints Kudos)
    /// @param tokenId The minted NFT token ID
    /// @param companyId The company that issued the recognition
    /// @param employee The recognized employee
    event Recognized(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee);

    /// @notice Emitted when reward contracts are updated
    /// @param bonusReward The BonusReward contract address
    /// @param recognitionToken The RecognitionToken contract address
    event RewardContractsUpdated(address bonusReward, address recognitionToken);

    /// @notice Revert when attempting to approve/reject a company that is not Pending
    error CompanyNotPending(uint256 companyId, CompanyStatus currentStatus);

    /// @notice Revert when attempting to add a minter for a company that is not Approved
    error CompanyNotApproved(uint256 companyId, CompanyStatus currentStatus);

    /// @notice Revert when an employee is already registered to a company
    error EmployeeAlreadyRegistered(address employee, uint256 companyId);

    /// @notice Revert when trying to remove an unregistered employee
    error EmployeeNotRegistered(address employee);

    /// @notice Revert when caller is not the company admin nor the DEFAULT_ADMIN
    error OnlyCompanyAdminOrAdmin(address caller, uint256 companyId);

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Errors
    // ══════════════════════════════════════════════════════

    /// @notice Revert when an employee is not registered to any approved company
    error EmployeeNotInApprovedCompany(address employee);

    /// @notice Revert when caller is not the admin of the employee's company
    error OnlyCompanyAdmin(address caller, uint256 companyId);

    /// @notice Revert when reward contracts (BonusReward or RecognitionToken) are not set
    error RewardContractsNotSet();

    /// @notice Revert when onClaimed is called by anyone other than NFT57B
    error NotNFT57B(address caller);

    INFT57B public immutable nft57b;

    /// @notice Address of the BonusReward ERC-20 contract
    address public bonusReward;

    /// @notice Address of the RecognitionToken ERC-721 contract
    address public recognitionToken;

    /// @notice Amount of BonusReward tokens minted per claim
    uint256 public rewardAmount;

    uint256 private _nextCompanyId;

    mapping(uint256 => Company) private _companies;

    /// @notice employee address → companyId + 1 (0 means unregistered)
    /// @dev Uses +1 offset to distinguish company ID 0 from "not registered"
    mapping(address => uint256) private _employeeCompanies;

    /// @notice Initializes the CompanyRegistry
    /// @param nft57bAddress The NFT57B contract address
    /// @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE
    constructor(address nft57bAddress, address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        nft57b = INFT57B(nft57bAddress);
    }

    /// @notice Register a new company
    /// @param name Company name
    /// @param adminWallet Company admin wallet address
    /// @return companyId The assigned company ID
    /// @dev Public — any wallet can register a company
    function registerCompany(
        string calldata name,
        address adminWallet
    ) external returns (uint256 companyId) {
        companyId = _nextCompanyId;
        unchecked {
            _nextCompanyId++;
        }

        _companies[companyId] = Company({
            id: companyId,
            name: name,
            admin: adminWallet,
            status: CompanyStatus.Pending,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit CompanyRegistered(companyId, name, adminWallet);
    }

    /// @notice Approve a company (changes status from Pending to Approved)
    /// @param companyId The company to approve
    /// @dev Only DEFAULT_ADMIN_ROLE. Reverts if company is not Pending.
    function approveCompany(uint256 companyId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Company storage company = _companies[companyId];
        if (company.status != CompanyStatus.Pending) {
            revert CompanyNotPending(companyId, company.status);
        }
        company.status = CompanyStatus.Approved;
        company.updatedAt = block.timestamp;
        emit CompanyApproved(companyId);
    }

    /// @notice Reject a company (changes status from Pending to Rejected)
    /// @param companyId The company to reject
    /// @dev Only DEFAULT_ADMIN_ROLE. Reverts if company is not Pending.
    function rejectCompany(uint256 companyId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Company storage company = _companies[companyId];
        if (company.status != CompanyStatus.Pending) {
            revert CompanyNotPending(companyId, company.status);
        }
        company.status = CompanyStatus.Rejected;
        company.updatedAt = block.timestamp;
        emit CompanyRejected(companyId);
    }

    /// @notice Grant MINTER_ROLE on NFT57B to a wallet for an approved company
    /// @param companyId The company (must be Approved)
    /// @param minterWallet Wallet to receive MINTER_ROLE
    /// @dev Only DEFAULT_ADMIN_ROLE. This contract MUST have MINTER_ADMIN_ROLE on NFT57B.
    function addMinter(
        uint256 companyId,
        address minterWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Company storage company = _companies[companyId];
        if (company.status != CompanyStatus.Approved) {
            revert CompanyNotApproved(companyId, company.status);
        }
        nft57b.grantRole(nft57b.MINTER_ROLE(), minterWallet);
    }

    /// @notice Revoke MINTER_ROLE on NFT57B from a wallet
    /// @param minterWallet Wallet to lose MINTER_ROLE
    /// @dev Only DEFAULT_ADMIN_ROLE. This contract MUST have MINTER_ADMIN_ROLE on NFT57B.
    function removeMinter(address minterWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        nft57b.revokeRole(nft57b.MINTER_ROLE(), minterWallet);
    }

    /// @notice Register msg.sender as an employee of an approved company
    /// @param companyId The company to join (must be Approved)
    /// @dev Public — any wallet can register. One wallet → one company.
    function registerEmployee(uint256 companyId) external {
        Company storage company = _companies[companyId];
        if (company.status != CompanyStatus.Approved) {
            revert CompanyNotApproved(companyId, company.status);
        }

        if (_employeeCompanies[msg.sender] != 0) {
            revert EmployeeAlreadyRegistered(msg.sender, _employeeCompanies[msg.sender] - 1);
        }

        _employeeCompanies[msg.sender] = companyId + 1;
        emit EmployeeRegistered(companyId, msg.sender);
    }

    /// @notice Remove an employee from their company
    /// @param employee The employee address to remove
    /// @dev Only DEFAULT_ADMIN_ROLE or the company admin. Reverts if not registered.
    function removeEmployee(address employee) external {
        uint256 stored = _employeeCompanies[employee];
        if (stored == 0) {
            revert EmployeeNotRegistered(employee);
        }

        uint256 companyId = stored - 1;
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && _companies[companyId].admin != msg.sender) {
            revert OnlyCompanyAdminOrAdmin(msg.sender, companyId);
        }

        delete _employeeCompanies[employee];
        emit EmployeeRemoved(companyId, employee);
    }

    /// @notice Get the company ID that an employee belongs to
    /// @param employee The employee address
    /// @return companyId The company ID, or 0 if not registered
    function getEmployeeCompany(address employee) external view returns (uint256 companyId) {
        uint256 stored = _employeeCompanies[employee];
        if (stored == 0) return 0;
        return stored - 1;
    }

    /// @notice Get company info by ID
    /// @param companyId The company ID
    /// @return Company struct with all fields
    function getCompany(uint256 companyId) external view returns (Company memory) {
        return _companies[companyId];
    }

    /// @notice Check if a company is approved
    /// @param companyId The company ID
    /// @return true if company status is Approved, false otherwise
    function isApproved(uint256 companyId) external view returns (bool) {
        return _companies[companyId].status == CompanyStatus.Approved;
    }

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Functions
    // ══════════════════════════════════════════════════════

    /// @notice Recognize an employee by minting a Kudos NFT
    /// @param employee The employee address (must be registered to an approved company)
    /// @param uri Metadata URI for the Kudos NFT
    /// @return tokenId The ID of the minted token
    /// @dev Only callable by the admin of the approved company the employee belongs to.
    function recognize(address employee, string calldata uri) external returns (uint256 tokenId) {
        uint256 stored = _employeeCompanies[employee];
        if (stored == 0) {
            revert EmployeeNotInApprovedCompany(employee);
        }

        uint256 companyId = stored - 1;
        Company storage company = _companies[companyId];

        if (company.status != CompanyStatus.Approved) {
            revert CompanyNotApproved(companyId, company.status);
        }

        if (company.admin != _msgSender()) {
            revert OnlyCompanyAdmin(_msgSender(), companyId);
        }

        tokenId = nft57b.safeMint(employee, uri);

        emit Recognized(tokenId, companyId, employee);
    }

    /// @notice Set the reward contract addresses for claim rewards
    /// @param bonusReward_ The BonusReward contract address
    /// @param recognitionToken_ The RecognitionToken contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function setRewardContracts(address bonusReward_, address recognitionToken_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bonusReward = bonusReward_;
        recognitionToken = recognitionToken_;
        emit RewardContractsUpdated(bonusReward_, recognitionToken_);
    }

    /// @notice Set the amount of BonusReward tokens minted per claim
    /// @param amount_ The reward amount (in wei, e.g. 100 * 10^18)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function setRewardAmount(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardAmount = amount_;
    }

    /// @notice Callback invoked by NFT57B after a successful claim
    /// @param employee The address that claimed the token
    /// @param uri The metadata URI of the claimed token
    /// @dev Only callable by the stored NFT57B contract. Uses ReentrancyGuard.
    ///      Mints BonusReward tokens and a RecognitionToken badge.
    ///      The tokenId parameter is unused (defined by ICompanyRegistry interface).
    function onClaimed(
        address employee,
        uint256 /* tokenId */,
        string calldata uri
    ) external nonReentrant {
        if (_msgSender() != address(nft57b)) {
            revert NotNFT57B(_msgSender());
        }

        if (bonusReward == address(0) || recognitionToken == address(0)) {
            revert RewardContractsNotSet();
        }

        // Mint ERC-20 bonus tokens
        IReward(bonusReward).emitReward(employee, rewardAmount, uri);

        // Mint ERC-721 recognition badge (amount=0 as RecognitionToken auto-increments)
        IReward(recognitionToken).emitReward(employee, 0, uri);
    }
}
