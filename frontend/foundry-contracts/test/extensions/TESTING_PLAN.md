# Extension Module Testing Plan
## Comprehensive Test Coverage for All 38 Extension Modules

**Created**: October 8, 2025  
**Status**: Implementation In Progress  
**Target**: 100% Module Coverage + 80% Code Coverage

---

## Current Testing Status

### Existing Tests (8 modules)
✅ **ERC20**
- ERC20ComplianceModule.t.sol
- ERC20PermitModule.t.sol
- ERC20VestingModule.t.sol

✅ **ERC1400**
- ERC1400ControllerModule.t.sol
- ERC1400DocumentModule.t.sol
- ERC1400TransferRestrictionsModule.t.sol

✅ **ERC4626**
- ERC4626FeeStrategyModule.t.sol
- ERC4626WithdrawalQueueModule.t.sol

### Missing Tests (30 modules)
❌ Need to create comprehensive test coverage for remaining modules

---

## Testing Priorities

### Priority 1: Security Critical (5 modules)
**Timeline**: Day 1  
**Focus**: Compliance, access control, regulatory requirements

1. **UniversalDocumentModule** - Document management for all token types
2. **Policy Engine Integration** - Validate policy enforcement across modules

### Priority 2: Revenue Critical (7 modules)
**Timeline**: Day 2-3  
**Focus**: Fee mechanisms, yield generation, vault operations

3. **ERC4626YieldStrategyModule** - Multi-strategy yield generation
4. **ERC7540AsyncVaultModule** - Subscription/redemption cycles
5. **ERC7535NativeVaultModule** - Native ETH vault operations
6. **ERC7575MultiAssetVaultModule** - Multi-asset vault management
7. **ERC4626Router** - Vault routing and aggregation
8. **ERC20FeeModule** - Generic fee management
9. **ERC20FlashMintModule** - Flash loan functionality

### Priority 3: Core Functionality (9 modules)
**Timeline**: Day 4-5  
**Focus**: Semi-fungible tokens, governance, snapshots

10. **ERC3525SlotManagerModule** - Dynamic slot creation and management
11. **ERC3525ValueExchangeModule** - Cross-slot value exchanges
12. **ERC3525SlotApprovableModule** - Slot-level approvals
13. **ERC3525ReceiverExample** - Safe value transfer callbacks
14. **ERC20SnapshotModule** - Historical balance snapshots
15. **ERC20VotesModule** - Delegation and voting
16. **ERC20TimelockModule** - Time-locked transfers
17. **ERC20TemporaryApprovalModule** - Transaction-scoped approvals
18. **ERC1363PayableToken** - Payment callbacks

### Priority 4: NFT Extensions (9 modules)
**Timeline**: Day 6-7  
**Focus**: NFT functionality, royalties, specialized features

**ERC721 Extensions (5 modules)**:
19. **ERC721RoyaltyModule** - Creator royalty support
20. **ERC721RentalModule** - Time-limited NFT usage
21. **ERC721SoulboundModule** - Non-transferable tokens
22. **ERC721FractionModule** - NFT fractionalization
23. **ERC721ConsecutiveModule** - Efficient batch minting

**ERC1155 Extensions (4 modules)**:
24. **ERC1155RoyaltyModule** - Multi-token royalties
25. **ERC1155SupplyCapModule** - Supply tracking per ID
26. **ERC1155URIModule** - Dynamic URI management
27. **ERC5216GranularApprovalModule** - Amount-specific approvals

28. **ERC4906MetadataModule** - Metadata update events

---

## Test Coverage Requirements

### Minimum Test Functions Per Module
Each test file must include:

1. **Initialization Tests** (2-3 tests)
   - `test_Initialize()` - Successful initialization
   - `test_RevertWhen_InitializeTwice()` - Prevent double initialization
   - `test_RevertWhen_InvalidParameters()` - Parameter validation

2. **Access Control Tests** (3-4 tests)
   - `test_OnlyRole_CanPerformAction()` - Role-based permissions
   - `test_RevertWhen_UnauthorizedCaller()` - Unauthorized access blocked
   - `test_GrantAndRevokeRole()` - Role management

3. **Core Functionality Tests** (4-6 tests)
   - `test_[PrimaryFunction]_Success()` - Happy path
   - `test_[PrimaryFunction]_WithEdgeCases()` - Boundary conditions
   - `test_[PrimaryFunction]_StateChanges()` - State updates
   - `test_[PrimaryFunction]_EventEmissions()` - Event logging

4. **Integration Tests** (2-3 tests)
   - `test_IntegrationWithMasterContract()` - Master contract interaction
   - `test_IntegrationWithOtherModules()` - Cross-module functionality

5. **Fuzz Tests** (2-4 tests)
   - `testFuzz_[Function]()` - Property-based testing
   - Focus on amount/quantity parameters

