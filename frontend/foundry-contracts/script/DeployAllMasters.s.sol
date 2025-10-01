// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC1400Master.sol";

/**
 * @title DeployAllMasters
 * @notice Deploy all 6 ERC standard master implementations
 * @dev One-time deployment, all future tokens use these as templates
 * 
 * USAGE:
 *   Local:   forge script script/DeployAllMasters.s.sol --rpc-url http://localhost:8545 --broadcast
 *   Testnet: forge script script/DeployAllMasters.s.sol --rpc-url sepolia --broadcast --verify
 *   Mainnet: forge script script/DeployAllMasters.s.sol --rpc-url base --broadcast --verify
 */
contract DeployAllMasters is Script {
    
    // Master implementations
    ERC20Master public erc20Master;
    ERC721Master public erc721Master;
    ERC1155Master public erc1155Master;
    ERC3525Master public erc3525Master;
    ERC4626Master public erc4626Master;
    ERC1400Master public erc1400Master;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("CHAIN CAPITAL - MASTER IMPLEMENTATIONS DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log(divider);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Deploy ERC-20 Master ============
        console.log("\n[1/6] Deploying ERC-20 Master...");
        uint256 gasBefore = gasleft();
        erc20Master = new ERC20Master();
        uint256 erc20Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc20Master));
        console.log("  Gas Used:", erc20Gas);
        
        // ============ Deploy ERC-721 Master ============
        console.log("\n[2/6] Deploying ERC-721 Master...");
        gasBefore = gasleft();
        erc721Master = new ERC721Master();
        uint256 erc721Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc721Master));
        console.log("  Gas Used:", erc721Gas);
        
        // ============ Deploy ERC-1155 Master ============
        console.log("\n[3/6] Deploying ERC-1155 Master...");
        gasBefore = gasleft();
        erc1155Master = new ERC1155Master();
        uint256 erc1155Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc1155Master));
        console.log("  Gas Used:", erc1155Gas);
        
        // ============ Deploy ERC-3525 Master ============
        console.log("\n[4/6] Deploying ERC-3525 Master...");
        gasBefore = gasleft();
        erc3525Master = new ERC3525Master();
        uint256 erc3525Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc3525Master));
        console.log("  Gas Used:", erc3525Gas);
        
        // ============ Deploy ERC-4626 Master ============
        console.log("\n[5/6] Deploying ERC-4626 Master...");
        gasBefore = gasleft();
        erc4626Master = new ERC4626Master();
        uint256 erc4626Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc4626Master));
        console.log("  Gas Used:", erc4626Gas);
        
        // ============ Deploy ERC-1400 Master ============
        console.log("\n[6/6] Deploying ERC-1400 Master...");
        gasBefore = gasleft();
        erc1400Master = new ERC1400Master();
        uint256 erc1400Gas = gasBefore - gasleft();
        console.log("  Address:", address(erc1400Master));
        console.log("  Gas Used:", erc1400Gas);
        
        vm.stopBroadcast();
        
        // ============ Deployment Summary ============
        console.log("\n%s", divider);
        console.log("DEPLOYMENT COMPLETE");
        console.log(divider);
        
        uint256 totalGas = erc20Gas + erc721Gas + erc1155Gas + erc3525Gas + erc4626Gas + erc1400Gas;
        console.log("\nGas Summary:");
        console.log("  Total Gas:", totalGas);
        console.log("  Average Gas:", totalGas / 6);
        
        console.log("\nDeployed Masters:");
        console.log("  ERC-20  (Fungible):", address(erc20Master));
        console.log("  ERC-721 (NFT):", address(erc721Master));
        console.log("  ERC-1155 (Multi-Token):", address(erc1155Master));
        console.log("  ERC-3525 (Semi-Fungible):", address(erc3525Master));
        console.log("  ERC-4626 (Vault):", address(erc4626Master));
        console.log("  ERC-1400 (Security Token):", address(erc1400Master));
        
        console.log("\n%s", divider);
        
        // ============ Save Deployment Info ============
        string memory deploymentInfo = string(
            abi.encodePacked(
                "{\n",
                '  "network": "', getNetworkName(block.chainid), '",\n',
                '  "chainId": ', vm.toString(block.chainid), ',\n',
                '  "deployer": "', vm.toString(deployer), '",\n',
                '  "timestamp": ', vm.toString(block.timestamp), ',\n',
                '  "masters": {\n',
                '    "erc20": "', vm.toString(address(erc20Master)), '",\n',
                '    "erc721": "', vm.toString(address(erc721Master)), '",\n',
                '    "erc1155": "', vm.toString(address(erc1155Master)), '",\n',
                '    "erc3525": "', vm.toString(address(erc3525Master)), '",\n',
                '    "erc4626": "', vm.toString(address(erc4626Master)), '",\n',
                '    "erc1400": "', vm.toString(address(erc1400Master)), '"\n',
                '  },\n',
                '  "gasUsed": ', vm.toString(totalGas), '\n',
                "}\n"
            )
        );
        
        string memory fileName = string(
            abi.encodePacked("deployments/masters-", getNetworkName(block.chainid), ".json")
        );
        vm.writeFile(fileName, deploymentInfo);
        console.log("Deployment info saved to:", fileName);
        
        // ============ Next Steps ============
        console.log("\nNext Steps:");
        console.log("1. Verify contracts: forge verify-contract <address> --chain-id", block.chainid);
        console.log("2. Deploy TokenFactory: forge script script/DeployTokenFactory.s.sol --broadcast");
        console.log("3. Deploy Extensions: forge script script/DeployExtensionsPhase1.s.sol --broadcast");
        console.log("\n%s\n", divider);
    }
    
    /**
     * @notice Get network name from chain ID
     */
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 5) return "goerli";
        if (chainId == 8453) return "base";
        if (chainId == 84532) return "base-sepolia";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 421614) return "arbitrum-sepolia";
        if (chainId == 137) return "polygon";
        if (chainId == 80002) return "polygon-amoy";
        if (chainId == 10) return "optimism";
        if (chainId == 11155420) return "optimism-sepolia";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
