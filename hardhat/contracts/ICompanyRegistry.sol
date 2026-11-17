// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICompanyRegistry — CompanyRegistry Callback Interface
/// @notice Interface that NFT57B calls after a successful claim to trigger reward minting
interface ICompanyRegistry {
    /// @notice Called by NFT57B after a token is claimed (burned)
    /// @param employee The address that claimed the token
    /// @param tokenId The ID of the claimed token
    /// @param uri The metadata URI of the claimed token
    function onClaimed(address employee, uint256 tokenId, string calldata uri) external;
}
