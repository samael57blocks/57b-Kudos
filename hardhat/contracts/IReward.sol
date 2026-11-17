// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReward — Reward Token Interface
/// @notice Common interface for reward tokens (BonusReward and RecognitionToken)
/// @dev Both emitReward and claimReward must be implemented by reward tokens
interface IReward {
    /// @notice Emit (mint) a reward to a recipient
    /// @param to Recipient address
    /// @param amount Amount of reward (ignored for RecognitionToken)
    /// @param uri Metadata URI (ignored for BonusReward)
    /// @dev Only callable by MINTER_ROLE. uri is used by RecognitionToken for metadata.
    function emitReward(address to, uint256 amount, string calldata uri) external;

    /// @notice Claim the reward (burn for redeemable tokens, revert for permanent)
    /// @dev Public — any balance holder can call. For RecognitionToken this always reverts.
    function claimReward() external;
}
