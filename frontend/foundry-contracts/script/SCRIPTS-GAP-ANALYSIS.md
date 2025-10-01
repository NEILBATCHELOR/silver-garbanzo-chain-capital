# Smart Contract Scripts - Gap Analysis for Stage 4
**Comprehensive Review Before Account Abstraction Implementation**

**Date**: January 28, 2025  
**Purpose**: Identify missing scripts needed for production-ready Stage 4 deployment  
**Status**: 🔍 Analysis Complete

---

## ✅ Current Script Coverage (13 Scripts)

### Core Deployment (4 scripts)
| Script | Purpose | Status | Lines |
|--------|---------|--------|-------|
| DeployAllMasters.s.sol | Deploy all 6 ERC master implementations | ✅ Complete | 177 |
| DeployTokenFactory.s.sol | Deploy universal factory with proxy support | ✅ Complete | 97 |
| DeployUUPS.s.sol | Deploy governance + registry (Stage 2) | ✅ Complete | 175 |
| MultiChainDeploy.s.sol | Deploy to single Layer 2 network | ✅ Complete | 248 |

### Extension Deployment (4 scripts)
| Script | Purpose | Status | Lines |
|--------|---------|--------|-------|
| DeployExtensionsPhase1.s.sol | Deploy P0 compliance modules | ✅ Complete | 232 |
| DeployExtensionsPhase2.s.sol | Deploy P1 governance/fees modules | ✅ Complete | 249 |
| DeployExtensionsPhase3.s.sol | Deploy P2 advanced features | ✅ Complete | 250 |
| DeployExtensionsPhase4.s.sol | Deploy P3 DeFi integration | ✅ Complete | 265 |

### Utilities (3 scripts)
| Script | Purpose | Status | Lines |
|--------|---------|--------|-------|
| VerifyContracts.s.sol | Generate verification commands | ✅ Complete | 79 |
| BatchDeployTokens.s.sol | Deploy multiple tokens efficiently | ✅ Complete | 169 |
| ProductionChecklist.s.sol | Pre-deployment validation | ✅ Complete | 198 |

### Documentation (2 files)
| Document | Purpose | Status | Lines |
|----------|---------|--------|-------|
| README.md | Quick reference & usage | ✅ Complete | 199 |
| PRODUCTION-DEPLOYMENT-GUIDE.md | Step-by-step mainnet guide | ✅ Complete | 421 |

**Total Coverage**: 13 scripts, 2 comprehensive docs, ~2,600 lines of production code

---

## 🔴 Critical Gaps (Must Have Before Stage 4)

### 1. UpgradeToken.s.sol ⚠️ MISSING
**Why Critical**: Stage 4 (Account Abstraction) will require upgrading deployed tokens to integrate with paymasters and bundlers. Without an upgrade script, we can't safely test or deploy AA functionality.

**What It Does**:
- Upgrade existing token implementations via UUPS
- Multi-sig governance integration
- Storage layout validation
- Rollback capability

**Example Skeleton**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/masters/ERC20Master.sol";

/**
 * @title UpgradeToken
 * @notice Upgrade existing token implementations via UUPS
 * @dev CRITICAL for Stage 4 - Required to integrate AA functionality
 * 
 * USAGE:
 *   forge script script/UpgradeToken.s.sol \
 *     --rpc-url base \
 *     --broadcast
 */
