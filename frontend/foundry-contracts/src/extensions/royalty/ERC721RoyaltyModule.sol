// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC721RoyaltyModule.sol";
import "./storage/RoyaltyStorage.sol";

/**
 * @title ERC721RoyaltyModule
 * @notice Modular EIP-2981 royalty system for ERC721 tokens
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Revenue Model:
 * - Creators earn on every secondary sale
 * - Marketplace integration via EIP-2981 standard
 * - Per-token or collection-wide royalties
 * - Typical: 2.5-10% royalty on resales
 * 
 * Gas Cost: ~2k per royalty check
 */
contract ERC721RoyaltyModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC721RoyaltyModule,
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
     * @param maxRoyaltyCap Maximum allowed royalty percentage (0 = no cap, default: 1000 = 10%)
     */
    function initialize(
        address admin,
        address defaultReceiver,
        uint96 defaultFeeNumerator,
        uint96 maxRoyaltyCap
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROYALTY_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        // Set max royalty cap (default 10% if not specified)
        _maxRoyaltyBps = maxRoyaltyCap > 0 ? maxRoyaltyCap : 1000;
        
        if (defaultReceiver != address(0)) {
            _setDefaultRoyalty(defaultReceiver, defaultFeeNumerator);
        }
    }
    
    // ============ Royalty Management ============
    
    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyRole(ROYALTY_MANAGER_ROLE)
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator)
        external
        onlyRole(ROYALTY_MANAGER_ROLE)
    {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }
    
    function deleteTokenRoyalty(uint256 tokenId)
        external
        onlyRole(ROYALTY_MANAGER_ROLE)
    {
        delete _tokenRoyaltyInfo[tokenId];
        emit RoyaltyDeleted(tokenId);
    }
    
    function deleteDefaultRoyalty()
        external
        onlyRole(ROYALTY_MANAGER_ROLE)
    {
        delete _defaultRoyaltyInfo;
        emit DefaultRoyaltySet(address(0), 0);
    }
    
    // ============ EIP-2981 Standard ============
    
    /**
     * @notice Calculate royalty info for a sale (EIP-2981)
     * @param tokenId Token being sold
     * @param salePrice Sale price in wei
     * @return receiver Royalty receiver address
     * @return royaltyAmount Royalty amount in wei
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        RoyaltyInfo memory royalty = _tokenRoyaltyInfo[tokenId];
        
        // Use token-specific royalty if set, otherwise use default
        if (royalty.receiver == address(0)) {
            royalty = _defaultRoyaltyInfo;
        }
        
        royaltyAmount = (salePrice * royalty.royaltyFraction) / _FEE_DENOMINATOR;
        receiver = royalty.receiver;
    }
    
    // ============ Helper Functions ============
    
    function getDefaultRoyalty()
        external
        view
        returns (address receiver, uint96 feeNumerator)
    {
        receiver = _defaultRoyaltyInfo.receiver;
        feeNumerator = _defaultRoyaltyInfo.royaltyFraction;
    }
    
    function getTokenRoyalty(uint256 tokenId)
        external
        view
        returns (address receiver, uint96 feeNumerator, bool isSet)
    {
        receiver = _tokenRoyaltyInfo[tokenId].receiver;
        feeNumerator = _tokenRoyaltyInfo[tokenId].royaltyFraction;
        isSet = receiver != address(0);
    }
    
    function getMaxRoyaltyCap()
        external
        view
        returns (uint96)
    {
        return _maxRoyaltyBps;
    }
    
    function setMaxRoyaltyCap(uint96 maxRoyaltyBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (maxRoyaltyBps > _FEE_DENOMINATOR) {
            revert InvalidRoyaltyPercentage(maxRoyaltyBps);
        }
        _maxRoyaltyBps = maxRoyaltyBps;
        emit MaxRoyaltyCapSet(maxRoyaltyBps);
    }
    
    // ============ Internal Functions ============
    
    function _setDefaultRoyalty(address receiver, uint96 feeNumerator) internal {
        if (feeNumerator > _FEE_DENOMINATOR) {
            revert InvalidRoyaltyPercentage(feeNumerator);
        }
        if (_maxRoyaltyBps > 0 && feeNumerator > _maxRoyaltyBps) {
            revert ExceedsMaxRoyaltyCap(feeNumerator, _maxRoyaltyBps);
        }
        if (receiver == address(0) && feeNumerator > 0) {
            revert InvalidReceiver();
        }
        
        _defaultRoyaltyInfo = RoyaltyInfo(receiver, feeNumerator);
        emit DefaultRoyaltySet(receiver, feeNumerator);
    }
    
    function _setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) internal {
        if (feeNumerator > _FEE_DENOMINATOR) {
            revert InvalidRoyaltyPercentage(feeNumerator);
        }
        if (_maxRoyaltyBps > 0 && feeNumerator > _maxRoyaltyBps) {
            revert ExceedsMaxRoyaltyCap(feeNumerator, _maxRoyaltyBps);
        }
        if (receiver == address(0)) {
            revert InvalidReceiver();
        }
        
        _tokenRoyaltyInfo[tokenId] = RoyaltyInfo(receiver, feeNumerator);
        emit TokenRoyaltySet(tokenId, receiver, feeNumerator);
    }
    
    // ============ Interface Support (EIP-165) ============
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, IERC721RoyaltyModule)
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
