// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ICommodityStataTokenFactory} from "./interfaces/ICommodityStataTokenFactory.sol";
import {CommodityStataToken} from "./CommodityStataToken.sol";
import {IACLManager} from "../../interfaces/IACLManager.sol";

/**
 * @title CommodityStataTokenFactory
 * @notice Factory for deploying StataToken wrappers using minimal proxies
 * @dev Uses OpenZeppelin's Clones library for gas-efficient deployments
 * 
 * Key Features:
 * - Deploys minimal proxy clones of StataToken implementation
 * - Maintains registry of all deployed StataTokens
 * - Enforces one StataToken per cToken
 * - Access-controlled deployment
 * - Upgradeable implementation pattern
 * 
 * Gas Optimization:
 * - Uses EIP-1167 minimal proxy pattern
 * - ~10x cheaper deployments than full contract
 * - All StataTokens share same implementation code
 */
contract CommodityStataTokenFactory is ICommodityStataTokenFactory {
    using Clones for address;
    
    // ============ State Variables ============
    
    /// @notice The StataToken implementation contract
    address public override implementation;
    
    /// @notice The CommodityLendingPool address
    address public immutable override pool;
    
    /// @notice The RewardsController address
    address public immutable override rewardsController;
    
    /// @notice The ACL Manager for access control
    IACLManager public immutable aclManager;
    
    /// @notice Mapping from cToken to deployed StataToken
    mapping(address => address) private _stataTokens;
    
    /// @notice Array of all deployed StataTokens
    address[] private _allStataTokens;
    
    // ============ Modifiers ============
    
    modifier onlyPoolAdmin() {
        require(
            aclManager.isPoolAdmin(msg.sender),
            "Only pool admin"
        );
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Constructor sets immutable addresses and deploys implementation
     * @param poolAddress The CommodityLendingPool address
     * @param rewardsControllerAddress The RewardsController address
     * @param aclManagerAddress The ACL Manager address
     */
    constructor(
        address poolAddress,
        address rewardsControllerAddress,
        address aclManagerAddress
    ) {
        require(poolAddress != address(0), "Invalid pool");
        require(rewardsControllerAddress != address(0), "Invalid rewards controller");
        require(aclManagerAddress != address(0), "Invalid ACL manager");
        
        pool = poolAddress;
        rewardsController = rewardsControllerAddress;
        aclManager = IACLManager(aclManagerAddress);
        
        // Deploy implementation contract
        implementation = address(
            new CommodityStataToken(
                poolAddress,
                rewardsControllerAddress,
                aclManagerAddress
            )
        );
        
        emit ImplementationUpdated(address(0), implementation);
    }
    
    // ============ View Functions ============
    
    /// @inheritdoc ICommodityStataTokenFactory
    function getStataToken(address cToken) external view returns (address) {
        return _stataTokens[cToken];
    }
    
    /// @inheritdoc ICommodityStataTokenFactory
    function getAllStataTokens() external view returns (address[] memory) {
        return _allStataTokens;
    }
    
    /// @inheritdoc ICommodityStataTokenFactory
    function stataTokenExists(address cToken) external view returns (bool) {
        return _stataTokens[cToken] != address(0);
    }
    
    // ============ State-Changing Functions ============
    
    /// @inheritdoc ICommodityStataTokenFactory
    function createStataToken(
        address cToken,
        string calldata name,
        string calldata symbol,
        bytes32 commodityType
    ) external onlyPoolAdmin returns (address stataToken) {
        require(cToken != address(0), InvalidCToken(cToken));
        require(_stataTokens[cToken] == address(0), StataTokenAlreadyExists(cToken));
        require(commodityType != bytes32(0), "Invalid commodity type");
        
        // Deploy minimal proxy clone
        stataToken = implementation.clone();
        
        // Initialize the clone
        CommodityStataToken(stataToken).initialize(
            cToken,
            name,
            symbol,
            commodityType
        );
        
        // Register the StataToken
        _stataTokens[cToken] = stataToken;
        _allStataTokens.push(stataToken);
        
        // Get underlying from cToken
        // Note: Adjust this based on your cToken interface
        address underlying = pool; // Placeholder - should get from cToken
        
        emit StataTokenCreated(underlying, cToken, stataToken, commodityType);
        
        return stataToken;
    }
    
    /// @inheritdoc ICommodityStataTokenFactory
    function updateImplementation(address newImplementation) external onlyPoolAdmin {
        require(newImplementation != address(0), InvalidImplementation());
        require(newImplementation != implementation, "Same implementation");
        
        address oldImplementation = implementation;
        implementation = newImplementation;
        
        emit ImplementationUpdated(oldImplementation, newImplementation);
    }
}