contract UpgradeToken is Script {
    
    function run() external {
        address tokenProxy = vm.envAddress("TOKEN_PROXY");
        address newImplementation = vm.envAddress("NEW_IMPLEMENTATION");
        
        // Validate storage layout compatibility
        // Execute upgrade via governance
        // Verify upgrade success
        // Test upgraded functionality
    }
}
```

**Priority**: 🔴 P0 - Must have before Stage 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: DeployUUPS.s.sol (governance)

---

### 2. TestTokenOperations.s.sol ⚠️ MISSING
**Why Critical**: Before adding AA complexity (Stage 4), we must validate all token operations work correctly across all 6 standards. This script ensures mint, transfer, burn, lock, unlock, block, unblock all function as expected.

**What It Does**:
- Deploy test tokens for each ERC standard
- Execute all core operations (mint, burn, transfer, pause)
- Test extension modules (lock, block, vesting)
- Validate access control
- Generate operation reports

**Example Skeleton**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";

/**
 * @title TestTokenOperations
 * @notice Comprehensive testing of all token operations
 * @dev Validates functionality before Stage 4 AA integration
 * 
 * Tests:
 * - ERC20: mint, burn, transfer, pause, lock, block
 * - ERC721: mint, burn, transfer, lock
 * - ERC1155: mint, burn, batch operations
 * - ERC3525: mint, transfer value
 * - ERC4626: deposit, withdraw, yield
 * - ERC1400: partition transfers, compliance
 */
contract TestTokenOperations is Script {
    
    function run() external {
        address factory = vm.envAddress("TOKEN_FACTORY");
        
        // Test ERC20 operations
        testERC20Operations(factory);
        
        // Test ERC721 operations
        testERC721Operations(factory);
        
        // Generate report
        generateOperationReport();
    }
}
```

**Priority**: 🔴 P0 - Must have before Stage 4  
**Estimated Time**: 3-4 hours  
**Dependencies**: All master contracts, extension modules

---

### 3. EmergencyOperations.s.sol ⚠️ MISSING
**Why Critical**: Stage 4 introduces AA paymasters and bundlers - potential new attack vectors. We need emergency pause/unpause capabilities for rapid incident response.

**What It Does**:
- Global pause/unpause all tokens
- Emergency transfer freeze
- Block malicious addresses
- Recover stuck funds
- Emergency contact mechanisms

**Example Skeleton**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";

/**
 * @title EmergencyOperations
 * @notice Emergency pause/unpause and incident response
 * @dev CRITICAL for Stage 4 - AA introduces new security considerations
 * 
 * Operations:
 * - Pause all tokens
 * - Unpause all tokens
 * - Block addresses globally
 * - Emergency withdraw
 */
contract EmergencyOperations is Script {
    
    function run() external {
        string memory operation = vm.envString("OPERATION"); // pause | unpause | block
        
        if (keccak256(bytes(operation)) == keccak256("pause")) {
            pauseAllTokens();
        } else if (keccak256(bytes(operation)) == keccak256("unpause")) {
            unpauseAllTokens();
        } else if (keccak256(bytes(operation)) == keccak256("block")) {
            blockMaliciousAddresses();
        }
    }
    
    function pauseAllTokens() internal {
        // Get all deployed tokens from registry
        // Execute pause via governance
        // Verify pause status
        // Alert monitoring systems
    }
}
```

**Priority**: 🔴 P0 - Must have before Stage 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: DeployUUPS.s.sol (governance)

---

## 🟡 High Priority Gaps (Recommended Before Stage 4)

### 4. MultiChainBatchDeploy.s.sol 🟡 MISSING
**Why Important**: Efficiently deploy to all supported networks (Ethereum, Base, Arbitrum, Polygon, Optimism) in one script execution. Critical for cross-chain consistency.

**What It Does**:
- Deploy to multiple networks sequentially
- CREATE2 deterministic addresses
- Validate same addresses across chains
- Generate deployment manifest
- Cost comparison across networks

**Example Skeleton**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/deployers/UniversalDeployer.sol";

/**
 * @title MultiChainBatchDeploy
 * @notice Deploy to all supported networks with CREATE2
 * @dev Ensures same addresses across all chains
 * 
 * Networks: Ethereum, Base, Arbitrum, Polygon, Optimism
 * 
 * USAGE:
 *   forge script script/MultiChainBatchDeploy.s.sol --multi
 */
contract MultiChainBatchDeploy is Script {
    
    struct Network {
        string name;
        string rpcUrl;
        uint256 chainId;
    }
    
    Network[] public networks;
    
    function run() external {
        setupNetworks();
        
        bytes32 salt = keccak256("CHAIN_CAPITAL_V1");
        
        for (uint i = 0; i < networks.length; i++) {
            deployToNetwork(networks[i], salt);
        }
        
        validateAddressConsistency();
    }
}
```

