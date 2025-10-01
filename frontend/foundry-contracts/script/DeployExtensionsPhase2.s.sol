// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/extensions/votes/ERC20VotesModule.sol";
import "../src/extensions/fees/ERC20FeeModule.sol";
import "../src/extensions/permit/ERC20PermitModule.sol";
import "../src/extensions/soulbound/ERC721SoulboundModule.sol";
import "../src/extensions/erc4626/ERC4626FeeStrategyModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployExtensionsPhase2
 * @notice Deploy Phase 2 governance and fee extension modules
 * @dev These modules enable platform revenue and token holder governance
 * 
 * Phase 2 Modules (P1 - High Priority):
 * 1. ERC20 Votes Module - Decentralized governance and voting
 * 2. ERC20 Fee Module - Transaction fees and platform revenue
 * 3. ERC20 Permit Module - Gasless approvals (EIP-2612)
 * 4. ERC721 Soulbound Module - Non-transferable credentials
 * 5. ERC4626 Fee Strategy Module - Vault management and performance fees
 * 
 * USAGE:
 *   Testnet: forge script script/DeployExtensionsPhase2.s.sol --rpc-url sepolia --broadcast --verify
 *   Mainnet: forge script script/DeployExtensionsPhase2.s.sol --rpc-url base --broadcast --verify
 */
