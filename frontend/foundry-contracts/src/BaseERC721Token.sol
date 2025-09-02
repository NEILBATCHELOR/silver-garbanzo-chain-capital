// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BaseERC721Token
 * @notice A configurable ERC721 NFT token with optional features
 */
contract BaseERC721Token is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // Token configuration structure
    struct TokenConfig {
        string name;
        string symbol;
        string baseURI;
        uint256 maxSupply; // 0 means no cap
        uint256 mintPrice; // Price per token in wei
        bool transfersPaused;
        bool mintingEnabled;
        bool burningEnabled;
        bool publicMinting;
        address initialOwner;
    }

    // State variables
    TokenConfig public config;
    uint256 public currentTokenId;
    uint256 public totalBurned;
    bool public transfersPaused;
    mapping(address => bool) public minters;

    // Events
    event TokensPaused();
    event TokensUnpaused();
    event TokenBurned(uint256 indexed tokenId);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BaseURIUpdated(string baseURI);

    // Errors
    error TransfersPaused();
    error MintingDisabled();
    error BurningDisabled();
    error MaxSupplyExceeded();
    error ZeroAddress();
    error InsufficientPayment();
    error NotMinter();
    error TokenNotExists();
    error NotOwnerOrApproved();

    modifier onlyMinter() {
        if (!minters[msg.sender] && msg.sender != owner()) {
            revert NotMinter();
        }
        _;
    }

    constructor(TokenConfig memory _config) 
        ERC721(_config.name, _config.symbol) 
        Ownable(_config.initialOwner)
    {
        if (_config.initialOwner == address(0)) revert ZeroAddress();
        
        config = _config;
        transfersPaused = _config.transfersPaused;

        // Set the deployer as initial minter
        minters[_config.initialOwner] = true;

        // Transfer ownership to specified owner
        if (_config.initialOwner != msg.sender) {
            _transferOwnership(_config.initialOwner);
        }
    }

    /**
     * @notice Mint a new NFT to specified address
     * @param to Address to mint the NFT to
     */
    function mint(address to) external payable onlyMinter returns (uint256) {
        if (!config.mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        
        // Check max supply if set
        if (config.maxSupply > 0 && currentTokenId + 1 > config.maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check payment if required
        if (config.mintPrice > 0 && msg.value < config.mintPrice) {
            revert InsufficientPayment();
        }

        currentTokenId++;
        _safeMint(to, currentTokenId);

        return currentTokenId;
    }

    /**
     * @notice Public minting function (if enabled)
     * @param to Address to mint the NFT to
     */
    function publicMint(address to) external payable returns (uint256) {
        if (!config.publicMinting) revert MintingDisabled();
        if (!config.mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        
        // Check max supply if set
        if (config.maxSupply > 0 && currentTokenId + 1 > config.maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check payment if required
        if (config.mintPrice > 0 && msg.value < config.mintPrice) {
            revert InsufficientPayment();
        }

        currentTokenId++;
        _safeMint(to, currentTokenId);

        return currentTokenId;
    }

    /**
     * @notice Burn an NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        if (!config.burningEnabled) revert BurningDisabled();
        
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert TokenNotExists();
        if (!_isAuthorized(owner, msg.sender, tokenId)) revert NotOwnerOrApproved();

        _burn(tokenId);
        totalBurned++;
        emit TokenBurned(tokenId);
    }

    /**
     * @notice Add a minter address
     * @param minter Address to add as minter
     */
    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @notice Remove a minter address
     * @param minter Address to remove as minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @notice Set base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        config.baseURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @notice Pause all token transfers
     */
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
        emit TokensPaused();
    }

    /**
     * @notice Unpause token transfers
     */
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
        emit TokensUnpaused();
    }

    /**
     * @notice Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }

    /**
     * @notice Get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return config.baseURI;
    }

    /**
     * @notice Override transfer function to add pause functionality
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        if (transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override increase balance for enumerable
     */
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @notice Override token URI
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Override supports interface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Get token information
     */
    function getTokenInfo() external view returns (
        string memory _name,
        string memory _symbol,
        string memory _baseURIValue,
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _currentTokenId,
        uint256 _totalBurned,
        uint256 _mintPrice,
        bool _transfersPaused,
        bool _mintingEnabled,
        bool _burningEnabled,
        bool _publicMinting
    ) {
        return (
            name(),
            symbol(),
            _baseURI(),
            totalSupply(),
            config.maxSupply,
            currentTokenId,
            totalBurned,
            config.mintPrice,
            transfersPaused,
            config.mintingEnabled,
            config.burningEnabled,
            config.publicMinting
        );
    }
}
