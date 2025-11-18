// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITokenRegistry.sol";
import "../policy/interfaces/IPolicyEngine.sol";

/**
 * @title FactoryBase
 * @notice Abstract base contract for all token factories
 * @dev Provides shared infrastructure for deployment tracking, policy validation,
 *      and registry integration
 * 
 * Features:
 * - Policy engine integration for compliance checks
 * - Token registry integration for tracking
 * - Shared deployment tracking
 * - Common validation hooks
 * - Standardized events
 * 
 * Usage:
 * All specific factories (ERC20Factory, ERC721Factory, etc.) inherit from this
 * base to ensure consistent behavior and integration with platform infrastructure.
 */
abstract contract FactoryBase is Ownable {
    // ============ Immutable Infrastructure ============
    
    /// @notice PolicyEngine for validating operations (address(0) = disabled)
    address public immutable policyEngine;
    
    /// @notice TokenRegistry for tracking deployments (address(0) = disabled)
    address public immutable tokenRegistry;
    
    /// @notice FactoryRegistry for factory discovery (address(0) = disabled)
    address public immutable factoryRegistry;
    
    // ============ State Variables ============
    
    /// @notice Tracks deployed tokens from this factory
    mapping(address => bool) internal _isToken;
    
    /// @notice Array of all deployed tokens
    address[] internal _allTokens;
    
    /// @notice Tokens deployed by each address
    mapping(address => address[]) internal _tokensByDeployer;
    
    /// @notice Total tokens deployed
    uint256 public totalDeployed;
    
    // ============ Events ============
    
    event TokenDeployed(
        address indexed token,
        address indexed implementation,
        address indexed deployer,
        string standard,
        string name,
        string symbol
    );
    
    event TokenValidated(
        address indexed token,
        string policyAction,
        bool policyPassed
    );
    
    event TokenRegistered(
        address indexed token,
        address indexed registry,
        bool success
    );
    
    // ============ Errors ============
    
    error InvalidMaster();
    error InvalidOwner();
    error InvalidName();
    error InvalidSymbol();
    error InvalidSupply();
    error PolicyValidationFailed(string action);
    error RegistrationFailed();
    error TokenNotFromFactory(address token);
    
    // ============ Constructor ============
    
    /**
     * @notice Constructor sets immutable infrastructure addresses
     * @param _policyEngine PolicyEngine address (address(0) to disable)
     * @param _tokenRegistry TokenRegistry address (address(0) to disable)
     * @param _factoryRegistry FactoryRegistry address (address(0) to disable)
     */
    constructor(
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) Ownable(msg.sender) {
        policyEngine = _policyEngine;
        tokenRegistry = _tokenRegistry;
        factoryRegistry = _factoryRegistry;
    }
    
    // ============ Internal Validation & Registration ============
    
    /**
     * @notice Validate and register a newly deployed token
     * @param token Token proxy address
     * @param implementation Implementation address
     * @param deployer Who deployed the token
     * @param standard Token standard (ERC20, ERC721, etc.)
     * @param name Token name
     * @param symbol Token symbol
     * @param policyAction Policy action to validate
     * @param amount Amount for policy validation (supply, etc.)
     */
    function _validateAndRegister(
        address token,
        address implementation,
        address deployer,
        string memory standard,
        string memory name,
        string memory symbol,
        string memory policyAction,
        uint256 amount
    ) internal {
        // 1. Validate with policy engine (if enabled)
        if (policyEngine != address(0)) {
            bool policyPassed = _validatePolicy(token, deployer, policyAction, amount);
            emit TokenValidated(token, policyAction, policyPassed);
            
            if (!policyPassed) {
                revert PolicyValidationFailed(policyAction);
            }
        }
        
        // 2. Track deployment locally
        _trackDeployment(token, deployer);
        
        // 3. Register with TokenRegistry (if enabled)
        if (tokenRegistry != address(0)) {
            _registerToken(
                token,
                implementation,
                deployer,
                standard,
                name,
                symbol
            );
        }
        
        // 4. Emit deployment event
        emit TokenDeployed(
            token,
            implementation,
            deployer,
            standard,
            name,
            symbol
        );
    }
    
    /**
     * @notice Validate operation with PolicyEngine
     * @param token Token address
     * @param actor Who is performing the action
     * @param action Policy action identifier
     * @param amount Amount involved in operation
     * @return bool Whether validation passed
     */
    function _validatePolicy(
        address token,
        address actor,
        string memory action,
        uint256 amount
    ) internal returns (bool) {
        try IPolicyEngine(policyEngine).validateOperation(
            token,
            actor,
            action,
            amount
        ) returns (bool approved, string memory /* reason */) {
            return approved;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Track deployment in local storage
     * @param token Token address
     * @param deployer Who deployed the token
     */
    function _trackDeployment(address token, address deployer) internal {
        _isToken[token] = true;
        _allTokens.push(token);
        _tokensByDeployer[deployer].push(token);
        totalDeployed++;
    }
    
    /**
     * @notice Register token with TokenRegistry
     * @param token Token proxy address
     * @param implementation Implementation address
     * @param deployer Who deployed the token
     * @param standard Token standard
     * @param name Token name
     * @param symbol Token symbol
     */
    function _registerToken(
        address token,
        address implementation,
        address deployer,
        string memory standard,
        string memory name,
        string memory symbol
    ) internal {
        try ITokenRegistry(tokenRegistry).registerToken(
            token,
            implementation,
            deployer,
            standard,
            name,
            symbol
        ) {
            emit TokenRegistered(token, tokenRegistry, true);
        } catch {
            emit TokenRegistered(token, tokenRegistry, false);
            revert RegistrationFailed();
        }
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Check if address is a token from this factory
     * @param token Token address to check
     * @return bool Whether token was deployed by this factory
     */
    function isToken(address token) external view virtual returns (bool) {
        return _isToken[token];
    }
    
    /**
     * @notice Get all tokens deployed by this factory
     * @return address[] Array of all token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return _allTokens;
    }
    
    /**
     * @notice Get tokens deployed by a specific address
     * @param deployer Deployer address
     * @return address[] Array of token addresses
     */
    function getTokensByDeployer(address deployer) 
        external 
        view 
        returns (address[] memory) 
    {
        return _tokensByDeployer[deployer];
    }
    
    /**
     * @notice Get paginated token list
     * @param offset Starting index
     * @param limit Number of tokens to return
     * @return tokens Array of token addresses
     * @return total Total number of tokens
     */
    function getTokensPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory tokens, uint256 total)
    {
        total = _allTokens.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - offset;
        tokens = new address[](size);
        
        for (uint256 i = 0; i < size; i++) {
            tokens[i] = _allTokens[offset + i];
        }
        
        return (tokens, total);
    }
}
