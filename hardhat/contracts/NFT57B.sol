// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Emitted when a non-admin tries to transfer an NFT57B token between non-zero addresses
error TransferNotAllowed(uint256 tokenId, address from, address to);

/// @title NFT57B — 57Blocks Kudos Non-Transferable NFT
/// @notice Core ERC-721 token with non-transferable policy, role-based minting/burning, and pausable mint
/// @dev Combines ERC721URIStorage, ERC721Enumerable, AccessControl, and Pausable via OZ multi-inheritance.
///      The _update override enforces a non-transferable policy: only DEFAULT_ADMIN_ROLE can transfer.
///      safeMint is pausable; burn is NOT (admin recovery when paused).
contract NFT57B is ERC721URIStorage, ERC721Enumerable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINTER_ADMIN_ROLE = keccak256("MINTER_ADMIN_ROLE");

    uint256 private _nextTokenId;

    /// @notice Emitted when a new NFT is minted
    /// @param tokenId The ID of the minted token
    /// @param to The recipient address
    /// @param uri The token URI (metadata link)
    event NFTMinted(uint256 indexed tokenId, address indexed to, string uri);

    /// @notice Emitted when an NFT is burned
    /// @param tokenId The ID of the burned token
    /// @param from The owner at time of burn
    /// @param caller The address that initiated the burn
    event NFTBurned(uint256 indexed tokenId, address indexed from, address indexed caller);

    /// @notice Initializes the NFT57B contract
    /// @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE and MINTER_ADMIN_ROLE
    constructor(address defaultAdmin) ERC721("57Blocks Kudos", "57B") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ADMIN_ROLE, defaultAdmin);
        _setRoleAdmin(MINTER_ROLE, MINTER_ADMIN_ROLE);
    }

    /// @notice Mint a new NFT to `to` with the given URI
    /// @param to Recipient address
    /// @param uri Token metadata URI
    /// @return tokenId The ID of the newly minted token
    /// @dev Only callable by MINTER_ROLE. Reverts when paused.
    function safeMint(address to, string calldata uri) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        uint256 tokenId = _nextTokenId;
        unchecked {
            _nextTokenId++;
        }

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(tokenId, to, uri);
        return tokenId;
    }

    /// @notice Burn a token by tokenId
    /// @param tokenId The ID of the token to burn
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. NOT pausable — admin must be able to burn during pause.
    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address from = _ownerOf(tokenId);
        _burn(tokenId);
        emit NFTBurned(tokenId, from, _msgSender());
    }

    /// @notice Pause the contract, blocking safeMint
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause the contract, resuming safeMint
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ══════════════════════════════════════════════════════
    //  OVERRIDES: Diamond resolution for OZ multi-inheritance
    // ══════════════════════════════════════════════════════

    /// @notice Override _update to enforce non-transferable policy and admin auth bypass
    /// @dev If from != 0 && to != 0, the caller must have DEFAULT_ADMIN_ROLE.
    ///      When admin is calling, pass `from` as `auth` to bypass ERC721's approval check.
    /// @param to Destination address (0 for burn)
    /// @param tokenId Token being transferred/minted/burned
    /// @param auth Address authorizing the operation (from msg.sender in transferFrom)
    /// @return address The previous owner (from) before the update
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        // Non-admin cannot transfer between non-zero addresses
        if (from != address(0) && to != address(0) && !hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert TransferNotAllowed(tokenId, from, to);
        }

        // Admin bypass: when admin calls transferFrom, use `from` as `auth`
        // to skip ERC721's internal _checkAuthorized approval check
        if (hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            auth = from;
        }

        return super._update(to, tokenId, auth);
    }

    /// @notice Override _increaseBalance to resolve diamond between ERC721 and ERC721Enumerable
    /// @dev ERC721Enumerable overrides this to forbid batch mints (amount > 0 reverts)
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /// @notice Override tokenURI to resolve diamond between ERC721 and ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @notice Override supportsInterface for ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
