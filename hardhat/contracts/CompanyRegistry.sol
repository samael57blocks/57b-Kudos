// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Minimal interface for NFT57B cross-contract role management
interface INFT57B {
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function MINTER_ROLE() external view returns (bytes32);
}

/// @title CompanyRegistry — 57Blocks Kudos Company Registration
/// @notice Manages company lifecycle (Pending → Approved → Rejected) and minter assignments
/// @dev Holds no roles directly. The external admin MUST grant this contract MINTER_ADMIN_ROLE
///      on NFT57B so addMinter/removeMinter can call grantRole/revokeRole.
contract CompanyRegistry is AccessControl {
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

    INFT57B public immutable nft57b;

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
}
