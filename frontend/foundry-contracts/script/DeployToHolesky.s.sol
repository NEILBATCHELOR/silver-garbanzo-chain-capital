// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/TokenFactory.sol";

/**
 * @title DeployToHolesky
 * @notice Simplified deployment script for Holesky testnet
 * @dev Uses multi-step deployment to avoid init code size limit
 */
contract DeployToHolesky is Script {
    // Holesky configuration
    uint256 constant HOLESKY_CHAIN_ID = 17000;
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Verify we're on Holesky
        require(block.chainid == HOLESKY_CHAIN_ID, "Not Holesky network");
        
        console.log("==================================================");
        console.log("HOLESKY TESTNET DEPLOYMENT");
        console.log("==================================================");
        console.log("Network: Holesky Testnet");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("");
        
        // Check balance
        require(deployer.balance >= 1 ether, "Insufficient ETH for deployment (need 1 ETH minimum)");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Deploy TokenFactory ============
        console.log("Deploying TokenFactory with all masters and beacons...");
        console.log("This will take 2-3 minutes...");
        console.log("");
        
        // Deploy factory (this deploys all masters, modules, and beacons in constructor)
        TokenFactory factory = new TokenFactory(
            address(0),  // policyEngine - disabled for testing
            address(0),  // policyRegistry - disabled for testing
            address(0),  // tokenRegistry - disabled for testing
            address(0),  // upgradeGovernor - disabled for testing
            address(0)   // l2GasOptimizer - disabled for testing
        );
        
        console.log("");
        console.log("==================================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("==================================================");
        console.log("");
        console.log("TokenFactory:", address(factory));
        console.log("");
        console.log("Master Contracts:");
        console.log("  ERC20Master:  ", factory.erc20Master());
        console.log("  ERC721Master: ", factory.erc721Master());
        console.log("  ERC1155Master:", factory.erc1155Master());
        console.log("  ERC3525Master:", factory.erc3525Master());
        console.log("  ERC4626Master:", factory.erc4626Master());
        console.log("  ERC1400Master:", factory.erc1400Master());
        console.log("");
        console.log("Beacon Proxies:");
        console.log("  ERC20 Beacon:  ", factory.erc20Beacon());
        console.log("  ERC721 Beacon: ", factory.erc721Beacon());
        console.log("  ERC1155 Beacon:", factory.erc1155Beacon());
        console.log("  ERC3525 Beacon:", factory.erc3525Beacon());
        console.log("  ERC4626 Beacon:", factory.erc4626Beacon());
        console.log("  ERC1400 Beacon:", factory.erc1400Beacon());
        console.log("");
        console.log("==================================================");
        console.log("NEXT STEPS:");
        console.log("==================================================");
        console.log("1. Verify contracts on Etherscan:");
        console.log("   forge verify-contract <address> <contract> --chain holesky");
        console.log("");
        console.log("2. Test token deployment:");
        console.log("   cast send", address(factory));
        console.log("   'deployERC20(string,string,uint256,uint256,address)'");
        console.log("   'Test Token' 'TEST' 1000000000000000000000000 1000000000000000000000", deployer);
        console.log("");
        console.log("3. Verify on Holesky Etherscan:");
        console.log("   https://holesky.etherscan.io/address/", address(factory));
        console.log("");
        console.log("4. Update database contract_masters table");
        console.log("==================================================");
        
        vm.stopBroadcast();
        
        // Save deployment addresses to file
        string memory deploymentData = string(abi.encodePacked(
            "FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
            "ERC20_MASTER=", vm.toString(factory.erc20Master()), "\n",
            "ERC721_MASTER=", vm.toString(factory.erc721Master()), "\n",
            "ERC1155_MASTER=", vm.toString(factory.erc1155Master()), "\n",
            "ERC3525_MASTER=", vm.toString(factory.erc3525Master()), "\n",
            "ERC4626_MASTER=", vm.toString(factory.erc4626Master()), "\n",
            "ERC1400_MASTER=", vm.toString(factory.erc1400Master()), "\n",
            "ERC20_BEACON=", vm.toString(factory.erc20Beacon()), "\n",
            "ERC721_BEACON=", vm.toString(factory.erc721Beacon()), "\n",
            "ERC1155_BEACON=", vm.toString(factory.erc1155Beacon()), "\n",
            "ERC3525_BEACON=", vm.toString(factory.erc3525Beacon()), "\n",
            "ERC4626_BEACON=", vm.toString(factory.erc4626Beacon()), "\n",
            "ERC1400_BEACON=", vm.toString(factory.erc1400Beacon()), "\n"
        ));
        
        vm.writeFile("deployments/holesky-latest.env", deploymentData);
        console.log("Deployment addresses saved to: deployments/holesky-latest.env");
    }
}
