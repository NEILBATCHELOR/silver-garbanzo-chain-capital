// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeploymentBase
 * @notice Base contract for UUPS deployments with common utilities
 */
abstract contract DeploymentBase is Script {
    
    // ============================================
    // UUPS DEPLOYMENT UTILITIES
    // ============================================
    
    /**
     * @notice Deploy a UUPS upgradeable contract
     * @param implementation The implementation contract address
     * @param initData The initialization calldata
     * @return proxy The deployed proxy address
     */
    function deployUUPSProxy(
        address implementation,
        bytes memory initData
    ) internal returns (address proxy) {
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            implementation,
            initData
        );
        return address(proxyContract);
    }
    
    /**
     * @notice Get implementation address from proxy
     * @param proxy The proxy address
     * @return impl The implementation address
     */
    function getImplementation(address proxy) internal view returns (address impl) {
        bytes32 slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        assembly {
            impl := sload(slot)
        }
    }
    
    /**
     * @notice Verify proxy setup
     * @param proxy The proxy address
     * @param expectedImpl The expected implementation address
     */
    function verifyProxySetup(address proxy, address expectedImpl) internal view {
        address actualImpl = getImplementation(proxy);
        require(actualImpl == expectedImpl, "Proxy implementation mismatch");
        require(proxy != expectedImpl, "Proxy equals implementation");
    }
    
    // ============================================
    // LOGGING UTILITIES
    // ============================================
    
    function logDeployment(
        string memory name,
        address implementation,
        address proxy
    ) internal view {
        console.log(string.concat("  ", name, " deployed:"));
        console.log("    Implementation:", implementation);
        console.log("    Proxy:", proxy);
    }
    
    function logDeployment(
        uint256 step,
        uint256 total,
        string memory name,
        bool upgradeable
    ) internal view {
        string memory upgradeableLabel = upgradeable ? " (UUPS)" : "";
        console.log("");
        console.log(
            string.concat(
                "[", 
                vm.toString(step), 
                "/", 
                vm.toString(total), 
                "] Deploying ", 
                name, 
                upgradeableLabel,
                "..."
            )
        );
    }
    
    function logImplementation(address implementation) internal view {
        console.log("  Implementation:", implementation);
    }
    
    function logProxy(address proxy) internal view {
        console.log("  Proxy:", proxy);
    }
    
    function logSuccess(string memory name) internal view {
        console.log(string.concat(unicode"  ✓ ", name, " deployed"));
    }
    
    function logPhaseStart(string memory phaseName, string memory description) internal view {
        console.log("");
        console.log("=============================================");
        console.log(phaseName);
        console.log(description);
        console.log("=============================================");
    }
    
    function logPhaseComplete(string memory phaseName) internal view {
        console.log("");
        console.log(string.concat(unicode"✅ ", phaseName, " Complete"));
        console.log("=============================================");
    }
    
    // ============================================
    // CONFIGURATION UTILITIES
    // ============================================
    
    function getDeployer() internal view returns (address) {
        return vm.envAddress("DEPLOYER_ADDRESS");
    }
    
    function getSuperAdmin() internal view returns (address) {
        return vm.envOr("SUPER_ADMIN_ADDRESS", getDeployer());
    }
    
    function getMarketId() internal view returns (string memory) {
        return vm.envOr("MARKET_ID", string("ChainCapital-Commodities"));
    }
    
    function getVersion() internal view returns (string memory) {
        return vm.envOr("TRADE_FINANCE_VERSION", string("v1.0.0"));
    }
}
