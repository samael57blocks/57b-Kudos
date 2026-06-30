// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MetadataBuilder} from "../MetadataBuilder.sol";

/// @title MetadataBuilderHelper
/// @notice Test helper contract that wraps MetadataBuilder library calls
/// @dev Enables hardhat-toolbox-viem to deploy and call library functions via a contract
contract MetadataBuilderHelper {
    /// @notice Delegates to MetadataBuilder.buildTokenURI for testing
    function buildTokenURI(
        string memory title,
        string memory description,
        string memory value,
        string memory date,
        string memory employeeName
    ) external pure returns (string memory) {
        return MetadataBuilder.buildTokenURI(title, description, value, date, employeeName);
    }
}
