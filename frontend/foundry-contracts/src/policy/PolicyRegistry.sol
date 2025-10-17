// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PolicyRegistry
 * @notice Central registry for tracking policy configurations and token relationships
 * @dev Provides a searchable index of all policies across tokens and operations
 * 
 * Purpose:
 * - Track which tokens have policies
 * - Map operations to their policy configurations
 * - Enable policy discovery and querying
 * - Support compliance reporting and auditing
 */
contract PolicyRegistry is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Structs ============
    
    /**
     * @notice Policy metadata for tracking
     * @param token Token address
     * @param operationType Type of operation
     * @param policyEngine Address of the policy engine
     * @param active Whether the policy is active
     * @param createdAt When the policy was created
     * @param updatedAt When the policy was last updated
     */
    struct PolicyMetadata {
        address token;
        string operationType;
        address policyEngine;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    /**
     * @notice Token registration information
     * @param tokenAddress Address of the token
     * @param standard Token standard (ERC20, ERC721, etc.)
     * @param policyEngine Policy engine managing this token
     * @param operations List of operations with policies
     * @param registeredAt When the token was registered
     */
    struct TokenRegistration {
        address tokenAddress;
        string standard;
        address policyEngine;
        string[] operations;
        uint256 registeredAt;
    }
    
    // ============ State Variables ============
    
    // token => operationType => PolicyMetadata
    mapping(address => mapping(string => PolicyMetadata)) private policyMetadata;
    
    // token => TokenRegistration
    mapping(address => TokenRegistration) private tokenRegistrations;
    
    // List of all registered tokens
    address[] private registeredTokens;
    
    // policyEngine => list of tokens
    mapping(address => address[]) private tokensPerEngine;
    
    // ============ Events ============
    
    event TokenRegistered(
        address indexed token,
        string standard,
        address indexed policyEngine
    );
    
    event PolicyRegistered(
        address indexed token,
        string operationType,
        address indexed policyEngine
    );
    
    event PolicyDeactivated(
        address indexed token,
        string operationType
    );
    
    event PolicyReactivated(
        address indexed token,
        string operationType
    );
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the registry
     * @param admin Address to grant admin roles
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Registration Functions ============
    
    /**
     * @notice Register a token with the registry
     * @param token Token address
     * @param standard Token standard (ERC20, ERC721, etc.)
     * @param policyEngine Policy engine managing this token
     */
    function registerToken(
        address token,
        string memory standard,
        address policyEngine
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        require(policyEngine != address(0), "Invalid policy engine");
        require(tokenRegistrations[token].tokenAddress == address(0), "Token already registered");
        
        TokenRegistration storage registration = tokenRegistrations[token];
        registration.tokenAddress = token;
        registration.standard = standard;
        registration.policyEngine = policyEngine;
        registration.registeredAt = block.timestamp;
        
        registeredTokens.push(token);
        tokensPerEngine[policyEngine].push(token);
        
        emit TokenRegistered(token, standard, policyEngine);
    }
    
    /**
     * @notice Register a policy for a token and operation
     * @param token Token address
     * @param operationType Type of operation
     * @param policyEngine Policy engine managing this policy
     */
    function registerPolicy(
        address token,
        string memory operationType,
        address policyEngine
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        require(tokenRegistrations[token].tokenAddress != address(0), "Token not registered");
        
        PolicyMetadata storage metadata = policyMetadata[token][operationType];
        
        // If policy doesn't exist, add operation to token's list
        if (metadata.token == address(0)) {
            tokenRegistrations[token].operations.push(operationType);
            metadata.createdAt = block.timestamp;
        }
        
        metadata.token = token;
        metadata.operationType = operationType;
        metadata.policyEngine = policyEngine;
        metadata.active = true;
        metadata.updatedAt = block.timestamp;
        
        emit PolicyRegistered(token, operationType, policyEngine);
    }
    
    /**
     * @notice Deactivate a policy
     * @param token Token address
     * @param operationType Type of operation
     */
    function deactivatePolicy(
        address token,
        string memory operationType
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        PolicyMetadata storage metadata = policyMetadata[token][operationType];
        require(metadata.token != address(0), "Policy not found");
        
        metadata.active = false;
        metadata.updatedAt = block.timestamp;
        
        emit PolicyDeactivated(token, operationType);
    }
    
    /**
     * @notice Reactivate a policy
     * @param token Token address
     * @param operationType Type of operation
     */
    function reactivatePolicy(
        address token,
        string memory operationType
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        PolicyMetadata storage metadata = policyMetadata[token][operationType];
        require(metadata.token != address(0), "Policy not found");
        
        metadata.active = true;
        metadata.updatedAt = block.timestamp;
        
        emit PolicyReactivated(token, operationType);
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Get policy metadata
     * @param token Token address
     * @param operationType Type of operation
     * @return metadata Policy metadata
     */
    function getPolicyMetadata(
        address token,
        string memory operationType
    ) external view returns (PolicyMetadata memory) {
        return policyMetadata[token][operationType];
    }
    
    /**
     * @notice Get token registration information
     * @param token Token address
     * @return registration Token registration details
     */
    function getTokenRegistration(
        address token
    ) external view returns (TokenRegistration memory) {
        return tokenRegistrations[token];
    }
    
    /**
     * @notice Get all operations with policies for a token
     * @param token Token address
     * @return operations List of operation types
     */
    function getTokenOperations(
        address token
    ) external view returns (string[] memory) {
        return tokenRegistrations[token].operations;
    }
    
    /**
     * @notice Get all registered tokens
     * @return tokens List of token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return registeredTokens;
    }
    
    /**
     * @notice Get tokens managed by a policy engine
     * @param policyEngine Policy engine address
     * @return tokens List of token addresses
     */
    function getTokensByEngine(
        address policyEngine
    ) external view returns (address[] memory) {
        return tokensPerEngine[policyEngine];
    }
    
    /**
     * @notice Check if a token is registered
     * @param token Token address
     * @return registered Whether the token is registered
     */
    function isTokenRegistered(
        address token
    ) external view returns (bool) {
        return tokenRegistrations[token].tokenAddress != address(0);
    }
    
    /**
     * @notice Check if a policy exists
     * @param token Token address
     * @param operationType Type of operation
     * @return exists Whether the policy exists
     */
    function isPolicyRegistered(
        address token,
        string memory operationType
    ) external view returns (bool) {
        return policyMetadata[token][operationType].token != address(0);
    }
    
    /**
     * @notice Check if a policy is active
     * @param token Token address
     * @param operationType Type of operation
     * @return active Whether the policy is active
     */
    function isPolicyActive(
        address token,
        string memory operationType
    ) external view returns (bool) {
        return policyMetadata[token][operationType].active;
    }
    
    /**
     * @notice Get total number of registered tokens
     * @return count Number of tokens
     */
    function getTokenCount() external view returns (uint256) {
        return registeredTokens.length;
    }
    
    /**
     * @notice Get total number of registered tokens (alias for getTokenCount)
     * @return count Number of tokens
     */
    function getTotalTokens() external view returns (uint256) {
        return registeredTokens.length;
    }
    
    /**
     * @notice Get token standard for a registered token
     * @param token Token address
     * @return standard Token standard (ERC20, ERC721, etc.)
     */
    function getTokenStandard(
        address token
    ) external view returns (string memory) {
        return tokenRegistrations[token].standard;
    }
    
    /**
     * @notice Get policy engine for a registered token
     * @param token Token address
     * @return policyEngine Policy engine address
     */
    function getTokenPolicyEngine(
        address token
    ) external view returns (address) {
        return tokenRegistrations[token].policyEngine;
    }
    
    /**
     * @notice Get policy engine for a specific token and operation
     * @param token Token address
     * @param operationType Type of operation
     * @return policyEngine Policy engine address
     */
    function getPolicyEngine(
        address token,
        string memory operationType
    ) external view returns (address) {
        return policyMetadata[token][operationType].policyEngine;
    }
    
    // ============ UUPS Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrade
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
