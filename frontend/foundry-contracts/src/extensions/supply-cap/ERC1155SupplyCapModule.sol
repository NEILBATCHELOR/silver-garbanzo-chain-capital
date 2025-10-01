// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC1155SupplyCapModule.sol";
import "./storage/SupplyCapStorage.sol";

/**
 * @title ERC1155SupplyCapModule
 * @notice Supply cap management system for ERC-1155 tokens
 * @dev Separate module to avoid stack depth in master contracts
 */
contract ERC1155SupplyCapModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1155SupplyCapModule,
    SupplyCapStorage
{
    // ============ Roles ============
    bytes32 public constant SUPPLY_MANAGER_ROLE = keccak256("SUPPLY_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize supply cap module
     * @param admin Admin address
     * @param globalCap_ Initial global cap (0 = no cap)
     */
    function initialize(
        address admin,
        uint256 globalCap_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SUPPLY_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _globalCap = globalCap_;
    }
    
    // ============ Supply Cap Management ============
    
    function setMaxSupply(uint256 tokenId, uint256 maxSupply) 
        external 
        onlyRole(SUPPLY_MANAGER_ROLE) 
    {
        if (_supplyLocked[tokenId]) revert SupplyLocked(tokenId);
        
        // Cannot set max supply below current supply
        if (maxSupply > 0 && maxSupply < _currentSupply[tokenId]) {
            revert InvalidMaxSupply(tokenId);
        }
        
        _maxSupply[tokenId] = maxSupply;
        emit MaxSupplySet(tokenId, maxSupply);
    }
    
    function getMaxSupply(uint256 tokenId) external view returns (uint256) {
        return _maxSupply[tokenId];
    }
    
    function getCurrentSupply(uint256 tokenId) external view returns (uint256) {
        return _currentSupply[tokenId];
    }
    
    function getRemainingSupply(uint256 tokenId) external view returns (uint256) {
        uint256 max = _maxSupply[tokenId];
        if (max == 0) return 0; // Unlimited
        
        uint256 current = _currentSupply[tokenId];
        return max > current ? max - current : 0;
    }
    
    function canMint(uint256 tokenId, uint256 amount) external view returns (bool) {
        uint256 max = _maxSupply[tokenId];
        if (max == 0) return true; // Unlimited
        
        uint256 newTotal = _currentSupply[tokenId] + amount;
        if (newTotal > max) return false;
        
        // Check global cap
        if (_globalCap > 0) {
            uint256 newGlobalTotal = _totalGlobalSupply + amount;
            if (newGlobalTotal > _globalCap) return false;
        }
        
        return true;
    }
    
    // ============ Global Cap ============
    
    function setGlobalCap(uint256 cap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _globalCap = cap;
        emit GlobalCapSet(cap);
    }
    
    function getGlobalCap() external view returns (uint256) {
        return _globalCap;
    }
    
    function getTotalGlobalSupply() external view returns (uint256) {
        return _totalGlobalSupply;
    }
    
    // ============ Supply Tracking ============
    
    function trackSupplyIncrease(uint256 tokenId, uint256 amount) external {
        // Note: In production, add access control to only allow token contract
        
        uint256 max = _maxSupply[tokenId];
        if (max > 0) {
            uint256 newTotal = _currentSupply[tokenId] + amount;
            if (newTotal > max) {
                revert MaxSupplyExceeded(tokenId, amount, max - _currentSupply[tokenId]);
            }
        }
        
        // Check global cap
        if (_globalCap > 0) {
            uint256 newGlobalTotal = _totalGlobalSupply + amount;
            if (newGlobalTotal > _globalCap) {
                revert GlobalCapExceeded(amount, _globalCap - _totalGlobalSupply);
            }
        }
        
        _currentSupply[tokenId] += amount;
        _totalGlobalSupply += amount;
        emit SupplyIncreased(tokenId, amount, _currentSupply[tokenId]);
    }
    
    function trackSupplyDecrease(uint256 tokenId, uint256 amount) external {
        // Note: In production, add access control to only allow token contract
        
        _currentSupply[tokenId] -= amount;
        _totalGlobalSupply -= amount;
        emit SupplyDecreased(tokenId, amount, _currentSupply[tokenId]);
    }
    
    // ============ Supply Locking ============
    
    function lockSupplyCap(uint256 tokenId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _supplyLocked[tokenId] = true;
    }
    
    function isSupplyLocked(uint256 tokenId) external view returns (bool) {
        return _supplyLocked[tokenId];
    }
    
    // ============ Batch Operations ============
    
    function setBatchMaxSupplies(
        uint256[] memory tokenIds,
        uint256[] memory maxSupplies
    ) external onlyRole(SUPPLY_MANAGER_ROLE) {
        require(tokenIds.length == maxSupplies.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 maxSupply = maxSupplies[i];
            
            if (_supplyLocked[tokenId]) revert SupplyLocked(tokenId);
            
            if (maxSupply > 0 && maxSupply < _currentSupply[tokenId]) {
                revert InvalidMaxSupply(tokenId);
            }
            
            _maxSupply[tokenId] = maxSupply;
            emit MaxSupplySet(tokenId, maxSupply);
        }
    }
    
    function getBatchSupplyInfo(uint256[] memory tokenIds)
        external
        view
        returns (
            uint256[] memory maxSupplies,
            uint256[] memory currentSupplies,
            uint256[] memory remainingSupplies
        )
    {
        maxSupplies = new uint256[](tokenIds.length);
        currentSupplies = new uint256[](tokenIds.length);
        remainingSupplies = new uint256[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            maxSupplies[i] = _maxSupply[tokenId];
            currentSupplies[i] = _currentSupply[tokenId];
            
            if (_maxSupply[tokenId] == 0) {
                remainingSupplies[i] = 0; // Unlimited
            } else {
                remainingSupplies[i] = _maxSupply[tokenId] > _currentSupply[tokenId] 
                    ? _maxSupply[tokenId] - _currentSupply[tokenId] 
                    : 0;
            }
        }
        
        return (maxSupplies, currentSupplies, remainingSupplies);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
