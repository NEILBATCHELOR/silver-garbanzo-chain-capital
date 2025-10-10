// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Phase4DBatchDeploymentTest
 * @notice Tests for Phase 4D batch deployment functions
 */
contract Phase4DBatchDeploymentTest is Test {
    TokenFactory public factory;
    address public owner;
    address public testAsset;
    
    function setUp() public {
        owner = address(this);
        
        // Deploy test asset (mock ERC20)
        testAsset = address(new MockERC20("Test Asset", "TASSET"));
        
        // Deploy TokenFactory with null addresses for optional components
        factory = new TokenFactory(
            address(0), // policyEngine
            address(0), // policyRegistry
            address(0), // tokenRegistry
            address(0), // upgradeGovernor
            address(0)  // l2GasOptimizer
        );
    }
    
    // ============================================================================
    // ERC3525 Batch Deployment Tests
    // ============================================================================
    
    function testDeployERC3525WithNoModules() public {
        TokenFactory.ERC3525ModuleConfig memory config = TokenFactory.ERC3525ModuleConfig({
            slotManager: false,
            valueExchange: false
        });
        
        (address token, address[] memory modules) = factory.deployERC3525WithAllModules(
            "Test SFT",
            "TSFT",
            18, // valueDecimals
            owner,
            config
        );
        
        assertTrue(token != address(0), "Token should be deployed");
        assertEq(modules.length, 0, "No modules should be deployed");
    }
    
    function testDeployERC3525WithSlotManager() public {
        TokenFactory.ERC3525ModuleConfig memory config = TokenFactory.ERC3525ModuleConfig({
            slotManager: true,
            valueExchange: false
        });
        
        (address token, address[] memory modules) = factory.deployERC3525WithAllModules(
            "Test SFT",
            "TSFT",
            18,
            owner,
            config
        );
        
        assertTrue(token != address(0), "Token should be deployed");
        assertEq(modules.length, 1, "One module should be deployed");
        assertTrue(modules[0] != address(0), "Slot Manager should be deployed");
    }
    
    function testDeployERC3525WithAllModules() public {
        TokenFactory.ERC3525ModuleConfig memory config = TokenFactory.ERC3525ModuleConfig({
            slotManager: true,
            valueExchange: true
        });
        
        (address token, address[] memory modules) = factory.deployERC3525WithAllModules(
            "Test SFT",
            "TSFT",
            18,
            owner,
            config
        );
        
        assertTrue(token != address(0), "Token should be deployed");
        assertEq(modules.length, 2, "Two modules should be deployed");
        assertTrue(modules[0] != address(0), "Slot Manager should be deployed");
        assertTrue(modules[1] != address(0), "Value Exchange should be deployed");
    }
    
    function testERC3525RevertsWithZeroOwner() public {
        TokenFactory.ERC3525ModuleConfig memory config = TokenFactory.ERC3525ModuleConfig({
            slotManager: false,
            valueExchange: false
        });
        
        vm.expectRevert(TokenFactory.InvalidOwner.selector);
        factory.deployERC3525WithAllModules(
            "Test SFT",
            "TSFT",
            18,
            address(0), // Invalid owner
            config
        );
    }
    
    // ============================================================================
    // ERC4626 Batch Deployment Tests
    // ============================================================================
    
    function testDeployERC4626WithNoModules() public {
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: false,
            withdrawalQueue: false,
            yieldStrategy: false,
            asyncVault: false,
            nativeVault: false,
            router: false
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        (address vault, address[] memory modules) = factory.deployERC4626WithAllModules(
            testAsset,
            "Test Vault",
            "TVAULT",
            owner,
            config,
            params
        );
        
        assertTrue(vault != address(0), "Vault should be deployed");
        assertEq(modules.length, 0, "No modules should be deployed");
    }
    
    function testDeployERC4626WithFeeStrategy() public {
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: true,
            withdrawalQueue: false,
            yieldStrategy: false,
            asyncVault: false,
            nativeVault: false,
            router: false
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        (address vault, address[] memory modules) = factory.deployERC4626WithAllModules(
            testAsset,
            "Test Vault",
            "TVAULT",
            owner,
            config,
            params
        );
        
        assertTrue(vault != address(0), "Vault should be deployed");
        assertEq(modules.length, 1, "One module should be deployed");
        assertTrue(modules[0] != address(0), "Fee Strategy should be deployed");
    }
    
    function testDeployERC4626WithAllModules() public {
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: true,
            withdrawalQueue: true,
            yieldStrategy: true,
            asyncVault: true,
            nativeVault: true,
            router: true
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        (address vault, address[] memory modules) = factory.deployERC4626WithAllModules(
            testAsset,
            "Test Vault",
            "TVAULT",
            owner,
            config,
            params
        );
        
        assertTrue(vault != address(0), "Vault should be deployed");
        assertEq(modules.length, 6, "All six modules should be deployed");
        
        for (uint256 i = 0; i < 6; i++) {
            assertTrue(modules[i] != address(0), "All modules should be deployed");
        }
    }
    
    function testERC4626RevertsWithZeroOwner() public {
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: false,
            withdrawalQueue: false,
            yieldStrategy: false,
            asyncVault: false,
            nativeVault: false,
            router: false
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        vm.expectRevert(TokenFactory.InvalidOwner.selector);
        factory.deployERC4626WithAllModules(
            testAsset,
            "Test Vault",
            "TVAULT",
            address(0), // Invalid owner
            config,
            params
        );
    }
    
    function testERC4626RevertsWithZeroAsset() public {
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: false,
            withdrawalQueue: false,
            yieldStrategy: false,
            asyncVault: false,
            nativeVault: false,
            router: false
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        vm.expectRevert(TokenFactory.InvalidAsset.selector);
        factory.deployERC4626WithAllModules(
            address(0), // Invalid asset
            "Test Vault",
            "TVAULT",
            owner,
            config,
            params
        );
    }
    
    // ============================================================================
    // Gas Benchmarking Tests
    // ============================================================================
    
    function testGasERC3525IndividualVsBatch() public {
        // Individual deployments
        uint256 gasStartIndividual = gasleft();
        address token1 = factory.deployERC3525(
            "Test SFT 1",
            "TSFT1",
            18,
            owner
        );
        address module1 = factory.deployERC3525SlotManagerModule(token1);
        address module2 = factory.deployERC3525ValueExchangeModule(token1);
        uint256 gasUsedIndividual = gasStartIndividual - gasleft();
        
        // Batch deployment
        TokenFactory.ERC3525ModuleConfig memory config = TokenFactory.ERC3525ModuleConfig({
            slotManager: true,
            valueExchange: true
        });
        
        uint256 gasStartBatch = gasleft();
        factory.deployERC3525WithAllModules(
            "Test SFT 2",
            "TSFT2",
            18,
            owner,
            config
        );
        uint256 gasUsedBatch = gasStartBatch - gasleft();
        
        emit log_named_uint("Individual deployment gas", gasUsedIndividual);
        emit log_named_uint("Batch deployment gas", gasUsedBatch);
        
        uint256 savings = ((gasUsedIndividual - gasUsedBatch) * 100) / gasUsedIndividual;
        emit log_named_uint("Gas savings percentage", savings);
        
        assertTrue(gasUsedBatch < gasUsedIndividual, "Batch should save gas");
    }
    
    function testGasERC4626IndividualVsBatch() public {
        // Individual deployments
        uint256 gasStartIndividual = gasleft();
        address vault1 = factory.deployERC4626(
            testAsset,
            "Test Vault 1",
            "TVAULT1",
            0, // depositCap
            0, // minimumDeposit
            owner
        );
        factory.deployERC4626FeeStrategyModule(vault1, 100, 200, 50, owner);
        factory.deployERC4626WithdrawalQueueModule(vault1, 1000, 100, 3600);
        uint256 gasUsedIndividual = gasStartIndividual - gasleft();
        
        // Batch deployment
        TokenFactory.ERC4626ModuleConfig memory config = TokenFactory.ERC4626ModuleConfig({
            feeStrategy: true,
            withdrawalQueue: true,
            yieldStrategy: false,
            asyncVault: false,
            nativeVault: false,
            router: false
        });
        
        TokenFactory.ERC4626ModuleParams memory params = _getDefaultERC4626Params();
        
        uint256 gasStartBatch = gasleft();
        factory.deployERC4626WithAllModules(
            testAsset,
            "Test Vault 2",
            "TVAULT2",
            owner,
            config,
            params
        );
        uint256 gasUsedBatch = gasStartBatch - gasleft();
        
        emit log_named_uint("Individual deployment gas", gasUsedIndividual);
        emit log_named_uint("Batch deployment gas", gasUsedBatch);
        
        uint256 savings = ((gasUsedIndividual - gasUsedBatch) * 100) / gasUsedIndividual;
        emit log_named_uint("Gas savings percentage", savings);
        
        assertTrue(gasUsedBatch < gasUsedIndividual, "Batch should save gas");
    }
    
    // ============================================================================
    // Helper Functions
    // ============================================================================
    
    function _getDefaultERC4626Params() internal view returns (TokenFactory.ERC4626ModuleParams memory) {
        return TokenFactory.ERC4626ModuleParams({
            depositCap: 0,
            minimumDeposit: 0,
            managementFeeBps: 100,
            performanceFeeBps: 200,
            withdrawalFeeBps: 50,
            feeRecipient: owner,
            liquidityBuffer: 1000,
            maxQueueSize: 100,
            minWithdrawalDelay: 3600,
            harvestFrequency: 86400,
            rebalanceThreshold: 500,
            minimumFulfillmentDelay: 3600,
            maxPendingRequestsPerUser: 10,
            weth: testAsset // Using test asset as WETH for testing
        });
    }
}

/**
 * @title MockERC20
 * @notice Simple ERC20 for testing
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
}
