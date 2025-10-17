// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../src/wallets/MultiSigWalletFactory.sol";
import "../../src/wallets/MultiSigWallet.sol";

/**
 * @title DeployMultiSig
 * @notice Deployment script for MultiSigWalletFactory and test wallet
 * @dev Run with: forge script script/wallets/DeployMultiSig.s.sol --broadcast --verify
 * 
 * Environment Variables Required:
 * - PRIVATE_KEY: Deployer private key
 * - For verification:
 *   - ETHERSCAN_API_KEY (Ethereum mainnet/testnet)
 *   - POLYGONSCAN_API_KEY (Polygon)
 *   - ARBISCAN_API_KEY (Arbitrum)
 */
contract DeployMultiSig is Script {
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    MultiSigWalletFactory public factory;
    MultiSigWallet public testWallet;
    
    // Test wallet configuration
    string constant TEST_WALLET_NAME = "Chain Capital Treasury";
    uint256 constant TEST_THRESHOLD = 2; // 2-of-3
    
    // ============================================================================
    // MAIN DEPLOYMENT
    // ============================================================================

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Multi-Sig Wallet Factory Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("==============================================");
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Factory
        console.log("1. Deploying MultiSigWalletFactory...");
        factory = new MultiSigWalletFactory();
        console.log("   Factory deployed at:", address(factory));
        console.log("");

        // 2. Create test wallet (optional)
        if (vm.envOr("DEPLOY_TEST_WALLET", true)) {
            console.log("2. Creating test multi-sig wallet...");
            
            // Setup test owners (deployer + 2 additional addresses)
            address[] memory owners = new address[](3);
            owners[0] = deployer;
            owners[1] = vm.envOr("TEST_OWNER_2", address(0x1)); // Replace with real address
            owners[2] = vm.envOr("TEST_OWNER_3", address(0x2)); // Replace with real address
            
            console.log("   Owner 1 (Deployer):", owners[0]);
            console.log("   Owner 2:", owners[1]);
            console.log("   Owner 3:", owners[2]);
            console.log("   Threshold:", TEST_THRESHOLD);
            
            address testWalletAddress = factory.createWallet(
                TEST_WALLET_NAME,
                owners,
                TEST_THRESHOLD
            );
            
            testWallet = MultiSigWallet(payable(testWalletAddress));
            console.log("   Test wallet deployed at:", address(testWallet));
        }
        
        vm.stopBroadcast();


        // Post-deployment info
        console.log("");
        console.log("==============================================");
        console.log("Deployment Complete!");
        console.log("==============================================");
        console.log("");
        console.log("Contract Addresses:");
        console.log("-------------------");
        console.log("Factory:", address(factory));
        if (address(testWallet) != address(0)) {
            console.log("Test Wallet:", address(testWallet));
        }
        console.log("");
        console.log("Next Steps:");
        console.log("-----------");
        console.log("1. Update .env with factory address:");
        console.log("   VITE_MULTISIG_FACTORY_ADDRESS=", address(factory));
        console.log("2. Verify contracts on block explorer");
        console.log("3. Test wallet creation via frontend UI");
        console.log("4. Grant roles to multi-sig wallets");
        console.log("");
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * @notice Get network name from chain ID
     */
    function getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 17000) return "Holesky Testnet";
        if (chainId == 137) return "Polygon";
        if (chainId == 42161) return "Arbitrum One";
        if (chainId == 10) return "Optimism";
        if (chainId == 8453) return "Base";
        
        return "Unknown Network";
    }
}
