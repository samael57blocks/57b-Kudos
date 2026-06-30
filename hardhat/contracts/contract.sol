// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importamos los contratos necesarios de OpenZeppelin
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // revisar
import "@openzeppelin/contracts/access/Ownable.sol"; // revisar

contract RecognitionMint is ERC721URIStorage, Ownable {

    // ==================== Types ====================

    struct Employee {
        string name;
        address wallet; 
    }

    struct Recognition {
        uint256 tokenId;
        string title;
        address owner;
        string uri;
    }

    // ==================== Events ====================

    event RecognitionCreated(
        uint256 indexed id,
        address indexed owner,
        string title
    );

    event RecognitionSent(
        uint256 indexed id,
        address indexed oldOwner,
        address indexed newOwner
    );

    event EmployeeRegistered(address indexed owner, string name);

    // ==================== State ====================
    uint256 private _nextTokenId;
    mapping(uint256 => Recognition) private _recognitions;
    mapping(address => Employee) private _owners;

    // The constructor define the token`s Name and Symbol
    // also include the minter address (owner)
    constructor(address initialOwner) 
        ERC721("57Blocks Recognitions", "NBR") 
        Ownable(initialOwner) 
    {}

    /*
     * @dev Function to create (mint) new NFT 
     * @param to employee address.
     * @param uri link to NFT`s Metadata (IPFS link with the Imagege & Description).
     */
    function createNFT(string memory uri, string memory title, address owner) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        
        // assign metadata (image, atributes)
        _setTokenURI(tokenId, uri);
        _recognitions[tokenId] = Recognition({
            tokenId: tokenId,
            title: title,
            owner: owner,
            uri: uri
        });

        return tokenId;
    }

    function burnNFT(address owner, uint256 tokenId) public onlyOwner returns (bool) {
        _burn(tokenId);
        delete _recognitions[tokenId];
    }

    /*
     * @dev Function to send a NFT to employee
     * @param to employee address.
     * @param uri link to NFT`s Metadata (IPFS link with the Image & Description).
     */
    function SendNFT(address to, uint256 tokenId) public {
        // Mina el token directamente a la dirección del receptor
        _safeMint(to, tokenId);
        _recognitions[tokenId] = Recognition({
            tokenId: tokenId,
            title: "",
            owner: to,
            uri: ""
        });
    }
}