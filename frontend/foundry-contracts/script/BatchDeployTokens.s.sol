// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";

/**
 * @title BatchDeployTokens
 * @notice Deploy multiple tokens efficiently using TokenFactory
 * @dev Maximizes gas efficiency through batch operations
 * 
 * USAGE:
 *   Local:   forge script script/BatchDeployTokens.s.sol --rpc-url http://localhost:8545 --broadcast
 *   Testnet: forge script script/BatchDeployTokens.s.sol --rpc-url sepolia --broadcast
 *   Mainnet: forge script script/BatchDeployTokens.s.sol --rpc-url base --broadcast
 */
contract BatchDeployTokens is Script {
    
    TokenFactory public factory;
    address[] public deployedTokens;
    
    struct TokenConfig {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 initialSupply;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Load factory address from environment or deployments
        address factoryAddress = vm.envOr("TOKEN_FACTORY", address(0));
        require(factoryAddress != address(0), "TOKEN_FACTORY not set");
        
        factory = TokenFactory(factoryAddress);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("BATCH TOKEN DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Factory:", address(factory));
        console.log("Network:", getNetworkName(block.chainid));
        console.log(divider);
        
        // Define token configurations
        TokenConfig[] memory tokens = new TokenConfig[](5);
        
        tokens[0] = TokenConfig({
            name: "Chain Capital Token",
            symbol: "CCT",
            maxSupply: 10000000 * 10**18,
            initialSupply: 1000000 * 10**18
        });
        
        tokens[1] = TokenConfig({
            name: "Investment Share Token",
            symbol: "IST",
            maxSupply: 5000000 * 10**18,
            initialSupply: 500000 * 10**18
        });
        
        tokens[2] = TokenConfig({
            name: "Governance Token",
            symbol: "GOV",
            maxSupply: 100000000 * 10**18,
            initialSupply: 10000000 * 10**18
        });
        
        tokens[3] = TokenConfig({
            name: "Reward Token",
            symbol: "RWD",
            maxSupply: 0, // Unlimited
            initialSupply: 1000000 * 10**18
        });
        
        tokens[4] = TokenConfig({
            name: "Utility Token",
            symbol: "UTL",
            maxSupply: 50000000 * 10**18,
            initialSupply: 5000000 * 10**18
        });
        
        console.log("\nDeploying", tokens.length, "tokens...\n");
        
        uint256 totalGas = 0;
        vm.startBroadcast(deployerPrivateKey);
        
        for (uint i = 0; i < tokens.length; i++) {
            console.log(string(abi.encodePacked("[", vm.toString(i+1), "/", vm.toString(tokens.length), "] Deploying ", tokens[i].name, " (", tokens[i].symbol, ")...")));
            
            uint256 gasBefore = gasleft();
            
            address token = factory.deployERC20(
                tokens[i].name,
                tokens[i].symbol,
                tokens[i].maxSupply,
                tokens[i].initialSupply,
                deployer
            );
            
            uint256 gasUsed = gasBefore - gasleft();
            totalGas += gasUsed;
            
            deployedTokens.push(token);
            
            console.log("  Address:", token);
            console.log("  Gas Used:", gasUsed);
            console.log("  Total Supply:", ERC20Master(token).totalSupply() / 10**18, tokens[i].symbol);
            console.log("");
        }
        
        vm.stopBroadcast();
        
        // ============ Deployment Summary ============
        console.log("%s", divider);
        console.log("BATCH DEPLOYMENT COMPLETE");
        console.log(divider);
        console.log("\nDeployed Tokens:");
        for (uint i = 0; i < deployedTokens.length; i++) {
            console.log(string(abi.encodePacked(vm.toString(i+1), ". ", tokens[i].name, " (", tokens[i].symbol, "): ", vm.toString(deployedTokens[i]))));
        }
        
        console.log("\nGas Summary:");
        console.log("  Total Gas:", totalGas);
        console.log("  Average per Token:", totalGas / tokens.length);
        console.log("  Tokens Deployed:", deployedTokens.length);
        console.log("\n%s\n", divider);
        
        // Save deployment addresses
        string memory deploymentList = "{\n  \"tokens\": [\n";
        for (uint i = 0; i < deployedTokens.length; i++) {
            deploymentList = string(
                abi.encodePacked(
                    deploymentList,
                    '    {\n',
                    '      "name": "', tokens[i].name, '",\n',
                    '      "symbol": "', tokens[i].symbol, '",\n',
                    '      "address": "', vm.toString(deployedTokens[i]), '"\n',
                    '    }',
                    i < deployedTokens.length - 1 ? ",\n" : "\n"
                )
            );
        }
        deploymentList = string(abi.encodePacked(deploymentList, "  ]\n}\n"));
        
        vm.writeFile("deployments/batch-tokens.json", deploymentList);
        console.log("Token addresses saved to: deployments/batch-tokens.json");
    }
    
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 8453) return "base";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 137) return "polygon";
        if (chainId == 10) return "optimism";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