contract DeployExtensionsPhase2 is Script {
    
    // Module implementations
    ERC20VotesModule public votesImpl;
    ERC20FeeModule public feeImpl;
    ERC20PermitModule public permitImpl;
    ERC721SoulboundModule public soulboundImpl;
    ERC4626FeeStrategyModule public vaultFeeImpl;
    
    // Module proxies
    address public votesModule;
    address public feeModule;
    address public permitModule;
    address public soulboundModule;
    address public vaultFeeModule;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("PHASE 2: GOVERNANCE & FEES MODULES DEPLOYMENT");
        console.log(divider);
        console.log("Deployer:", deployer);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log(divider);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Module 1: Votes Module (Governance) ============
        console.log("\n[1/5] Deploying ERC20 Votes Module...");
        votesImpl = new ERC20VotesModule();
        console.log("  Implementation:", address(votesImpl));
        
        bytes memory votesInitData = abi.encodeWithSelector(
            ERC20VotesModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy votesProxy = new ERC1967Proxy(
            address(votesImpl),
            votesInitData
        );
        votesModule = address(votesProxy);
        console.log("  Proxy:", votesModule);
        console.log("  Purpose: Governance voting and delegation");
        
        // ============ Module 2: Fee Module (Revenue) ============
        console.log("\n[2/5] Deploying ERC20 Fee Module...");
        feeImpl = new ERC20FeeModule();
        console.log("  Implementation:", address(feeImpl));
        
        bytes memory feeInitData = abi.encodeWithSelector(
            ERC20FeeModule.initialize.selector,
            deployer,   // admin
            100,        // default fee: 1% (100 basis points)
            deployer    // fee recipient
        );
        
        ERC1967Proxy feeProxy = new ERC1967Proxy(
            address(feeImpl),
            feeInitData
        );
        feeModule = address(feeProxy);
        console.log("  Proxy:", feeModule);
        console.log("  Purpose: Transaction fees and platform revenue");
        
        // ============ Module 3: Permit Module (Gasless Approvals) ============
        console.log("\n[3/5] Deploying ERC20 Permit Module...");
        permitImpl = new ERC20PermitModule();
        console.log("  Implementation:", address(permitImpl));
        
        bytes memory permitInitData = abi.encodeWithSelector(
            ERC20PermitModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy permitProxy = new ERC1967Proxy(
            address(permitImpl),
            permitInitData
        );
        permitModule = address(permitProxy);
        console.log("  Proxy:", permitModule);
        console.log("  Purpose: Gasless approvals (EIP-2612)");
        
        // ============ Module 4: Soulbound Module (Credentials) ============
        console.log("\n[4/5] Deploying ERC721 Soulbound Module...");
        soulboundImpl = new ERC721SoulboundModule();
        console.log("  Implementation:", address(soulboundImpl));
        
        bytes memory soulboundInitData = abi.encodeWithSelector(
            ERC721SoulboundModule.initialize.selector,
            deployer    // admin
        );
        
        ERC1967Proxy soulboundProxy = new ERC1967Proxy(
            address(soulboundImpl),
            soulboundInitData
        );
        soulboundModule = address(soulboundProxy);
        console.log("  Proxy:", soulboundModule);
        console.log("  Purpose: Non-transferable NFT credentials");
        
        // ============ Module 5: Vault Fee Strategy ============
        console.log("\n[5/5] Deploying ERC4626 Fee Strategy Module...");
        vaultFeeImpl = new ERC4626FeeStrategyModule();
        console.log("  Implementation:", address(vaultFeeImpl));
        
        bytes memory vaultFeeInitData = abi.encodeWithSelector(
            ERC4626FeeStrategyModule.initialize.selector,
            deployer,   // admin
            200,        // management fee: 2% (200 basis points)
            2000        // performance fee: 20% (2000 basis points)
        );
        
        ERC1967Proxy vaultFeeProxy = new ERC1967Proxy(
            address(vaultFeeImpl),
            vaultFeeInitData
        );
        vaultFeeModule = address(vaultFeeProxy);
        console.log("  Proxy:", vaultFeeModule);
        console.log("  Purpose: Vault management and performance fees");
        
        vm.stopBroadcast();
        
        // ============ Deployment Summary ============
        console.log("\n%s", divider);
        console.log("PHASE 2 DEPLOYMENT COMPLETE");
        console.log(divider);
        console.log("\nDeployed Modules:");
        console.log("1. Votes Module:", votesModule);
        console.log("2. Fee Module:", feeModule);
        console.log("3. Permit Module:", permitModule);
        console.log("4. Soulbound Module:", soulboundModule);
        console.log("5. Vault Fee Module:", vaultFeeModule);
        console.log("%s", divider);
        
        // ============ Save Deployment Info ============
        string memory deploymentInfo = string(
            abi.encodePacked(
                "{\n",
                '  "phase": 2,\n',
                '  "network": "', getNetworkName(block.chainid), '",\n',
                '  "chainId": ', vm.toString(block.chainid), ',\n',
                '  "deployer": "', vm.toString(deployer), '",\n',
                '  "timestamp": ', vm.toString(block.timestamp), ',\n',
                '  "modules": {\n',
                '    "votes": {\n',
                '      "implementation": "', vm.toString(address(votesImpl)), '",\n',
                '      "proxy": "', vm.toString(votesModule), '"\n',
                '    },\n',
                '    "fee": {\n',
                '      "implementation": "', vm.toString(address(feeImpl)), '",\n',
                '      "proxy": "', vm.toString(feeModule), '"\n',
                '    },\n'
            )
        );
        
        deploymentInfo = string(
            abi.encodePacked(
                deploymentInfo,
                '    "permit": {\n',
                '      "implementation": "', vm.toString(address(permitImpl)), '",\n',
                '      "proxy": "', vm.toString(permitModule), '"\n',
                '    },\n',
                '    "soulbound": {\n',
                '      "implementation": "', vm.toString(address(soulboundImpl)), '",\n',
                '      "proxy": "', vm.toString(soulboundModule), '"\n',
                '    },\n',
                '    "vaultFee": {\n',
                '      "implementation": "', vm.toString(address(vaultFeeImpl)), '",\n',
                '      "proxy": "', vm.toString(vaultFeeModule), '"\n',
                '    }\n',
                '  }\n',
                "}\n"
            )
        );
        
        string memory fileName = string(
            abi.encodePacked("deployments/phase2-", getNetworkName(block.chainid), ".json")
        );
        vm.writeFile(fileName, deploymentInfo);
        console.log("\nDeployment info saved to:", fileName);
        
        // ============ Revenue Impact ============
        console.log("\n%s", divider);
        console.log("REVENUE IMPACT ANALYSIS");
        console.log(divider);
        console.log("\nPhase 2 enables platform revenue streams:");
        console.log("  - Fee Module: 1% transaction fees");
        console.log("  - Vault Fee Module: 2% management + 20% performance");
        console.log("  - Estimated Monthly Revenue: $5-20k per active token");
        console.log("%s", divider);
        
        // ============ Next Steps ============
        console.log("\nNext Steps:");
        console.log("1. Verify all contracts on block explorer");
        console.log("2. Configure fee recipients and rates");
        console.log("3. Test governance voting with sample token");
        console.log("4. Deploy Phase 3 modules: forge script script/DeployExtensionsPhase3.s.sol");
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
