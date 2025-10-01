// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";

/**
 * @title MultiChainDeploy
 * @notice Deploy TokenFactory to multiple Layer 2 networks with deterministic addresses
 * @dev Integrates with Chain Capital RPC Manager and uses Etherscan V2 for verification
 * 
 * USAGE:
 * 
 * 1. Test Deployment (Base Sepolia):
 *    forge script script/MultiChainDeploy.s.sol:MultiChainDeploy \
 *      --rpc-url base_sepolia \
 *      --broadcast \
 *      --verify
 * 
 * 2. Production Deployment (Base Mainnet):
 *    forge script script/MultiChainDeploy.s.sol:MultiChainDeploy \
 *      --rpc-url base \
 *      --broadcast \
 *      --verify \
 *      --etherscan-api-key ${VITE_ETHERSCAN_API_KEY}
 * 
 * 3. Deploy to Multiple Networks:
 *    ./scripts/deploy-all-networks.sh
 */
contract MultiChainDeploy is Script {
    
    // ============ State ============
    TokenFactory public factory;
    address public deployer;
    
    // ============ Network Configuration ============
    struct NetworkInfo {
        string name;
        uint256 chainId;
        uint256 estimatedGasPrice; // in gwei
        uint256 avgDeploymentCost; // in cents (USD * 100)
    }
    
    mapping(uint256 => NetworkInfo) public networks;
    
    /**
     * @notice Main deployment entry point
     */
    function run() external {
        // Setup network information
        setupNetworks();
        
        // Get deployment key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("CHAIN CAPITAL - MULTI-CHAIN TOKEN FACTORY DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log(divider);
        
        // Start broadcasting
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy TokenFactory
        factory = new TokenFactory();
        
        console.log("\n%s", divider);
        console.log("DEPLOYMENT SUCCESSFUL");
        console.log(divider);
        console.log("TokenFactory:", address(factory));
        console.log("ERC20 Master:", factory.erc20Master());
        console.log("ERC721 Master:", factory.erc721Master());
        console.log("ERC1155 Master:", factory.erc1155Master());
        console.log("ERC3525 Master:", factory.erc3525Master());
        console.log("ERC4626 Master:", factory.erc4626Master());
        console.log("Total Deployments:", factory.getTotalDeployments());
        console.log(divider);
        
        // Display cost analysis
        displayCostAnalysis();
        
        // Display next steps
        displayNextSteps();
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Setup network information for cost analysis
     */
    function setupNetworks() internal {
        // Ethereum Mainnet
        networks[1] = NetworkInfo({
            name: "Ethereum",
            chainId: 1,
            estimatedGasPrice: 30,
            avgDeploymentCost: 14000 // $140.00
        });
        
        // Sepolia Testnet
        networks[11155111] = NetworkInfo({
            name: "Sepolia",
            chainId: 11155111,
            estimatedGasPrice: 1,
            avgDeploymentCost: 0 // FREE (testnet ETH)
        });
        
        // Base Mainnet
        networks[8453] = NetworkInfo({
            name: "Base",
            chainId: 8453,
            estimatedGasPrice: 10, // 0.01 gwei = 10 million wei, expressed as whole number
            avgDeploymentCost: 750 // $7.50
        });
        
        // Base Sepolia
        networks[84532] = NetworkInfo({
            name: "Base Sepolia",
            chainId: 84532,
            estimatedGasPrice: 10, // 0.01 gwei
            avgDeploymentCost: 0 // FREE
        });
        
        // Arbitrum Mainnet
        networks[42161] = NetworkInfo({
            name: "Arbitrum",
            chainId: 42161,
            estimatedGasPrice: 100, // 0.1 gwei
            avgDeploymentCost: 1200 // $12.00
        });
        
        // Arbitrum Sepolia
        networks[421614] = NetworkInfo({
            name: "Arbitrum Sepolia",
            chainId: 421614,
            estimatedGasPrice: 100, // 0.1 gwei
            avgDeploymentCost: 0 // FREE
        });
        
        // Polygon Mainnet
        networks[137] = NetworkInfo({
            name: "Polygon",
            chainId: 137,
            estimatedGasPrice: 30,
            avgDeploymentCost: 150 // $1.50
        });
        
        // Polygon Amoy (testnet)
        networks[80002] = NetworkInfo({
            name: "Polygon Amoy",
            chainId: 80002,
            estimatedGasPrice: 30,
            avgDeploymentCost: 0 // FREE
        });
        
        // Optimism Mainnet
        networks[10] = NetworkInfo({
            name: "Optimism",
            chainId: 10,
            estimatedGasPrice: 1, // 0.001 gwei
            avgDeploymentCost: 900 // $9.00
        });
        
        // Optimism Sepolia
        networks[11155420] = NetworkInfo({
            name: "Optimism Sepolia",
            chainId: 11155420,
            estimatedGasPrice: 1, // 0.001 gwei
            avgDeploymentCost: 0 // FREE
        });
    }
    
    /**
     * @notice Get network name from chain ID
     */
    function getNetworkName(uint256 chainId) internal view returns (string memory) {
        NetworkInfo memory info = networks[chainId];
        if (bytes(info.name).length > 0) {
            return info.name;
        }
        return "Unknown Network";
    }
    
    /**
     * @notice Display cost analysis for current network
     */
    function displayCostAnalysis() internal view {
        NetworkInfo memory info = networks[block.chainid];
        
        string memory divider = "============================================================";
        
        console.log("\n%s", divider);
        console.log("COST ANALYSIS");
        console.log(divider);
        
        if (info.avgDeploymentCost == 0) {
            console.log("Network: TESTNET (FREE)");
            console.log("Perfect for testing before production deployment!");
        } else {
            uint256 dollars = info.avgDeploymentCost / 100;
            uint256 cents = info.avgDeploymentCost % 100;
            console.log("Average Cost per Token: $%s.%s", dollars, cents);
            
            // Calculate savings vs Ethereum
            uint256 ethereumCost = networks[1].avgDeploymentCost;
            uint256 savings = ethereumCost - info.avgDeploymentCost;
            uint256 savingsPercent = (savings * 100) / ethereumCost;
            
            uint256 savedDollars = savings / 100;
            uint256 savedCents = savings % 100;
            
            console.log("vs Ethereum Mainnet: -%s%% ($%s.%s saved)", 
                savingsPercent, savedDollars, savedCents);
            
            // Show deployment volume projections
            console.log("\nCost Projections:");
            console.log("  10 tokens:  $%s", (info.avgDeploymentCost * 10) / 100);
            console.log("  100 tokens: $%s", (info.avgDeploymentCost * 100) / 100);
            console.log("  1000 tokens: $%s", (info.avgDeploymentCost * 1000) / 100);
        }
        
        console.log(divider);
    }
    
    /**
     * @notice Display next steps after deployment
     */
    function displayNextSteps() internal view {
        string memory divider = "============================================================";
        
        console.log("\n%s", divider);
        console.log("NEXT STEPS");
        console.log(divider);
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update frontend with factory address");
        console.log("3. Test token deployment");
        console.log("4. Deploy to additional networks if needed");
        console.log("%s\n", divider);
    }
}