6. **Revert Tests** (3-5 tests)
   - `test_RevertWhen_[Condition]()` - Error conditions
   - Cover all custom errors

**Total**: Minimum 16-25 test functions per module

---

## Test Structure Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {[Module]} from "src/extensions/[category]/[Module].sol";
import {[MasterContract]} from "src/masters/[MasterContract].sol";

contract [Module]Test is Test {
    [Module] public module;
    [MasterContract] public master;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public unauthorized = makeAddr("unauthorized");
    
    // Events (copy from module)
    event [EventName](...);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy master contract
        master = new [MasterContract]();
        
        // Deploy and initialize module
        module = new [Module]();
        module.initialize(address(master), ...);
        
        // Grant roles
        master.grantRole(master.MODULE_ADMIN_ROLE(), admin);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public { }
    
    function test_RevertWhen_InitializeTwice() public { }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyRole_CanPerformAction() public { }
    
    function test_RevertWhen_UnauthorizedCaller() public { }
    
    // ===== CORE FUNCTIONALITY TESTS =====
    
    function test_[Function]_Success() public { }
    
    function test_[Function]_StateChanges() public { }
    
    function test_[Function]_EventEmission() public { }
    
    // ===== INTEGRATION TESTS =====
    
    function test_IntegrationWithMaster() public { }
    
    // ===== FUZZ TESTS =====
    
    function testFuzz_[Function](uint256 amount) public { }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_[Condition]() public { }
}
```

---

## Testing Utilities

### Common Helper Functions
Create in `test/helpers/TestHelpers.sol`:

```solidity
library TestHelpers {
    function grantRoleHelper(address target, bytes32 role, address account) internal;
    function expectEventHelper(address emitter, bytes memory eventSignature) internal;
    function mockERC20(string memory name, string memory symbol) internal returns (address);
    function mockERC721(string memory name, string memory symbol) internal returns (address);
}
```

### Mock Contracts
Create in `test/mocks/`:
- `MockERC20.sol` - Basic ERC20 for testing
- `MockERC721.sol` - Basic ERC721 for testing
- `MockStrategy.sol` - Mock yield strategy
- `MockOracle.sol` - Mock price oracle

---

## Coverage Goals

### Target Metrics
- **Module Coverage**: 100% (all 38 modules tested)
- **Line Coverage**: >80% per module
- **Branch Coverage**: >75% per module
- **Function Coverage**: 100% (all public/external functions)

### Critical Coverage Areas
- ✅ Access control paths
- ✅ State transitions
- ✅ Error conditions
- ✅ Integration points
- ✅ Edge cases (zero amounts, max values)

---

## Execution Plan

### Day 1: Security Critical + Testing Infrastructure
- [ ] Create test helpers and utilities
- [ ] Create mock contracts
- [ ] UniversalDocumentModule.t.sol
- [ ] Run initial coverage report

### Day 2-3: Revenue Critical Modules
- [ ] ERC4626YieldStrategyModule.t.sol
- [ ] ERC7540AsyncVaultModule.t.sol
- [ ] ERC7535NativeVaultModule.t.sol
- [ ] ERC7575MultiAssetVaultModule.t.sol
- [ ] ERC4626Router.t.sol (if exists in src)
- [ ] ERC20FeeModule.t.sol
- [ ] ERC20FlashMintModule.t.sol

### Day 4-5: Core Functionality
- [ ] ERC3525 modules (4 tests)
- [ ] ERC20 governance modules (2 tests)
- [ ] ERC20 specialized modules (3 tests)

### Day 6-7: NFT Extensions
- [ ] ERC721 modules (5 tests)
- [ ] ERC1155 modules (4 tests)
- [ ] Metadata module (1 test)

### Day 8: Integration & Polish
- [ ] Run full test suite: `forge test`
- [ ] Generate coverage report: `forge coverage`
- [ ] Fix any failing tests
- [ ] Document test results
- [ ] Create testing summary

---

## Success Criteria

### Definition of Done
✅ All 38 modules have test files  
✅ Each module has minimum 16 test functions  
✅ All tests pass: `forge test`  
✅ Coverage >80% overall  
✅ No compilation errors  
✅ Documentation complete  

### Deliverables
1. 30 new test files (.t.sol)
2. Test helper utilities
3. Mock contracts for dependencies
4. Coverage report
5. Testing summary document

---

## Commands Reference

```bash
# Build contracts
forge build

# Run all tests
forge test

# Run specific test file
forge test --match-path test/extensions/[category]/[Module].t.sol

# Run tests with verbosity
forge test -vvv

# Generate coverage report
forge coverage

# Generate detailed coverage
forge coverage --report lcov
```

---

**Next Steps**: Begin implementation starting with Priority 1 modules
