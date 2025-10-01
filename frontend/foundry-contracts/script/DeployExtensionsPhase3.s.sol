// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/extensions/timelock/ERC20TimelockModule.sol";
import "../src/extensions/rental/ERC721RentalModule.sol";
import "../src/extensions/fractionalization/ERC721FractionModule.sol";
import "../src/extensions/supply-cap/ERC1155SupplyCapModule.sol";
import "../src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployExtensionsPhase3
 * @notice Deploy Phase 3 advanced feature extension modules
 * @dev These modules provide competitive advantages and additional revenue streams
 * 
 * Phase 3 Modules (P2 - Medium Priority):
 * 1. ERC20 Timelock Module - Enhanced token locking with multiple concurrent locks
 * 2. ERC721 Rental Module - NFT rental marketplace integration
 * 3. ERC721 Fractionalization Module - Fractional NFT ownership
 * 4. ERC1155 Supply Cap Module - Per-token supply management
 * 5. ERC4626 Withdrawal Queue Module - Prevent vault bank runs
 * 
 * USAGE:
 *   Testnet: forge script script/DeployExtensionsPhase3.s.sol --rpc-url sepolia --broadcast --verify
 *   Mainnet: forge script script/DeployExtensionsPhase3.s.sol --rpc-url base --broadcast --verify
 */
