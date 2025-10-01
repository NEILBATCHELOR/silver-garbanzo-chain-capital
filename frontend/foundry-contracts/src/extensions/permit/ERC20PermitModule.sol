// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IERC20PermitModule.sol";
import "./storage/PermitStorage.sol";

/**
 * @title ERC20PermitModule
 * @notice Modular EIP-2612 permit implementation for gasless approvals
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Use Cases:
 * - Gasless token approvals
 * - One-click DeFi interactions
 * - Account abstraction integration
 * - Better mobile UX
 */
contract ERC20PermitModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable,
    IERC20PermitModule,
    PermitStorage
{
    using ECDSA for bytes32;
    
    // ============ Constants ============
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // EIP-2612 permit typehash
    bytes32 public constant PERMIT_TYPEHASH = 
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    
    // Reference to token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize permit module
     * @param admin Admin address
     * @param token Token contract address
     * @param name Token name for EIP-712
     * @param version EIP-712 version
     */
    function initialize(
        address admin,
        address token,
        string memory name,
        string memory version
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __EIP712_init(name, version);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        tokenContract = token;
    }
    
    // ============ EIP-2612 Implementation ============
    
    /**
     * @notice Approve token spending via signature
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        if (block.timestamp > deadline) revert ExpiredSignature();
        
        // Build permit hash
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _useNonce(owner),
                deadline
            )
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        
        if (signer != owner) revert InvalidSigner();
        
        // Call token contract to approve
        (bool success, ) = tokenContract.call(
            abi.encodeWithSignature(
                "approve(address,uint256)",
                spender,
                value
            )
        );
        
        if (!success) revert InvalidSignature();
    }
    
    /**
     * @notice Get current nonce for address
     */
    function nonces(address owner) external view override returns (uint256) {
        return _nonces[owner];
    }
    
    /**
     * @notice Get domain separator
     */
    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    // ============ Helper Functions ============
    
    /**
     * @notice Build domain separator
     */
    function buildDomainSeparator() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    /**
     * @notice Hash permit data
     */
    function hashPermit(
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) external view override returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Use and increment nonce
     * @param owner Address to use nonce for
     * @return current Current nonce before increment
     */
    function _useNonce(address owner) internal returns (uint256 current) {
        current = _nonces[owner];
        _nonces[owner]++;
        emit NonceUsed(owner, current);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
