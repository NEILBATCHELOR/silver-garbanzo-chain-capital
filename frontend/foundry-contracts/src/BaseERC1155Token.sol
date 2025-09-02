// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BaseERC1155Token
 * @notice A configurable ERC1155 multi-token contract with optional features
 */
contract BaseERC1155Token is ERC1155, Ownable, ERC1155Supply {
    using Strings for uint256;

    // Token type configuration
    struct TokenTypeConfig {
        uint256 maxSupply; // 0 means no cap
        uint256 mintPrice; // Price per token in wei
        bool exists;
        string uri;
    }

    // Contract configuration
    struct TokenConfig {
        string name;
        string symbol;
        string baseURI;
        bool transfersPaused;
        bool mintingEnabled;
        bool burningEnabled;
        bool publicMinting;
        address initialOwner;
    }

    // State variables
    TokenConfig public config;
    uint256 public currentTokenType;
    uint256 public totalBurned;
    bool public transfersPaused;
    mapping(uint256 => TokenTypeConfig) public tokenTypes;
    mapping(address => bool) public minters;

    // Events
    event TokensPaused();
    event TokensUnpaused();
    event TokenTypeBurned(uint256 indexed tokenType, uint256 amount);
    event TokenTypeCreated(uint256 indexed tokenType, uint256 maxSupply, uint256 mintPrice, string uri);
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
    error TokenTypeNotExists();
    error InsufficientBalance();
    error ArrayLengthMismatch();

    modifier onlyMinter() {
        if (!minters[msg.sender] && msg.sender != owner()) {
            revert NotMinter();
        }
        _;
    }

    constructor(TokenConfig memory _config) 
        ERC1155(_config.baseURI) 
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
     * @notice Create a new token type
     * @param maxSupply Maximum supply for this token type (0 = unlimited)
     * @param mintPrice Price to mint this token type
     * @param tokenURI URI for this token type's metadata
     */
    function createTokenType(
        uint256 maxSupply,
        uint256 mintPrice,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        currentTokenType++;
        
        tokenTypes[currentTokenType] = TokenTypeConfig({
            maxSupply: maxSupply,
            mintPrice: mintPrice,
            exists: true,
            uri: tokenURI
        });

        emit TokenTypeCreated(currentTokenType, maxSupply, mintPrice, tokenURI);
        return currentTokenType;
    }

    /**
     * @notice Mint tokens of a specific type
     * @param to Address to mint tokens to
     * @param tokenType Token type to mint
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 tokenType, uint256 amount) external payable onlyMinter {
        if (!config.mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        if (!tokenTypes[tokenType].exists) revert TokenTypeNotExists();
        
        TokenTypeConfig memory tokenTypeConfig = tokenTypes[tokenType];
        
        // Check max supply if set
        if (tokenTypeConfig.maxSupply > 0 && totalSupply(tokenType) + amount > tokenTypeConfig.maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check payment if required
        uint256 totalPrice = tokenTypeConfig.mintPrice * amount;
        if (totalPrice > 0 && msg.value < totalPrice) {
            revert InsufficientPayment();
        }

        _mint(to, tokenType, amount, "");
    }

    /**
     * @notice Batch mint different token types
     * @param to Address to mint tokens to
     * @param tokenTypeIds Array of token types to mint
     * @param amounts Array of amounts to mint for each token type
     */
    function mintBatch(
        address to,
        uint256[] memory tokenTypeIds,
        uint256[] memory amounts
    ) external payable onlyMinter {
        if (!config.mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        if (tokenTypeIds.length != amounts.length) revert ArrayLengthMismatch();

        uint256 totalPrice = 0;
        
        for (uint256 i = 0; i < tokenTypeIds.length; i++) {
            uint256 tokenType = tokenTypeIds[i];
            uint256 amount = amounts[i];
            
            if (!tokenTypes[tokenType].exists) revert TokenTypeNotExists();
            
            TokenTypeConfig memory tokenTypeConfig = tokenTypes[tokenType];
            
            // Check max supply if set
            if (tokenTypeConfig.maxSupply > 0 && totalSupply(tokenType) + amount > tokenTypeConfig.maxSupply) {
                revert MaxSupplyExceeded();
            }

            totalPrice += tokenTypeConfig.mintPrice * amount;
        }

        // Check total payment
        if (totalPrice > 0 && msg.value < totalPrice) {
            revert InsufficientPayment();
        }

        _mintBatch(to, tokenTypeIds, amounts, "");
    }

    /**
     * @notice Public minting function (if enabled)
     * @param tokenType Token type to mint
     * @param amount Amount of tokens to mint
     */
    function publicMint(uint256 tokenType, uint256 amount) external payable {
        if (!config.publicMinting) revert MintingDisabled();
        if (!config.mintingEnabled) revert MintingDisabled();
        if (!tokenTypes[tokenType].exists) revert TokenTypeNotExists();
        
        TokenTypeConfig memory tokenTypeConfig = tokenTypes[tokenType];
        
        // Check max supply if set
        if (tokenTypeConfig.maxSupply > 0 && totalSupply(tokenType) + amount > tokenTypeConfig.maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check payment if required
        uint256 totalPrice = tokenTypeConfig.mintPrice * amount;
        if (totalPrice > 0 && msg.value < totalPrice) {
            revert InsufficientPayment();
        }

        _mint(msg.sender, tokenType, amount, "");
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param tokenType Token type to burn
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 tokenType, uint256 amount) external {
        if (!config.burningEnabled) revert BurningDisabled();
        if (balanceOf(msg.sender, tokenType) < amount) revert InsufficientBalance();

        _burn(msg.sender, tokenType, amount);
        totalBurned += amount;
        emit TokenTypeBurned(tokenType, amount);
    }

    /**
     * @notice Burn tokens from a specific address (requires approval)
     * @param from Address to burn tokens from
     * @param tokenType Token type to burn
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 tokenType, uint256 amount) external {
        if (!config.burningEnabled) revert BurningDisabled();
        if (from == address(0)) revert ZeroAddress();
        if (!isApprovedForAll(from, msg.sender)) revert InsufficientBalance();

        _burn(from, tokenType, amount);
        totalBurned += amount;
        emit TokenTypeBurned(tokenType, amount);
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
        _setURI(baseURI);
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
     * @notice Override URI function to support per-token URIs
     */
    function uri(uint256 tokenType) public view override returns (string memory) {
        if (bytes(tokenTypes[tokenType].uri).length > 0) {
            return tokenTypes[tokenType].uri;
        }
        return string(abi.encodePacked(super.uri(tokenType), tokenType.toString()));
    }

    /**
     * @notice Override update function to add pause functionality
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        if (transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        
        super._update(from, to, ids, values);
    }

    /**
     * @notice Get token type information
     */
    function getTokenTypeInfo(uint256 tokenType) external view returns (
        uint256 maxSupply,
        uint256 mintPrice,
        uint256 currentSupply,
        bool exists,
        string memory tokenURI
    ) {
        TokenTypeConfig memory tokenTypeConfig = tokenTypes[tokenType];
        return (
            tokenTypeConfig.maxSupply,
            tokenTypeConfig.mintPrice,
            totalSupply(tokenType),
            tokenTypeConfig.exists,
            tokenTypeConfig.uri
        );
    }

    /**
     * @notice Get contract information
     */
    function getContractInfo() external view returns (
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        uint256 _currentTokenType,
        uint256 _totalBurned,
        bool _transfersPaused,
        bool _mintingEnabled,
        bool _burningEnabled,
        bool _publicMinting
    ) {
        return (
            config.name,
            config.symbol,
            config.baseURI,
            currentTokenType,
            totalBurned,
            transfersPaused,
            config.mintingEnabled,
            config.burningEnabled,
            config.publicMinting
        );
    }

    /**
     * @notice Get name (for compatibility)
     */
    function name() external view returns (string memory) {
        return config.name;
    }

    /**
     * @notice Get symbol (for compatibility)
     */
    function symbol() external view returns (string memory) {
        return config.symbol;
    }
}
