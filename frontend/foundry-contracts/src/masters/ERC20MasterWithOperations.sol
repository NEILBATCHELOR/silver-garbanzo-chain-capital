// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ERC20MasterWithOperations
 * @notice Complete ERC20 with lock/unlock/block/unblock operations
 * @dev For minimal proxy pattern deployment (95% gas savings)
 */
contract ERC20MasterWithOperations is 
    Initializable, 
    ERC20Upgradeable, 
    OwnableUpgradeable
{
    // State variables
    uint256 public maxSupply;
    bool public mintingEnabled;
    bool public burningEnabled;
    bool public transfersPaused;
    
    // Lock mechanism
    mapping(address => uint256) public lockedBalances;
    mapping(address => uint256) public lockExpiry;
    
    // Block mechanism
    mapping(address => bool) public blockedAddresses;
    
    // Events
    event TokensLocked(address indexed account, uint256 amount, uint256 until);
    event TokensUnlocked(address indexed account, uint256 amount);
    event AddressBlocked(address indexed account);
    event AddressUnblocked(address indexed account);
    
    // Errors
    error TransfersPaused();
    error MintingDisabled();
    error BurningDisabled();
    error MaxSupplyExceeded();
    error InsufficientUnlockedBalance();
    error AddressIsBlocked();
    error TokensStillLocked();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        uint256 _maxSupply,
        address _owner,
        bool _mintingEnabled,
        bool _burningEnabled
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Ownable_init(_owner);
        
        maxSupply = _maxSupply;
        mintingEnabled = _mintingEnabled;
        burningEnabled = _burningEnabled;
        
        if (_initialSupply > 0) {
            _mint(_owner, _initialSupply);
        }
    }
    
    // LOCK functionality
    function lockTokens(uint256 amount, uint256 duration) external {
        require(balanceOf(msg.sender) >= amount + lockedBalances[msg.sender], "Insufficient balance");
        
        lockedBalances[msg.sender] += amount;
        lockExpiry[msg.sender] = block.timestamp + duration;
        
        emit TokensLocked(msg.sender, amount, lockExpiry[msg.sender]);
    }
    
    // UNLOCK functionality
    function unlockTokens() external {
        require(block.timestamp >= lockExpiry[msg.sender], "Tokens still locked");
        
        uint256 amount = lockedBalances[msg.sender];
        lockedBalances[msg.sender] = 0;
        lockExpiry[msg.sender] = 0;
        
        emit TokensUnlocked(msg.sender, amount);
    }
    
    // BLOCK functionality
    function blockAddress(address account) external onlyOwner {
        blockedAddresses[account] = true;
        emit AddressBlocked(account);
    }
    
    // UNBLOCK functionality
    function unblockAddress(address account) external onlyOwner {
        blockedAddresses[account] = false;
        emit AddressUnblocked(account);
    }
    
    // Override transfer to check locks and blocks
    function _update(address from, address to, uint256 value) internal override {
        if (transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        
        if (blockedAddresses[from] || blockedAddresses[to]) {
            revert AddressIsBlocked();
        }
        
        if (from != address(0)) {
            uint256 availableBalance = balanceOf(from) - lockedBalances[from];
            if (availableBalance < value) {
                revert InsufficientUnlockedBalance();
            }
        }
        
        super._update(from, to, value);
    }
    
    // MINT functionality
    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintingEnabled) revert MintingDisabled();
        if (maxSupply > 0 && totalSupply() + amount > maxSupply) {
            revert MaxSupplyExceeded();
        }
        _mint(to, amount);
    }
    
    // BURN functionality
    function burn(uint256 amount) external {
        if (!burningEnabled) revert BurningDisabled();
        _burn(msg.sender, amount);
    }
    
    // Admin functions
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
    }
    
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
    }
}
