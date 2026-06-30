// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title INFT57B — 57Blocks Kudos NFT Interface
/// @notice Minimal interface for cross-contract role management, minting, and claiming
interface INFT57B {
    /// @notice Mint a new NFT to `to` with the given URI
    /// @param to Recipient address
    /// @param uri Token metadata URI
    /// @return tokenId The ID of the newly minted token
    function safeMint(address to, string calldata uri) external returns (uint256);

    /// @notice Claim (burn) a token by tokenId
    /// @param tokenId The ID of the token to claim
    /// @dev Caller must be the token owner
    function claim(uint256 tokenId) external;

    /// @notice Grant a role to an account
    function grantRole(bytes32 role, address account) external;

    /// @notice Revoke a role from an account
    function revokeRole(bytes32 role, address account) external;

    /// @notice Returns the identifier of the MINTER_ROLE
    /// @return bytes32 The role hash
    function MINTER_ROLE() external view returns (bytes32);
}
