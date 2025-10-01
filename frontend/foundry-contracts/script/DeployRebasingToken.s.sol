// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/masters/ERC20RebasingMaster.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployRebasingToken
 * @notice Deployment script for rebasing stablecoin
 * @dev Usage:
 *   forge script script/DeployRebasingToken.s.sol \
 *     --rpc-url base-sepolia \
 *     --broadcast \
 *     --verify
 */
contract DeployRebasingToken is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy implementation
        console.log("\n1. Deploying ERC20RebasingMaster implementation...");
        ERC20RebasingMaster implementation = new ERC20RebasingMaster();
        console.log("Implementation deployed:", address(implementation));
        
        // 2. Prepare initialization data
        string memory name = "Rebasing USD";
        string memory symbol = "rUSD";
        uint256 initialSupply = 1_000_000 * 1e18; // 1M tokens
        
        bytes memory initData = abi.encodeWithSelector(
            ERC20RebasingMaster.initialize.selector,
            name,
            symbol,
            initialSupply,
            deployer
        );
        
        // 3. Deploy proxy
        console.log("\n2. Deploying UUPS Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed:", address(proxy));
        
        // 4. Cast proxy to token interface
        ERC20RebasingMaster token = ERC20RebasingMaster(address(proxy));
        
        // 5. Verify initialization
        console.log("\n3. Verifying deployment...");
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Total supply:", token.totalSupply() / 1e18);
        console.log("Total shares:", token.getTotalShares() / 1e18);
        console.log("Share price:", token.getSharePrice());
        console.log("Deployer balance:", token.balanceOf(deployer) / 1e18);
        
        // 6. Grant REBASE_ROLE to deployer (temporary)
        bytes32 REBASE_ROLE = keccak256("REBASE_ROLE");
        console.log("\n4. Granting REBASE_ROLE...");
        token.grantRole(REBASE_ROLE, deployer);
        console.log("REBASE_ROLE granted to:", deployer);
        
        vm.stopBroadcast();
        
        // 7. Save deployment info
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Implementation:", address(implementation));
        console.log("Proxy (Token):", address(proxy));
        console.log("Deployer:", deployer);
        console.log("\nNext steps:");
        console.log("1. Grant REBASE_ROLE to oracle contract");
        console.log("2. Connect PolicyEngine (optional)");
        console.log("3. Set up rebase schedule");
        console.log("4. Deploy wrapper token (optional)");
    }
}

/**
 * @title DeployWithOracle
 * @notice Deploy rebasing token + mock oracle for testing
 */
contract DeployWithOracle is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy token
        ERC20RebasingMaster implementation = new ERC20RebasingMaster();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC20RebasingMaster.initialize.selector,
            "Test Rebasing USD",
            "tRUSD",
            1_000_000 * 1e18,
            deployer
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        ERC20RebasingMaster token = ERC20RebasingMaster(address(proxy));
        
        // Deploy mock oracle
        MockPriceOracle oracle = new MockPriceOracle(address(token));
        
        // Grant REBASE_ROLE to oracle
        bytes32 REBASE_ROLE = keccak256("REBASE_ROLE");
        token.grantRole(REBASE_ROLE, address(oracle));
        
        vm.stopBroadcast();
        
        console.log("Token:", address(token));
        console.log("Oracle:", address(oracle));
    }
}

/**
 * @title MockPriceOracle
 * @notice Simple oracle for testing rebases
 */
contract MockPriceOracle {
    ERC20RebasingMaster public token;
    uint256 public currentPrice = 1e18; // $1.00
    uint256 public lastRebaseTime;
    uint256 public constant MIN_REBASE_INTERVAL = 1 hours;
    
    event PriceUpdated(uint256 newPrice);
    event RebaseExecuted(uint256 oldSupply, uint256 newSupply);
    
    constructor(address token_) {
        token = ERC20RebasingMaster(token_);
    }
    
    /**
     * @notice Set mock price (for testing)
     * @param newPrice New price in 18 decimals (1e18 = $1.00)
     */
    function setPrice(uint256 newPrice) external {
        currentPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    /**
     * @notice Check price and execute rebase if needed
     * @dev Adjusts supply to maintain $1.00 peg
     */
    function checkAndRebase() external {
        require(
            block.timestamp >= lastRebaseTime + MIN_REBASE_INTERVAL,
            "Too soon to rebase"
        );
        
        uint256 targetPrice = 1e18; // $1.00
        uint256 priceDelta = currentPrice > targetPrice 
            ? currentPrice - targetPrice 
            : targetPrice - currentPrice;
        
        // Only rebase if deviation > 1%
        if (priceDelta * 100 / targetPrice < 1) {
            return;
        }
        
        uint256 oldSupply = token.totalSupply();
        uint256 newSupply;
        
        if (currentPrice < targetPrice) {
            // Price too low → contract supply (deflate)
            uint256 percentChange = (targetPrice - currentPrice) * 100 / targetPrice;
            newSupply = (oldSupply * (100 - percentChange)) / 100;
        } else {
            // Price too high → expand supply (inflate)
            uint256 percentChange = (currentPrice - targetPrice) * 100 / targetPrice;
            newSupply = (oldSupply * (100 + percentChange)) / 100;
        }
        
        // Limit rebase to ±10%
        if (newSupply > oldSupply * 110 / 100) {
            newSupply = oldSupply * 110 / 100;
        } else if (newSupply < oldSupply * 90 / 100) {
            newSupply = oldSupply * 90 / 100;
        }
        
        // Execute rebase
        token.rebase(newSupply);
        lastRebaseTime = block.timestamp;
        
        emit RebaseExecuted(oldSupply, newSupply);
    }
    
    /**
     * @notice Get current oracle price
     * @return Price in 18 decimals
     */
    function getPrice() external view returns (uint256) {
        return currentPrice;
    }
}