**Priority**: 🟡 P1 - Recommended before Stage 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: CREATE2 deployer

---

### 5. GasBenchmark.s.sol 🟡 MISSING
**Why Important**: Before AA integration (Stage 4), we need baseline gas costs for all operations. This allows us to measure AA overhead and optimize accordingly.

**What It Does**:
- Benchmark all token operations
- Compare traditional vs proxy gas costs
- Measure extension module overhead
- Generate optimization report
- Track gas over time

**Example Skeleton**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";

/**
 * @title GasBenchmark
 * @notice Comprehensive gas cost benchmarking
 * @dev Baseline measurements before Stage 4 AA integration
 * 
 * Benchmarks:
 * - Deployment costs (master + proxy)
 * - Token operations (mint, burn, transfer)
 * - Extension modules (lock, vest, compliance)
 * - Batch operations
 */
contract GasBenchmark is Script {
    
    struct BenchmarkResult {
        string operation;
        uint256 gasUsed;
        uint256 costUSD; // at current gas price
    }
    
    BenchmarkResult[] public results;
    
    function run() external {
        benchmarkDeployment();
        benchmarkOperations();
        benchmarkExtensions();
        generateReport();
    }
    
    function benchmarkDeployment() internal {
        uint256 gasBefore = gasleft();
        // Deploy token
        uint256 gasAfter = gasleft();
        
        results.push(BenchmarkResult({
            operation: "ERC20 Deployment",
            gasUsed: gasBefore - gasAfter,
            costUSD: calculateCost(gasBefore - gasAfter)
        }));
    }
}
```

**Priority**: 🟡 P1 - Recommended before Stage 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: All master contracts

---

## 🟢 Nice-to-Have Gaps (Can Defer)

### 6. IntegrationTest.s.sol 🟢 OPTIONAL
**Why Useful**: End-to-end workflow testing (deploy → mint → transfer → vest → compliance check). Good for CI/CD but not blocking for Stage 4.

**Priority**: 🟢 P2 - Can implement after Stage 4  
**Estimated Time**: 3-4 hours

---

### 7. RollbackUpgrade.s.sol 🟢 OPTIONAL
**Why Useful**: Rollback failed upgrades to previous implementation. Safety net but not critical if we test thoroughly.

**Priority**: 🟢 P2 - Can implement after Stage 4  
**Estimated Time**: 2 hours

---

### 8. TokenMigration.s.sol 🟢 OPTIONAL
**Why Useful**: Migrate tokens from old factory to new factory. Useful for future but not needed for initial Stage 4.

**Priority**: 🟢 P3 - Future enhancement  
**Estimated Time**: 3-4 hours

---

## 📊 Summary & Recommendations

### Current State
✅ **Strong Foundation**: 13 production-ready scripts  
✅ **Comprehensive Documentation**: 2 detailed guides  
✅ **All Core Deployments**: Masters, Factory, Governance, Extensions  
✅ **Multi-Chain Ready**: Layer 2 deployment scripts  

### Critical Gaps Before Stage 4
🔴 **Must Have** (P0):
1. UpgradeToken.s.sol - Required for AA integration
2. TestTokenOperations.s.sol - Validate all operations work
3. EmergencyOperations.s.sol - Security incident response

🟡 **Recommended** (P1):
4. MultiChainBatchDeploy.s.sol - Cross-chain efficiency
5. GasBenchmark.s.sol - Baseline for AA optimization

🟢 **Optional** (P2-P3):
6. IntegrationTest.s.sol - CI/CD enhancement
7. RollbackUpgrade.s.sol - Upgrade safety net
8. TokenMigration.s.sol - Future proofing

---

## 🎯 Recommended Implementation Plan

### Week 1 (Before Stage 4)
**Day 1-2**: Implement P0 scripts
- ✅ UpgradeToken.s.sol (2-3 hours)
- ✅ TestTokenOperations.s.sol (3-4 hours)
- ✅ EmergencyOperations.s.sol (2-3 hours)

**Day 3**: Implement P1 scripts
- ✅ MultiChainBatchDeploy.s.sol (2-3 hours)
- ✅ GasBenchmark.s.sol (2-3 hours)

**Day 4**: Testing & Documentation
- Test all new scripts on Sepolia
- Update README and guides
- Create script usage examples

**Day 5**: Production Validation
- Run ProductionChecklist.s.sol
- Deploy test tokens with new scripts
- Validate emergency procedures

### After Stage 4 Completion
- Implement P2-P3 scripts as needed
- Add CI/CD integration tests
- Enhance monitoring and alerts

---

## 💰 Cost Analysis (Script Implementation)

| Priority | Scripts | Est. Time | Developer Cost @ $150/hr |
|----------|---------|-----------|--------------------------|
| P0 (Must Have) | 3 scripts | 8-10 hours | $1,200-1,500 |
| P1 (Recommended) | 2 scripts | 4-6 hours | $600-900 |
| P2-P3 (Optional) | 3 scripts | 8-10 hours | $1,200-1,500 |
| **Total** | **8 scripts** | **20-26 hours** | **$3,000-3,900** |

**Recommendation**: Implement P0 + P1 (5 scripts, ~$2,000) before Stage 4

---

## ✅ Success Criteria

Before proceeding to Stage 4, ensure:
- [ ] All P0 scripts implemented and tested
- [ ] All scripts compile without errors
- [ ] All scripts tested on Sepolia testnet
- [ ] Documentation updated with new scripts
- [ ] Emergency procedures validated
- [ ] Gas benchmarks established
- [ ] Upgrade process tested successfully

---

## 🚀 Next Steps

**Option 1: Implement All P0 Scripts Now**
```bash
# Create all 3 critical scripts
# Estimated time: 1 day (8-10 hours)
# Benefit: Complete safety for Stage 4
```

**Option 2: Implement P0 + P1 Scripts**
```bash
# Create all 5 recommended scripts
# Estimated time: 1.5 days (12-16 hours)
# Benefit: Complete infrastructure before Stage 4
```

**Option 3: Proceed to Stage 4 with Current Scripts**
```bash
# Risk: No upgrade mechanism
# Risk: No comprehensive operation testing
# Risk: No emergency procedures
# Not Recommended
```

---

## 📞 Decision Required

**Question**: Which scripts should we implement before Stage 4?

**Recommendation**: Implement Option 2 (P0 + P1, 5 scripts)

**Rationale**:
- UpgradeToken.s.sol is absolutely critical for AA integration
- TestTokenOperations.s.sol validates everything works before AA complexity
- EmergencyOperations.s.sol provides safety net for AA security
- MultiChainBatchDeploy.s.sol ensures cross-chain consistency
- GasBenchmark.s.sol provides baseline for AA optimization

**Time to Implement**: 1.5 days (12-16 hours)  
**Cost**: ~$2,000 @ $150/hr  
**Benefit**: Production-ready infrastructure for Stage 4

---

## 🎉 Conclusion

Our current script infrastructure is **strong** (13 scripts, 2,600+ lines) but has **3 critical gaps** (P0) that must be addressed before Stage 4. 

Implementing the 5 recommended scripts (P0 + P1) will provide:
- ✅ Complete upgrade capability
- ✅ Comprehensive operation testing
- ✅ Emergency response procedures
- ✅ Cross-chain deployment efficiency
- ✅ Gas optimization baseline

**Status**: Ready to implement missing scripts upon approval

---

**Last Updated**: January 28, 2025  
**Next**: Await user decision on which scripts to implement
