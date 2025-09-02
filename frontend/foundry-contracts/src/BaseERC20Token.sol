// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title BaseERC20Token
 * @notice A configurable ERC20 token with optional features
 * @dev Features can be enabled/disabled during deployment via constructor parameters
 */
contract BaseERC20Token is ERC20, Ownable, ERC20Permit, ERC20Votes {
    // Token configuration structure
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        uint256 maxSupply; // 0 means no cap
        bool transfersPaused;
        bool mintingEnabled;
        bool burningEnabled;
        bool votingEnabled;
        address initialOwner;
    }

    // State variables
    TokenConfig public config;
    uint256 public totalBurned;
    bool public transfersPaused;

    // Events
    event TokensPaused();
    event TokensUnpaused();
    event TokensBurned(address indexed from, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    // Errors
    error TransfersPaused();
    error MintingDisabled();
    error BurningDisabled();
    error MaxSupplyExceeded();
    error ZeroAddress();
    error InsufficientBalance();

    constructor(TokenConfig memory _config) 
        ERC20(_config.name, _config.symbol) 
        Ownable(_config.initialOwner)
        ERC20Permit(_config.name)
    {
        if (_config.initialOwner == address(0)) revert ZeroAddress();
        
        config = _config;
        transfersPaused = _config.transfersPaused;

        // Mint initial supply if specified
        if (_config.initialSupply > 0) {
            _mint(_config.initialOwner, _config.initialSupply);
        }

        // Transfer ownership to specified owner
        if (_config.initialOwner != msg.sender) {
            _transferOwnership(_config.initialOwner);
        }
    }

    /**
     * @notice Returns the number of decimals for the token
     */
    function decimals() public view virtual override returns (uint8) {
        return config.decimals;
    }

    /**
     * @notice Mint tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (!config.mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        
        // Check max supply if set
        if (config.maxSupply > 0 && totalSupply() + amount > config.maxSupply) {
            revert MaxSupplyExceeded();
        }

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        if (!config.burningEnabled) revert BurningDisabled();
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();

        _burn(msg.sender, amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Burn tokens from a specified address (requires allowance)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) external {
        if (!config.burningEnabled) revert BurningDisabled();
        if (from == address(0)) revert ZeroAddress();

        uint256 currentAllowance = allowance(from, msg.sender);
        if (currentAllowance < amount) revert InsufficientBalance();

        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        totalBurned += amount;
        emit TokensBurned(from, amount);
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
     * @notice Override transfer function to add pause functionality
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Votes) {
        if (transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        
        super._update(from, to, value);
    }

    /**
     * @notice Get the current voting power of an account
     * @param account Address to check voting power for
     */
    function getVotingPower(address account) external view returns (uint256) {
        return config.votingEnabled ? getVotes(account) : 0;
    }

    /**
     * @notice Override nonces for ERC20Permit compatibility
     */
    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /**
     * @notice Get token information
     */
    function getTokenInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _totalBurned,
        bool _transfersPaused,
        bool _mintingEnabled,
        bool _burningEnabled,
        bool _votingEnabled
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            config.maxSupply,
            totalBurned,
            transfersPaused,
            config.mintingEnabled,
            config.burningEnabled,
            config.votingEnabled
        );
    }
}
