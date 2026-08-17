// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICompanyRegistry} from "../interfaces/ICompanyRegistry.sol";

/// @title OnClaimedCaller
/// @notice Test-only helper that can call factory.onClaimed directly.
///         Used to test the RewardContractsNotSet path when the factory
///         was deployed with address(0) reward immutables (registerCompany
///         would fail trying to grantRole on zero addresses).
/// @dev This is NOT a production contract — lives in contracts/test/.
contract OnClaimedCaller {
    function callOnClaimed(
        address factory,
        address employee,
        uint256 tokenId,
        string calldata uri
    ) external {
        ICompanyRegistry(factory).onClaimed(employee, tokenId, uri);
    }
}
