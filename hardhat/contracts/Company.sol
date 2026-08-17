// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INFT57B.sol";
import "./interfaces/ICompanyRegistry.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Company — 57Blocks Kudos Company
/// @notice A standalone company contract deployed by the CompanyRegistry factory.
///         The company admin (DEFAULT_ADMIN_ROLE) manages employees and grants
///         MINTER_ROLE to active employees who mint Kudos via recognize().
/// @dev Factory pattern: CompanyRegistry (immutable factory) is the sole deployer;
///      the NFT57B minting contract is pinned at construction (immutable nft57b);
///      the company admin is granted DEFAULT_ADMIN_ROLE in the constructor.
///      Company has no claim orchestration — the factory orchestrates claims (2 hops).
contract Company is AccessControl {
    /// @notice The name of the company
    string public name;

    /// @notice The NFT57B contract that mints Kudos tokens (immutable)
    INFT57B public immutable nft57b;

    /// @notice The CompanyRegistry factory that deployed this Company (immutable)
    address public immutable factory;

    /// @notice Employee record: display name, registration timestamp, active flag
    struct Employee {
        string name;
        uint256 createdAt;
        bool isActive;
    }

    /// @notice Emitted when an employee registers to a company
    event EmployeeRegistered(address indexed employee, string name);

    /// @notice Emitted when an employee is removed from a company
    event EmployeeRemoved(address indexed employee);

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Events
    // ══════════════════════════════════════════════════════

    /// @notice Emitted when a company admin recognizes an employee (mints Kudos)
    /// @param tokenId The minted NFT token ID
    /// @param employee The recognized employee
    event Recognized(uint256 indexed tokenId, address indexed employee);

    /// @notice Revert when an employee is already registered to a company
    error EmployeeAlreadyRegistered(address employee);

    /// @notice Revert when trying to remove an unregistered employee
    error EmployeeNotRegistered(address employee);

    // ══════════════════════════════════════════════════════
    //  Minter Role
    // ══════════════════════════════════════════════════════

    /// @notice Role identifier for Kudos minters (distinct from RecognitionToken's MINTER_ROLE)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Emitted when MINTER_ROLE is granted to an employee
    event MinterRoleGranted(address indexed employee);

    /// @notice Emitted when MINTER_ROLE is revoked from an employee
    event MinterRoleRevoked(address indexed employee);

    /// @notice employee address → Employee record
    mapping(address => Employee) private _employees;

    /// @notice Initializes the Company
    /// @param name_ The company name
    /// @param companyOwner_ The address that receives DEFAULT_ADMIN_ROLE (company admin)
    /// @param nft57b_ The NFT57B contract address used to mint Kudos
    /// @dev The CompanyRegistry factory is recorded as immutable from msg.sender.
    constructor(string memory name_, address companyOwner_, address nft57b_) {
        name = name_;
        nft57b = INFT57B(nft57b_);
        factory = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, companyOwner_);
    }

    /// @notice Register an employee to a company (admin-only)
    /// @param _employeeAddress The employee address to register
    /// @param _name The employee's display name
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can register employees.
    ///      Reverts with EmployeeAlreadyRegistered if the employee is already active.
    ///      Follows Checks-Effects-Interactions: local write + EmployeeRegistered
    ///      emit first, then the factory's employee → company routing index is
    ///      synced via ICompanyRegistry(factory).recordEmployee in the same tx.
    function registerEmployee(address _employeeAddress, string calldata _name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_employees[_employeeAddress].isActive) {
            revert EmployeeAlreadyRegistered(_employeeAddress);
        }

        _employees[_employeeAddress] = Employee({
            name: _name,
            isActive: true,
            createdAt: block.timestamp
        });
        emit EmployeeRegistered(_employeeAddress, _name);
        ICompanyRegistry(factory).recordEmployee(_employeeAddress);
    }

    /// @notice Remove an employee from their company (admin-only)
    /// @param _employeeAddress The employee address to remove
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can remove employees.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    ///      Follows Checks-Effects-Interactions: local write + EmployeeRemoved
    ///      emit first, then the factory's employee → company routing index is
    ///      synced via ICompanyRegistry(factory).removeEmployeeRecord in the same tx.
    function removeEmployee(address _employeeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_employees[_employeeAddress].isActive) {
            revert EmployeeNotRegistered(_employeeAddress);
        }

        _employees[_employeeAddress].isActive = false;
        emit EmployeeRemoved(_employeeAddress);
        ICompanyRegistry(factory).removeEmployeeRecord(_employeeAddress);
    }

    /// @notice Get the display name of an employee
    /// @param _employeeAddress The employee address
    /// @return name The stored name (empty string if not registered)
    function getEmployeeName(address _employeeAddress) external view returns (string memory) {
        return _employees[_employeeAddress].name;
    }

    /// @notice Update an employee's display name (admin-only)
    /// @param _employeeAddress The employee address
    /// @param _name The new display name
    /// @dev Only DEFAULT_ADMIN_ROLE (the company admin) can update employee names.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    ///      No factory sync needed: the employee stays in the same company and
    ///      the routing index is unchanged.
    function updateEmployeeName(address _employeeAddress, string calldata _name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_employees[_employeeAddress].isActive) {
            revert EmployeeNotRegistered(_employeeAddress);
        }

        _employees[_employeeAddress].name = _name;
    }

    /// @notice Check whether an address is registered as an employee
    /// @param _employeeAddress The address to check
    /// @return true if the address is registered to any company
    function isEmployee(address _employeeAddress) external view returns (bool) {
        return _employees[_employeeAddress].isActive;
    }

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Functions
    // ══════════════════════════════════════════════════════

    /// @notice Recognize an employee by minting a Kudos NFT
    /// @param _employeeAddress The employee address (must be an active employee)
    /// @param uri Metadata URI for the Kudos NFT
    /// @return tokenId The ID of the minted token
    /// @dev Only MINTER_ROLE holders (granted by the company admin) can mint.
    ///      Reverts with EmployeeNotRegistered if the employee is not active.
    ///      This is the ONLY mint path.
    function recognize(address _employeeAddress, string calldata uri) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (!_employees[_employeeAddress].isActive) {
            revert EmployeeNotRegistered(_employeeAddress);
        }

        tokenId = nft57b.safeMint(_employeeAddress, uri);

        emit Recognized(tokenId, _employeeAddress);

        return tokenId;
    }

    /// @notice Get this Company's per-claim BonusReward amount
    /// @return The reward amount (in wei) configured for this Company
    /// @dev Delegates to the CompanyRegistry factory — the factory is the
    ///      source of truth for the per-company reward amount (spec C1.10).
    ///      Reads factory.companyRewardAmount(address(this)); returns 0 for
    ///      non-companies, which cannot happen here since the factory
    ///      (immutable msg.sender) is this Company's deployer.
    function rewardAmount() external view returns (uint256) {
        return ICompanyRegistry(factory).companyRewardAmount(address(this));
    }

    /// @notice Set this Company's per-claim BonusReward amount (admin-only)
    /// @param amount_ The reward amount (in wei, e.g. 100 * 10^18)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin). Forwards
    ///      to the CompanyRegistry factory, which emits
    ///      CompanyRewardAmountUpdated (spec C1.10).
    function setRewardAmount(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ICompanyRegistry(factory).setCompanyRewardAmount(amount_);
    }

    // ══════════════════════════════════════════════════════
    //  Minter Role Management
    // ══════════════════════════════════════════════════════

    /// @notice Grant MINTER_ROLE to an employee of the caller's company
    /// @param _employeeAddress The employee address to grant minter rights to
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin).
    ///      Reverts with EmployeeNotRegistered if the employee is not active
    ///      (active employees only, spec C1.9).
    function grantMinterRole(address _employeeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_employees[_employeeAddress].isActive) {
            revert EmployeeNotRegistered(_employeeAddress);
        }
        _grantRole(MINTER_ROLE, _employeeAddress);
        emit MinterRoleGranted(_employeeAddress);
    }

    /// @notice Revoke MINTER_ROLE from an employee
    /// @param _employeeAddress The employee address to revoke minter rights from
    /// @dev Only callable by DEFAULT_ADMIN_ROLE (the company admin).
    ///      Reverts with EmployeeNotRegistered if the employee is not active
    ///      (active employees only, spec C1.9).
    function revokeMinterRole(address _employeeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_employees[_employeeAddress].isActive) {
            revert EmployeeNotRegistered(_employeeAddress);
        }
        _revokeRole(MINTER_ROLE, _employeeAddress);
        emit MinterRoleRevoked(_employeeAddress);
    }

    /// @notice Check whether an address holds MINTER_ROLE
    /// @param account The address to check
    /// @return true if the address has MINTER_ROLE
    function hasMinterRole(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

}
