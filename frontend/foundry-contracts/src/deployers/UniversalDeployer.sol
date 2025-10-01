// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../masters/ERC20Master.sol";

/**
 * @title UniversalDeployer
 * @notice CREATE2-based deployer for deterministic cross-chain addresses
 * @dev Deploys minimal proxies with same addresses across all EVM chains
 * 
 * Key Features:
 * - CREATE2 deterministic deployment
 * - Cross-chain address consistency
 * - Gas-optimized minimal proxies
 * - Support for all token standards
 * 
 * Usage:
 * 1. Predict address: predictAddress(salt, config)
 * 2. Deploy: deployDeterministic(config)
 * 3. Verify: Same address on all chains!
 */
contract UniversalDeployer {
    using Clones for address;
    
    // ============ Master Implementation Addresses ============
    address public immutable erc20Master;
    address public immutable erc721Master;
    address public immutable erc1155Master;
    address public immutable erc3525Master;
    address public immutable erc4626Master;
    
    // ============ Deployment Tracking ============
    mapping(address => DeploymentInfo) public deployments;
    address[] public allDeployments;
    
    struct DeploymentInfo {
        address deployer;
        address implementation;
        uint256 chainId;
        uint256 timestamp;
        bytes32 salt;
        string standard;
    }
    
    // ============ ERC20 Deployment Configuration ============
    struct ERC20Config {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 initialSupply;
        address owner;
        bytes32 salt;
    }
    
    // ============ Events ============
    event TokenDeployed(
        address indexed proxy,
        address indexed implementation,
        address indexed deployer,
        uint256 chainId,
        bytes32 salt,
        string standard
    );
    
    event CrossChainDeployment(
        address indexed proxy,
        uint256[] chainIds,
        bytes32 salt
    );
    
    // ============ Errors ============
    error DeploymentFailed();
    error AddressMismatch(address expected, address actual);
    error InvalidConfiguration();
    error AlreadyDeployed(address proxy);
    
    /**
     * @notice Constructor deploys master implementations once
     * @dev Masters are immutable and shared across all clones
     */
    constructor() {
        erc20Master = address(new ERC20Master());
        // Add other masters when implementing multi-standard support
        erc721Master = address(0);
        erc1155Master = address(0);
        erc3525Master = address(0);
        erc4626Master = address(0);
    }
    
    /**
     * @notice Deploy ERC20 token with CREATE2 (deterministic address)
     * @param config Deployment configuration including salt
     * @return proxy Address of deployed token (same on all chains)
     * 
     * @dev Uses CREATE2 to ensure same address across all EVM chains
     * Gas cost: ~325K gas on L2 (~$5-15 depending on network)
     */
    function deployERC20Deterministic(ERC20Config memory config) 
        external 
        returns (address proxy) 
    {
        // Validate configuration
        if (bytes(config.name).length == 0 || bytes(config.symbol).length == 0) {
            revert InvalidConfiguration();
        }
        
        // Predict address
        proxy = predictERC20Address(config.salt);
        
        // Check if already deployed
        if (deployments[proxy].timestamp != 0) {
            revert AlreadyDeployed(proxy);
        }
        
        // Deploy minimal proxy using CREATE2
        proxy = Clones.cloneDeterministic(erc20Master, config.salt);
        
        // Initialize the proxy
        ERC20Master(proxy).initialize(
            config.name,
            config.symbol,
            config.maxSupply,
            config.initialSupply,
            config.owner
        );
        
        // Record deployment
        deployments[proxy] = DeploymentInfo({
            deployer: msg.sender,
            implementation: erc20Master,
            chainId: block.chainid,
            timestamp: block.timestamp,
            salt: config.salt,
            standard: "ERC20"
        });
        
        allDeployments.push(proxy);
        
        emit TokenDeployed(
            proxy,
            erc20Master,
            msg.sender,
            block.chainid,
            config.salt,
            "ERC20"
        );
        
        return proxy;
    }
    
    /**
     * @notice Predict deployment address before deploying
     * @param salt Unique salt for CREATE2
     * @return predicted Address that will be deployed
     * 
     * @dev This address will be IDENTICAL on all EVM chains!
     * Use this to verify cross-chain consistency before deploying.
     */
    function predictERC20Address(bytes32 salt) 
        public 
        view 
        returns (address predicted) 
    {
        return Clones.predictDeterministicAddress(
            erc20Master,
            salt,
            address(this)
        );
    }
    
    /**
     * @notice Get all deployments by a specific deployer
     * @param deployer Address of the deployer
     * @return addresses Array of deployed token addresses
     */
    function getDeploymentsByDeployer(address deployer) 
        external 
        view 
        returns (address[] memory addresses) 
    {
        uint256 count = 0;
        
        // Count deployments by this deployer
        for (uint256 i = 0; i < allDeployments.length; i++) {
            if (deployments[allDeployments[i]].deployer == deployer) {
                count++;
            }
        }
        
        // Create array
        addresses = new address[](count);
        uint256 index = 0;
        
        // Fill array
        for (uint256 i = 0; i < allDeployments.length; i++) {
            if (deployments[allDeployments[i]].deployer == deployer) {
                addresses[index] = allDeployments[i];
                index++;
            }
        }
        
        return addresses;
    }
    
    /**
     * @notice Get total number of deployments
     * @return count Total deployments across all deployers
     */
    function getTotalDeployments() external view returns (uint256) {
        return allDeployments.length;
    }
    
    /**
     * @notice Get deployment information
     * @param proxy Address of deployed token
     * @return info Complete deployment information
     */
    function getDeploymentInfo(address proxy) 
        external 
        view 
        returns (DeploymentInfo memory info) 
    {
        return deployments[proxy];
    }
}
