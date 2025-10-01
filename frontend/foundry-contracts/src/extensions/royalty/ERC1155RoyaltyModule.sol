// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC1155RoyaltyModule.sol";
import "./storage/RoyaltyStorage.sol";

/**
 * @title ERC1155RoyaltyModule
 * @notice Modular EIP-2981 royalty system for ERC1155 multi-tokens
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Revenue Model:
 * - Per-token or collection-wide royalties
 * - Marketplace integration via EIP-2981 standard
 * - Typical: 2.5-10% royalty on resales
 * 
 * Gas Cost: ~2k per royalty check
 */
contract ERC1155RoyaltyModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1155RoyaltyModule,
    RoyaltyStorage
{
    // ============ Roles ============
    bytes32 public constant ROYALTY_MANAGER_ROLE = keccak256("ROYALTY_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    // EIP-2981 interface ID
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize royalty module
     * @param admin Admin address
     * @param defaultReceiver Default royalty receiver (can be zero address)
     * @param defaultFeeNumerator Default royalty percentage in basis points
     */
    function initialize(
        address admin,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROYALTY_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        if (defaultReceiver != address(0)) {
            _setDefaultRoyalty(defaultReceiver, defaultFeeNumerator);
        }
    }
    
    // ============ EIP-2981 Interface ============
    
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address, uint256)
    {
        RoyaltyInfo memory royalty = _tokenRoyaltyInfo[tokenId];
        
        if (royalty.receiver == address(0)) {
            royalty = _defaultRoyaltyInfo;
        }
        
        uint256 royaltyAmount = (salePrice * royalty.royaltyFraction) / _FEE_DENOMINATOR;
        return (royalty.receiver, royaltyAmount);
    }
    
    // ============ Default Royalty Management ============
    
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) 
        external 
        onlyRole(ROYALTY_MANAGER_ROLE) 
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    
    function deleteDefaultRoyalty() 
        external 
        onlyRole(ROYALTY_MANAGER_ROLE) 
    {
        delete _defaultRoyaltyInfo;
        emit DefaultRoyaltySet(address(0), 0);
    }
    
    function getDefaultRoyalty() 
        external 
        view 
        returns (address receiver, uint96 feeNumerator) 
    {
        return (_defaultRoyaltyInfo.receiver, _defaultRoyaltyInfo.royaltyFraction);
    }
    
    // ============ Per-Token Royalty Management ============
    
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(ROYALTY_MANAGER_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }
    
    function resetTokenRoyalty(uint256 tokenId) 
        external 
        onlyRole(ROYALTY_MANAGER_ROLE) 
    {
        delete _tokenRoyaltyInfo[tokenId];
        emit TokenRoyaltyReset(tokenId);
    }
    
    function getTokenRoyalty(uint256 tokenId)
        external
        view
        returns (
            address receiver,
            uint96 feeNumerator,
            bool hasCustom
        )
    {
        RoyaltyInfo memory royalty = _tokenRoyaltyInfo[tokenId];
        hasCustom = royalty.receiver != address(0);
        
        if (!hasCustom) {
            royalty = _defaultRoyaltyInfo;
        }
        
        return (royalty.receiver, royalty.royaltyFraction, hasCustom);
    }
    
    // ============ Batch Operations ============
    
    function setBatchTokenRoyalties(
        uint256[] memory tokenIds,
        address[] memory receivers,
        uint96[] memory feeNumerators
    ) external onlyRole(ROYALTY_MANAGER_ROLE) {
        require(
            tokenIds.length == receivers.length && 
            tokenIds.length == feeNumerators.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _setTokenRoyalty(tokenIds[i], receivers[i], feeNumerators[i]);
        }
    }
    
    function getBatchRoyaltyInfo(
        uint256[] memory tokenIds,
        uint256[] memory salePrices
    ) external view returns (
        address[] memory receivers,
        uint256[] memory royaltyAmounts
    ) {
        require(tokenIds.length == salePrices.length, "Length mismatch");
        
        receivers = new address[](tokenIds.length);
        royaltyAmounts = new uint256[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            RoyaltyInfo memory royalty = _tokenRoyaltyInfo[tokenIds[i]];
            
            if (royalty.receiver == address(0)) {
                royalty = _defaultRoyaltyInfo;
            }
            
            receivers[i] = royalty.receiver;
            royaltyAmounts[i] = (salePrices[i] * royalty.royaltyFraction) / _FEE_DENOMINATOR;
        }
        
        return (receivers, royaltyAmounts);
    }
    
    // ============ Internal Functions ============
    
    function _setDefaultRoyalty(address receiver, uint96 feeNumerator) internal {
        if (feeNumerator > _FEE_DENOMINATOR) {
            revert InvalidRoyaltyPercentage(feeNumerator);
        }
        if (receiver == address(0) && feeNumerator > 0) {
            revert InvalidReceiver();
        }
        
        _defaultRoyaltyInfo = RoyaltyInfo(receiver, feeNumerator);
        emit DefaultRoyaltySet(receiver, feeNumerator);
    }
    
    function _setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) internal {
        if (feeNumerator > _FEE_DENOMINATOR) {
            revert InvalidRoyaltyPercentage(feeNumerator);
        }
        if (receiver == address(0) && feeNumerator > 0) {
            revert InvalidReceiver();
        }
        
        _tokenRoyaltyInfo[tokenId] = RoyaltyInfo(receiver, feeNumerator);
        emit TokenRoyaltySet(tokenId, receiver, feeNumerator);
    }
    
    // ============ ERC165 Support ============
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return interfaceId == _INTERFACE_ID_ERC2981 || super.supportsInterface(interfaceId);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
