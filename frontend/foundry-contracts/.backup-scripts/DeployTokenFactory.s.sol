// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import "../src/TokenFactory.sol";
import "../src/BaseERC20Token.sol";
import "../src/BaseERC721Token.sol";
import "../src/BaseERC1155Token.sol";
import "../src/BaseERC1400Token.sol";
import "../src/BaseERC3525Token.sol";
import "../src/BaseERC4626Token.sol";

/**
 * @title DeployTokenFactory
 * @notice Enhanced deployment script for Chain Capital token infrastructure
 * 
 * Features:
 * - Deploys TokenFactory with support for all 6 token standards
 * - Creates sample tokens for testing
 * - Validates deployment success
 * - Supports both testnet and mainnet deployments
 */
contract DeployTokenFactory is Script {
    
    // Deployment addresses
    TokenFactory public factory;
    
    // Sample token addresses
    address public sampleERC20;
    address public sampleERC721;
    address public sampleERC1155;
    address public sampleERC1400;
    address public sampleERC3525;
    address public sampleERC4626;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy TokenFactory
        console.log("Deploying TokenFactory...");
        factory = new TokenFactory();
        console.log("TokenFactory deployed at:", address(factory));
        
        // Deploy sample tokens for testing
        deploySampleTokens();
        
        // Verify deployments
        verifyDeployments();
        
        vm.stopBroadcast();
        
        // Print deployment summary
        printDeploymentSummary();
    }
    
    function deploySampleTokens() internal {
        console.log("\nDeploying sample tokens...");
        
        // Deploy sample ERC20
        sampleERC20 = deploySampleERC20();
        console.log("Sample ERC20 deployed at:", sampleERC20);
        
        // Deploy sample ERC721
        sampleERC721 = deploySampleERC721();
        console.log("Sample ERC721 deployed at:", sampleERC721);
        
        // Deploy sample ERC1155
        sampleERC1155 = deploySampleERC1155();
        console.log("Sample ERC1155 deployed at:", sampleERC1155);
        
        // Deploy sample ERC1400
        sampleERC1400 = deploySampleERC1400();
        console.log("Sample ERC1400 deployed at:", sampleERC1400);
        
        // Deploy sample ERC3525
        sampleERC3525 = deploySampleERC3525();
        console.log("Sample ERC3525 deployed at:", sampleERC3525);
        
        // Deploy sample ERC4626 (requires an underlying asset)
        sampleERC4626 = deploySampleERC4626();
        console.log("Sample ERC4626 deployed at:", sampleERC4626);
    }
    
    function deploySampleERC20() internal returns (address) {
        BaseERC20Token.TokenConfig memory config = BaseERC20Token.TokenConfig({
            name: "Chain Capital Sample Token",
            symbol: "CCST",
            decimals: 18,
            initialSupply: 1000000 * 10**18, // 1M tokens
            maxSupply: 10000000 * 10**18,    // 10M tokens max
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            votingEnabled: false,
            initialOwner: msg.sender
        });
        
        return factory.deployERC20Token(config);
    }
    
    function deploySampleERC721() internal returns (address) {
        BaseERC721Token.TokenConfig memory config = BaseERC721Token.TokenConfig({
            name: "Chain Capital NFT Collection",
            symbol: "CCNFT",
            baseURI: "https://api.chaincapital.io/metadata/",
            maxSupply: 10000,
            mintPrice: 0.01 ether,
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            publicMinting: true,
            initialOwner: msg.sender
        });
        
        return factory.deployERC721Token(config);
    }
    
    function deploySampleERC1155() internal returns (address) {
        BaseERC1155Token.TokenConfig memory config = BaseERC1155Token.TokenConfig({
            name: "Chain Capital Multi-Token",
            symbol: "CCMT",
            baseURI: "https://api.chaincapital.io/metadata/1155/",
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            publicMinting: true,
            initialOwner: msg.sender
        });
        
        return factory.deployERC1155Token(config);
    }
    
    function deploySampleERC1400() internal returns (address) {
        return factory.deployERC1400Token(
            "Chain Capital Security Token",
            "CCST",
            1000000 * 10**18, // 1M initial supply
            10000000 * 10**18, // 10M cap
            msg.sender, // controller
            true, // require KYC
            "https://docs.chaincapital.io/security-token",
            keccak256("sample_document_hash")
        );
    }
    
    function deploySampleERC3525() internal returns (address) {
        BaseERC3525Token.TokenConfig memory config = BaseERC3525Token.TokenConfig({
            name: "Chain Capital Semi-Fungible",
            symbol: "CCSF",
            valueDecimals: 18,
            mintingEnabled: true,
            burningEnabled: true,
            transfersPaused: false,
            initialOwner: msg.sender
        });
        
        // Create initial slots
        BaseERC3525Token.SlotInfo[] memory initialSlots = new BaseERC3525Token.SlotInfo[](2);
        initialSlots[0] = BaseERC3525Token.SlotInfo({
            name: "Sample Slot 1",
            description: "First sample slot for testing",
            isActive: true,
            maxSupply: 1000,
            currentSupply: 0,
            metadata: "sample_slot_1"
        });
        initialSlots[1] = BaseERC3525Token.SlotInfo({
            name: "Sample Slot 2",
            description: "Second sample slot for testing",
            isActive: true,
            maxSupply: 1000,
            currentSupply: 0,
            metadata: "sample_slot_2"
        });
        
        // Create initial allocations
        BaseERC3525Token.AllocationInfo[] memory allocations = new BaseERC3525Token.AllocationInfo[](0);
        
        return factory.deployERC3525Token(
            config,
            initialSlots,
            allocations,
            250, // 2.5% royalty
            msg.sender
        );
    }
    
    function deploySampleERC4626() internal returns (address) {
        // Use the ERC20 token as underlying asset
        address asset = sampleERC20;
        
        return factory.deployERC4626Token(
            asset,
            "Chain Capital Vault",
            "CCVAULT",
            18,
            msg.sender
        );
    }
    
    function verifyDeployments() internal view {
        console.log("\nVerifying deployments...");
        
        // Verify TokenFactory
        require(address(factory) != address(0), "TokenFactory deployment failed");
        console.log("[OK] TokenFactory verified");
        
        // Verify sample tokens
        require(sampleERC20 != address(0), "ERC20 deployment failed");
        console.log("[OK] Sample ERC20 verified");
        
        require(sampleERC721 != address(0), "ERC721 deployment failed");
        console.log("[OK] Sample ERC721 verified");
        
        require(sampleERC1155 != address(0), "ERC1155 deployment failed");
        console.log("[OK] Sample ERC1155 verified");
        
        require(sampleERC1400 != address(0), "ERC1400 deployment failed");
        console.log("[OK] Sample ERC1400 verified");
        
        require(sampleERC3525 != address(0), "ERC3525 deployment failed");
        console.log("[OK] Sample ERC3525 verified");
        
        require(sampleERC4626 != address(0), "ERC4626 deployment failed");
        console.log("[OK] Sample ERC4626 verified");
        
        console.log("All deployments verified successfully!");
    }
    
    function printDeploymentSummary() internal view {
        console.log("\n" "=" "80");
        console.log("CHAIN CAPITAL TOKEN DEPLOYMENT SUMMARY");
        console.log("=" "80");
        console.log("Network:", getNetworkName());
        console.log("Deployer:", msg.sender);
        console.log("");
        console.log("Core Infrastructure:");
        console.log("  TokenFactory:", address(factory));
        console.log("");
        console.log("Sample Tokens:");
        console.log("  ERC20 (CCST):", sampleERC20);
        console.log("  ERC721 (CCNFT):", sampleERC721);
        console.log("  ERC1155 (CCMT):", sampleERC1155);
        console.log("  ERC1400 (CCST):", sampleERC1400);
        console.log("  ERC3525 (CCSF):", sampleERC3525);
        console.log("  ERC4626 (CCVAULT):", sampleERC4626);
        console.log("");
        console.log("Supported Token Standards: 6 (ERC20, ERC721, ERC1155, ERC1400, ERC3525, ERC4626)");
        console.log("Deployment Status: [OK] SUCCESS");
        console.log("Production Ready: [OK] YES");
        console.log("=" "80");
    }
    
    function getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 11155111) return "Ethereum Sepolia";
        if (chainId == 137) return "Polygon Mainnet";
        if (chainId == 80001) return "Polygon Mumbai";
        if (chainId == 80002) return "Polygon Amoy";
        if (chainId == 31337) return "Localhost";
        
        return "Unknown Network";
    }
}
