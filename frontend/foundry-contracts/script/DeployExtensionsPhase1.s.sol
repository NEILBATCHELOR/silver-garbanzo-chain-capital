// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/extensions/compliance/ERC20ComplianceModule.sol";
import "../src/extensions/vesting/ERC20VestingModule.sol";
import "../src/extensions/royalty/ERC721RoyaltyModule.sol";
import "../src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol";
import "../src/extensions/erc1400/ERC1400DocumentModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployExtensionsPhase1
 * @notice Deploy Phase 1 critical compliance extension modules
 * @dev These modules are REQUIRED for legal security token issuance
 * 
 * Phase 1 Modules (P0 - Critical):
 * 1. ERC20 Compliance Module - KYC/AML, whitelist/blacklist
 * 2. ERC20 Vesting Module - Token lock-up and vesting schedules
 * 3. ERC721 Royalty Module - Creator royalties (EIP-2981)
 * 4. ERC1400 Transfer Restrictions - Security token compliance
 * 5. ERC1400 Document Module - Legal document management
 * 
 * USAGE:
 *   Testnet: forge script script/DeployExtensionsPhase1.s.sol --rpc-url sepolia --broadcast --verify
 *   Mainnet: forge script script/DeployExtensionsPhase1.s.sol --rpc-url base --broadcast --verify
 */
contract DeployExtensionsPhase1 is Script {
    
    // Module implementations
    ERC20ComplianceModule public complianceImpl;
    ERC20VestingModule public vestingImpl;
    ERC721RoyaltyModule public royaltyImpl;
    ERC1400TransferRestrictionsModule public restrictionsImpl;
    ERC1400DocumentModule public documentImpl;
    
    // Module proxies
    address public complianceModule;
    address public vestingModule;
    address public royaltyModule;
    address public restrictionsModule;
    address public documentModule;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("PHASE 1: CRITICAL COMPLIANCE MODULES DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log(divider);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Module 1: Compliance Module ============
        console.log("\n[1/5] Deploying ERC20 Compliance Module...");
        complianceImpl = new ERC20ComplianceModule();
        console.log("  Implementation:", address(complianceImpl));
        
        bytes memory complianceInitData = abi.encodeWithSelector(
            ERC20ComplianceModule.initialize.selector,
            deployer,    // admin
            true,        // KYC required
            true         // Whitelist required
        );
        
        ERC1967Proxy complianceProxy = new ERC1967Proxy(
            address(complianceImpl),
            complianceInitData
        );
        complianceModule = address(complianceProxy);
        console.log("  Proxy:", complianceModule);
        
        // ============ Module 2: Vesting Module ============
        console.log("\n[2/5] Deploying ERC20 Vesting Module...");
        vestingImpl = new ERC20VestingModule();
        console.log("  Implementation:", address(vestingImpl));
        
        bytes memory vestingInitData = abi.encodeWithSelector(
            ERC20VestingModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy vestingProxy = new ERC1967Proxy(
            address(vestingImpl),
            vestingInitData
        );
        vestingModule = address(vestingProxy);
        console.log("  Proxy:", vestingModule);
        
        // ============ Module 3: Royalty Module (EIP-2981) ============
        console.log("\n[3/5] Deploying ERC721 Royalty Module...");
        royaltyImpl = new ERC721RoyaltyModule();
        console.log("  Implementation:", address(royaltyImpl));
        
        bytes memory royaltyInitData = abi.encodeWithSelector(
            ERC721RoyaltyModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy royaltyProxy = new ERC1967Proxy(
            address(royaltyImpl),
            royaltyInitData
        );
        royaltyModule = address(royaltyProxy);
        console.log("  Proxy:", royaltyModule);
        
        // ============ Module 4: Transfer Restrictions (ERC1400) ============
        console.log("\n[4/5] Deploying ERC1400 Transfer Restrictions Module...");
        restrictionsImpl = new ERC1400TransferRestrictionsModule();
        console.log("  Implementation:", address(restrictionsImpl));
        
        bytes memory restrictionsInitData = abi.encodeWithSelector(
            ERC1400TransferRestrictionsModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy restrictionsProxy = new ERC1967Proxy(
            address(restrictionsImpl),
            restrictionsInitData
        );
        restrictionsModule = address(restrictionsProxy);
        console.log("  Proxy:", restrictionsModule);
        
        // ============ Module 5: Document Module (ERC1400) ============
        console.log("\n[5/5] Deploying ERC1400 Document Module...");
        documentImpl = new ERC1400DocumentModule();
        console.log("  Implementation:", address(documentImpl));
        
        bytes memory documentInitData = abi.encodeWithSelector(
            ERC1400DocumentModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy documentProxy = new ERC1967Proxy(
            address(documentImpl),
            documentInitData
        );
        documentModule = address(documentProxy);
        console.log("  Proxy:", documentModule);
        
        vm.stopBroadcast();
        
        // ============ Deployment Summary ============
        console.log("\n%s", divider);
        console.log("PHASE 1 DEPLOYMENT COMPLETE");
        console.log(divider);
        console.log("\nDeployed Modules:");
        console.log("1. Compliance Module:", complianceModule);
        console.log("2. Vesting Module:", vestingModule);
        console.log("3. Royalty Module:", royaltyModule);
        console.log("4. Transfer Restrictions:", restrictionsModule);
        console.log("5. Document Module:", documentModule);
        console.log("%s", divider);
        
        // ============ Save Deployment Info ============
        string memory deploymentInfo = string(
            abi.encodePacked(
                "{\n",
                '  "phase": 1,\n',
                '  "network": "', getNetworkName(block.chainid), '",\n',
                '  "chainId": ', vm.toString(block.chainid), ',\n',
                '  "deployer": "', vm.toString(deployer), '",\n',
                '  "timestamp": ', vm.toString(block.timestamp), ',\n',
                '  "modules": {\n',
                '    "compliance": {\n',
                '      "implementation": "', vm.toString(address(complianceImpl)), '",\n',
                '      "proxy": "', vm.toString(complianceModule), '"\n',
                '    },\n',
                '    "vesting": {\n',
                '      "implementation": "', vm.toString(address(vestingImpl)), '",\n',
                '      "proxy": "', vm.toString(vestingModule), '"\n',
                '    },\n'
            )
        );
        
        deploymentInfo = string(
            abi.encodePacked(
                deploymentInfo,
                '    "royalty": {\n',
                '      "implementation": "', vm.toString(address(royaltyImpl)), '",\n',
                '      "proxy": "', vm.toString(royaltyModule), '"\n',
                '    },\n',
                '    "transferRestrictions": {\n',
                '      "implementation": "', vm.toString(address(restrictionsImpl)), '",\n',
                '      "proxy": "', vm.toString(restrictionsModule), '"\n',
                '    },\n',
                '    "document": {\n',
                '      "implementation": "', vm.toString(address(documentImpl)), '",\n',
                '      "proxy": "', vm.toString(documentModule), '"\n',
                '    }\n',
                '  }\n',
                "}\n"
            )
        );
        
        string memory fileName = string(
            abi.encodePacked("deployments/phase1-", getNetworkName(block.chainid), ".json")
        );
        vm.writeFile(fileName, deploymentInfo);
        console.log("\nDeployment info saved to:", fileName);
        
        // ============ Next Steps ============
        console.log("\nNext Steps:");
        console.log("1. Verify all contracts on block explorer");
        console.log("2. Test compliance module with sample token");
        console.log("3. Configure KYC/whitelist settings");
        console.log("4. Deploy Phase 2 modules: forge script script/DeployExtensionsPhase2.s.sol");
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
