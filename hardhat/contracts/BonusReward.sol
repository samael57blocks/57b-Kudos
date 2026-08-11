// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IReward.sol";

/// @notice Revert when caller has no balance to claim
error NothingToClaim(address caller);

/// @title BonusReward — 57Blocks Bonus Token
/// @notice ERC-20 reward token minted by CompanyRegistry when an NFT57B is claimed.
///         Holders can burn their entire balance via claimReward().
/// @dev Implements IReward. Only MINTER_ROLE can call emitReward().
///      claimReward() is public — any balance holder can burn.
contract BonusReward is ERC20, AccessControl, IReward {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Emitted when a caller claims (burns) their bonus tokens
    /// @param claimer The address that claimed
    /// @param amount The amount of tokens burned
    event RewardClaimed(address indexed claimer, uint256 amount);

    /// @notice Emitted when new bonus tokens are minted
    /// @param to The recipient address
    /// @param amount The amount minted
    /// @param rewardContract The address of this contract
    event RewardEmitted(address indexed to, uint256 amount, address indexed rewardContract);

    /// @notice Initializes the BonusReward contract
    /// @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE
    constructor(address defaultAdmin) ERC20("57Blocks Bonus", "57BB") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /// @notice Mint bonus tokens to a recipient
    /// @param to Recipient address
    /// @param amount Amount of tokens to mint
    /// @dev Only callable by MINTER_ROLE. The uri parameter (from IReward) is unused.
    function emitReward(
        address to,
        uint256 amount,
        string calldata /* uri */
    ) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit RewardEmitted(to, amount, address(this));
    }

    /// @notice Claim (burn) the caller's entire bonus balance
    /// @dev Reverts with NothingToClaim if balance is 0.
    ///      Burns balanceOf(msg.sender) tokens atomically.
    function claimReward() external {
        uint256 balance = balanceOf(msg.sender);
        if (balance == 0) {
            revert NothingToClaim(msg.sender);
        }
        _burn(msg.sender, balance);
        emit RewardClaimed(msg.sender, balance);
    }

    /// @notice Check if a given interface is supported
    /// @param interfaceId The interface identifier (ERC-165)
    /// @return true if the interface is supported
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return interfaceId == type(IReward).interfaceId || super.supportsInterface(interfaceId);
    }
}