contract DeployExtensionsPhase3 is Script {
    
    // Module implementations
    ERC20TimelockModule public timelockImpl;
    ERC721RentalModule public rentalImpl;
    ERC721FractionModule public fractionImpl;
    ERC1155SupplyCapModule public supplyCapImpl;
    ERC4626WithdrawalQueueModule public withdrawalQueueImpl;
    
    // Module proxies
    address public timelockModule;
    address public rentalModule;
    address public fractionModule;
    address public supplyCapModule;
    address public withdrawalQueueModule;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("PHASE 3: ADVANCED FEATURES MODULES DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log(divider);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Module 1: Timelock Module (Enhanced Locking) ============
        console.log("\n[1/5] Deploying ERC20 Timelock Module...");
        timelockImpl = new ERC20TimelockModule();
        console.log("  Implementation:", address(timelockImpl));
        
        bytes memory timelockInitData = abi.encodeWithSelector(
            ERC20TimelockModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy timelockProxy = new ERC1967Proxy(
            address(timelockImpl),
            timelockInitData
        );
        timelockModule = address(timelockProxy);
        console.log("  Proxy:", timelockModule);
        console.log("  Purpose: Multiple concurrent locks with reasons");
        
        // ============ Module 2: Rental Module (NFT Marketplace) ============
        console.log("\n[2/5] Deploying ERC721 Rental Module...");
        rentalImpl = new ERC721RentalModule();
        console.log("  Implementation:", address(rentalImpl));
        
        bytes memory rentalInitData = abi.encodeWithSelector(
            ERC721RentalModule.initialize.selector,
            deployer,   // admin
            500         // platform fee: 5% (500 basis points)
        );
        
        ERC1967Proxy rentalProxy = new ERC1967Proxy(
            address(rentalImpl),
            rentalInitData
        );
        rentalModule = address(rentalProxy);
        console.log("  Proxy:", rentalModule);
        console.log("  Purpose: NFT rental marketplace with 5% platform fee");
        
        // ============ Module 3: Fractionalization Module ============
        console.log("\n[3/5] Deploying ERC721 Fractionalization Module...");
        fractionImpl = new ERC721FractionModule();
        console.log("  Implementation:", address(fractionImpl));
        
        // Get optional NFT contract address from environment, default to address(0)
        address nftContractForFraction = vm.envOr("NFT_CONTRACT_FRACTION", address(0));
        
        bytes memory fractionInitData = abi.encodeWithSelector(
            ERC721FractionModule.initialize.selector,
            deployer,           // admin
            nftContractForFraction  // NFT contract (can be set later if address(0))
        );
        
        ERC1967Proxy fractionProxy = new ERC1967Proxy(
            address(fractionImpl),
            fractionInitData
        );
        fractionModule = address(fractionProxy);
        console.log("  Proxy:", fractionModule);
        console.log("  Purpose: Fractional NFT ownership");
        if (nftContractForFraction == address(0)) {
            console.log("  Note: NFT contract not set - configure later with setNFTContract()");
        } else {
            console.log("  NFT Contract:", nftContractForFraction);
        }
        
        // ============ Module 4: Supply Cap Module ============
        console.log("\n[4/5] Deploying ERC1155 Supply Cap Module...");
        supplyCapImpl = new ERC1155SupplyCapModule();
        console.log("  Implementation:", address(supplyCapImpl));
        
        bytes memory supplyCapInitData = abi.encodeWithSelector(
            ERC1155SupplyCapModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy supplyCapProxy = new ERC1967Proxy(
            address(supplyCapImpl),
            supplyCapInitData
        );
        supplyCapModule = address(supplyCapProxy);
        console.log("  Proxy:", supplyCapModule);
        console.log("  Purpose: Per-token ID supply caps");
        
        // ============ Module 5: Withdrawal Queue Module ============
        console.log("\n[5/5] Deploying ERC4626 Withdrawal Queue Module...");
        withdrawalQueueImpl = new ERC4626WithdrawalQueueModule();
        console.log("  Implementation:", address(withdrawalQueueImpl));
        
        bytes memory withdrawalQueueInitData = abi.encodeWithSelector(
            ERC4626WithdrawalQueueModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy withdrawalQueueProxy = new ERC1967Proxy(
            address(withdrawalQueueImpl),
            withdrawalQueueInitData
        );
        withdrawalQueueModule = address(withdrawalQueueProxy);
        console.log("  Proxy:", withdrawalQueueModule);
        console.log("  Purpose: Orderly vault withdrawals, prevent bank runs");
        
        vm.stopBroadcast();
        
        // ============ Deployment Summary ============
        console.log("\n%s", divider);
        console.log("PHASE 3 DEPLOYMENT COMPLETE");
        console.log(divider);
        console.log("\nDeployed Modules (5/5 - All modules deployed):");
        console.log("1. Timelock Module:", timelockModule);
        console.log("2. Rental Module:", rentalModule);
        console.log("3. Fractionalization Module:", fractionModule);
        console.log("4. Supply Cap Module:", supplyCapModule);
        console.log("5. Withdrawal Queue Module:", withdrawalQueueModule);
        console.log("%s", divider);
        
        // ============ Save Deployment Info ============
        string memory deploymentInfo = string(
            abi.encodePacked(
                "{\n",
                '  "phase": 3,\n',
                '  "network": "', getNetworkName(block.chainid), '",\n',
                '  "chainId": ', vm.toString(block.chainid), ',\n',
                '  "deployer": "', vm.toString(deployer), '",\n',
                '  "timestamp": ', vm.toString(block.timestamp), ',\n',
                '  "modules": {\n',
                '    "timelock": {\n',
                '      "implementation": "', vm.toString(address(timelockImpl)), '",\n',
                '      "proxy": "', vm.toString(timelockModule), '"\n',
                '    },\n',
                '    "rental": {\n',
                '      "implementation": "', vm.toString(address(rentalImpl)), '",\n',
                '      "proxy": "', vm.toString(rentalModule), '"\n',
                '    },\n',
                '    "fractionalization": {\n',
                '      "implementation": "', vm.toString(address(fractionImpl)), '",\n',
                '      "proxy": "', vm.toString(fractionModule), '"\n',
                '    },\n'
            )
        );
        
        deploymentInfo = string(
            abi.encodePacked(
                deploymentInfo,
                '    "supplyCap": {\n',
                '      "implementation": "', vm.toString(address(supplyCapImpl)), '",\n',
                '      "proxy": "', vm.toString(supplyCapModule), '"\n',
                '    },\n',
                '    "withdrawalQueue": {\n',
                '      "implementation": "', vm.toString(address(withdrawalQueueImpl)), '",\n',
                '      "proxy": "', vm.toString(withdrawalQueueModule), '"\n',
                '    }\n',
                '  }\n',
                "}\n"
            )
        );
        
        string memory fileName = string(
            abi.encodePacked("deployments/phase3-", getNetworkName(block.chainid), ".json")
        );
        vm.writeFile(fileName, deploymentInfo);
        console.log("\nDeployment info saved to:", fileName);
        
        // ============ Business Impact ============
        console.log("\n%s", divider);
        console.log("BUSINESS IMPACT ANALYSIS");
        console.log(divider);
        console.log("\nPhase 3 provides competitive advantages:");
        console.log("  - NFT Rental: New revenue stream (5% platform fee)");
        console.log("  - Fractionalization: Access to high-value assets");
        console.log("  - Withdrawal Queue: Professional vault management");
        console.log("  - Enhanced Locking: Enterprise-grade token controls");
        console.log("\nEstimated Impact:");
        console.log("  - Additional Revenue: $1-10k/month per active NFT collection");
        console.log("  - Market Differentiation: Features competitors don't have");
        console.log("%s", divider);
        
        // ============ Next Steps ============
        console.log("\nNext Steps:");
        console.log("1. Verify all contracts on block explorer");
        console.log("2. Test rental marketplace with sample NFT");
        console.log("3. Configure platform fee recipients");
        console.log("4. Deploy Phase 4 modules: forge script script/DeployExtensionsPhase4.s.sol");
        console.log("\n%s\n", divider);
    }
    
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
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
