// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INFT57B.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Company — 57Blocks Kudos Company
/// @notice A standalone company contract deployed by the CompanyRegistry factory.
///         The company admin (DEFAULT_ADMIN_ROLE) manages employees and grants
///         MINTER_ROLE to active employees who mint Kudos via recognize().
/// @dev Factory pattern: CompanyRegistry (immutable factory) is the sole deployer;
///      the NFT57B minting contract is pinned at construction (immutable nft57b);
///      the company admin is granted DEFAULT_ADMIN_ROLE in the constructor.
///      Company implements NO onClaimed — the factory orchestrates claims (2 hops).
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

    /// @notice Emitted when a minter mints a Kudos NFT
    event KudosMinted(uint256 indexed tokenId, uint256 indexed companyId, address indexed employee, address minter);

    /// @notice Revert when caller does not hold MINTER_ROLE
    error OnlyMinter(address caller);

    /// @notice Revert when minter and employee belong to different companies
    error NotSameCompany(uint256 minterCompany, uint256 employeeCompany);

    // ══════════════════════════════════════════════════════
    //  Reward Orchestration Errors
    // ══════════════════════════════════════════════════════

    /// @notice Revert when caller is not the admin of the employee's company
    error OnlyCompanyAdmin(address caller, uint256 companyId);

    /// @notice Revert when reward contracts (BonusReward or RecognitionToken) are not set
    error RewardContractsNotSet();

    /// @notice Revert when onClaimed is called by anyone other than NFT57B
    error NotNFT57B(address caller);

    /// @notice Amount of BonusReward tokens minted per claim
    uint256 public rewardAmount;

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
    }

    /// @notice Remove an employee from their company
    /// @param _employeeAddress The employee address to remove
    /// @dev Only DEFAULT_ADMIN_ROLE or the company admin. Reverts if not registered.
    function removeEmployee(address _employeeAddress) external {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");

        _employees[_employeeAddress].isActive = false;
        emit EmployeeRemoved(_employeeAddress);
    }

    /// @notice Get the display name of an employee
    /// @param _employeeAddress The employee address
    /// @return name The stored name (empty string if not registered)
    function getEmployeeName(address _employeeAddress) external view returns (string memory) {
        return _employees[_employeeAddress].name;
    }

    /// @notice Update an employee's display name
    /// @param _employeeAddress The employee address
    /// @param _name The new display name
    /// @dev Only DEFAULT_ADMIN_ROLE or the company admin can update.
    function updateEmployeeName(address _employeeAddress, string calldata _name) external {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");

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
    /// @param _employeeAddress The employee address (must be registered to a company)
    /// @param uri Metadata URI for the Kudos NFT
    /// @return tokenId The ID of the minted token
    /// @dev Only callable by the admin of the company the employee belongs to.
    function recognize(address _employeeAddress, string calldata uri) external returns (uint256 tokenId) {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");

        tokenId = nft57b.safeMint(_employeeAddress, uri);

        emit Recognized(tokenId, _employeeAddress);
    }

    /// @notice Set the amount of BonusReward tokens minted per claim
    /// @param amount_ The reward amount (in wei, e.g. 100 * 10^18)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function setRewardAmount(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardAmount = amount_;
    }

    /// @notice Callback invoked by NFT57B after a successful claim
    /// @param _employeeAddress The address that claimed the token
    /// @param uri The metadata URI of the claimed token
    /// @dev Only callable by the stored NFT57B contract. Uses ReentrancyGuard.
    ///      Mints BonusReward tokens and a RecognitionToken badge.
    ///      The tokenId parameter is unused (defined by ICompanyRegistry interface).
    /*function onClaimed(
        address _employeeAddress,
        string calldata uri
    ) external nonReentrant {
        if (_msgSender() != address(nft57b)) {
            revert NotNFT57B(_msgSender());
        }

        if (bonusReward == address(0) || recognitionToken == address(0)) {
            revert RewardContractsNotSet();
        }

        // Mint ERC-20 bonus tokens
        IReward(bonusReward).emitReward(_employeeAddress, rewardAmount, uri);

        // Mint ERC-721 recognition badge (amount=0 as RecognitionToken auto-increments)
        IReward(recognitionToken).emitReward(_employeeAddress, 0, uri);
    }*/

    // ══════════════════════════════════════════════════════
    //  Minter Role Management
    // ══════════════════════════════════════════════════════

    /// @notice Grant MINTER_ROLE to an employee of the caller's company
    /// @param _employeeAddress The employee address to grant minter rights to
    /// @dev Only callable by DEFAULT_ADMIN_ROLE or the company admin of the employee's company.
    function grantMinterRole(address _employeeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");
        _grantRole(MINTER_ROLE, _employeeAddress);
        emit MinterRoleGranted(_employeeAddress);
    }

    /// @notice Revoke MINTER_ROLE from an employee
    /// @param _employeeAddress The employee address to revoke minter rights from
    /// @dev Only callable by DEFAULT_ADMIN_ROLE or the company admin of the employee's company.
    function revokeMinterRole(address _employeeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");
        _revokeRole(MINTER_ROLE, _employeeAddress);
        emit MinterRoleRevoked(_employeeAddress);
    }

    /// @notice Check whether an address holds MINTER_ROLE
    /// @param account The address to check
    /// @return true if the address has MINTER_ROLE
    function hasMinterRole(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    /// @notice Mint a Kudos NFT to an employee (requires MINTER_ROLE, same company) (duplicated with recognize)
    /// @param _employeeAddress The employee address to mint to
    /// @param uri Metadata URI for the Kudos NFT
    /// @return tokenId The ID of the minted token
    /*function mintKudos(address _employeeAddress, string calldata uri) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(_employees[_employeeAddress].isActive, "The Employee is not active");

        tokenId = nft57b.safeMint(_employeeAddress, uri);
        emit KudosMinted(tokenId, employeeCompany, _employeeAddress, msg.sender);
    }*/
}
