// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title MetadataBuilder
/// @notice Pure library for constructing Base64-encoded ERC-721 metadata URIs
/// @dev Follows OpenSea metadata standard: name, description, image, attributes
library MetadataBuilder {
    /// @notice Build a Base64 data URI containing JSON metadata
    /// @param title The NFT title (maps to "name" in JSON)
    /// @param description The NFT description
    /// @param value The recognition value amount (maps to "Value" attribute)
    /// @param date The recognition date (maps to "Date" attribute)
    /// @param employeeName The employee name (maps to "Employee" attribute)
    /// @return data URI string in format: data:application/json;base64,<base64>
    function buildTokenURI(
        string memory title,
        string memory description,
        string memory value,
        string memory date,
        string memory employeeName
    ) external pure returns (string memory) {
        string memory json = string.concat(
            '{"name":"',
            title,
            '",',
            '"description":"',
            description,
            '",',
            '"image":"",',
            '"attributes":[',
            '{"trait_type":"Value","value":"',
            value,
            '"},',
            '{"trait_type":"Date","value":"',
            date,
            '"},',
            '{"trait_type":"Employee","value":"',
            employeeName,
            '"}',
            "]}"
        );

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }
}