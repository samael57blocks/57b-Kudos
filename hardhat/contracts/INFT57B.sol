// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title INFT57B — 57Blocks Kudos NFT Interface
/// @notice Minimal interface for minting and claiming via CompanyRegistry
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
}
