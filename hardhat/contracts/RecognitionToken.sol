// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IReward.sol";

/// @notice Revert when a caller tries to claim (burn) a permanent recognition token
error PermanentToken(uint256 tokenId);

/// @notice Revert when an employee already holds a recognition token
error AlreadyRecognized(address employee);

/// @title RecognitionToken — 57Blocks Kudos Permanent Recognition Badge
/// @notice Non-transferable, non-burnable ERC-721 minted when an NFT57B is claimed.
///         Each employee can hold at most one recognition badge.
/// @dev Implements IReward. Only MINTER_ROLE can call emitReward().
///      claimReward() always reverts — this token is permanent.
contract RecognitionToken is ERC721URIStorage, AccessControl, IReward {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    /// @notice Emitted when a new recognition badge is minted
    /// @param to The recipient address
    /// @param tokenId The ID of the minted badge
    /// @param uri The token metadata URI
    /// @param rewardContract The address of this contract
    event RewardEmitted(
        address indexed to,
        uint256 tokenId,
        string uri,
        address indexed rewardContract
    );

    /// @notice Initializes the RecognitionToken contract
    /// @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE
    /// @param name_ The ERC-721 token name
    /// @param symbol_ The ERC-721 token symbol
    constructor(
        address defaultAdmin,
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /// @notice Mint a recognition badge to an employee
    /// @param to Recipient address (must not already hold a badge)
    /// @param /* amount */ Ignored (token ID is auto-incremented)
    /// @param uri Metadata URI for the badge
    /// @dev Only callable by MINTER_ROLE. Reverts if employee already has a badge.
    function emitReward(
        address to,
        uint256 /* amount */,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) {
        if (balanceOf(to) > 0) {
            revert AlreadyRecognized(to);
        }

        uint256 tokenId = _nextTokenId;
        unchecked {
            _nextTokenId++;
        }

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit RewardEmitted(to, tokenId, uri, address(this));
    }

    /// @notice Always reverts — recognition badges are permanent and non-burnable
    /// @dev Overrides IReward.claimReward
    function claimReward() external pure {
        revert PermanentToken(0);
    }

    // ══════════════════════════════════════════════════════
    //  OVERRIDES: Non-transferable policy & diamond resolution
    // ══════════════════════════════════════════════════════

    /// @notice Override _update to enforce non-transferable AND non-burnable policy
    /// @dev Blocks ALL state changes after initial mint:
    ///      - from != 0 → anywhere → revert (transfers AND burns blocked)
    ///      - from == 0 && to == 0 → no-op (ignored by OZ)
    ///      - from == 0 && to != 0 → mint (allowed)
    /// @param to Destination address (0 for burn)
    /// @param tokenId Token being minted/transferred/burned
    /// @param auth Address authorizing the operation
    /// @return address The previous owner (from) before the update
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // Block ALL state changes after mint: no transfers, no burns
        if (from != address(0)) {
            revert PermanentToken(tokenId);
        }

        return super._update(to, tokenId, auth);
    }

    /// @notice Override tokenURI to resolve diamond between ERC721 and ERC721URIStorage
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @notice Override supportsInterface for ERC721, ERC721URIStorage, AccessControl, and IReward
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return
            interfaceId == _irewardInterfaceId() ||
            super.supportsInterface(interfaceId);
    }

    /// @notice Computes the IReward interface ID from its function selectors (ERC-165)
    /// @return bytes4 The XOR of emitReward and claimReward selectors
    function _irewardInterfaceId() private pure returns (bytes4) {
        return
            bytes4(keccak256("emitReward(address,uint256,string)")) ^
            bytes4(keccak256("claimReward()"));
    }
}
