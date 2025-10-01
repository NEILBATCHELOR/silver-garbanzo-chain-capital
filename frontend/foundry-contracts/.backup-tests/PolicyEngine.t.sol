// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PolicyEngine.sol";
import "../src/EnhancedERC20Token.sol";

contract PolicyEngineTest is Test {
    PolicyEngine public policyEngine;
    EnhancedERC20Token public token;
    
    address public admin = address(1);
    address public minter = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public blocker = address(5);
    
    event PolicyValidated(address indexed token, address indexed operator, string operation, uint256 amount);
    event OperationRejected(address indexed token, address indexed operator, string operation, string reason);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy PolicyEngine
        policyEngine = new PolicyEngine();
        
        // Create TokenConfig for EnhancedERC20Token
        EnhancedERC20Token.TokenConfig memory config = EnhancedERC20Token.TokenConfig({
            name: "Test Token",
            symbol: "TEST",
            decimals: 18,
            initialSupply: 1000000 * 10**18,
            maxSupply: 10000000 * 10**18,
            initialOwner: admin,
            policyEngineAddress: address(policyEngine),
            mintingEnabled: true,
            burningEnabled: true,
            pausable: true,
            votingEnabled: true,
            permitEnabled: true,
            antiWhaleEnabled: false,
            maxWalletAmount: 0,
            cooldownPeriod: 0,
            buyFeeEnabled: false,
            sellFeeEnabled: false,
            liquidityFeePercentage: 0,
            marketingFeePercentage: 0,
            charityFeePercentage: 0,
            autoLiquidityEnabled: false,
            reflectionEnabled: false,
            reflectionPercentage: 0,
            deflationEnabled: false,
            deflationRate: 0,
            burnOnTransfer: false,
            burnPercentage: 0,
            blacklistEnabled: true,
            tradingStartTime: 0,
            whitelistEnabled: false,
            geographicRestrictionsEnabled: false,
            governanceEnabled: false,
            quorumPercentage: 0,
            proposalThreshold: 0,
            votingDelay: 0,
            votingPeriod: 0,
            timelockDelay: 0
        });
        
        // Deploy token with TokenConfig
        token = new EnhancedERC20Token(config);
        
        // Set up roles in PolicyEngine        policyEngine.grantRole(policyEngine.POLICY_ADMIN(), admin);
        policyEngine.grantRole(policyEngine.POLICY_OPERATOR(), admin);
        
        // Set up roles in token
        token.grantRole(token.MINTER_ROLE(), minter);
        token.grantRole(token.COMPLIANCE_ROLE(), blocker);
        
        // Configure default policies
        configurePolicies();
        
        vm.stopPrank();
    }
    
    function configurePolicies() internal {
        // Mint policy: max 10k, daily 100k, monthly 1M
        policyEngine.registerTokenPolicy(
            address(token),
            "mint",
            10000 * 10**18,
            100000 * 10**18,
            1000000 * 10**18,
            60 // 60 second cooldown
        );
        
        // Burn policy: max 5k, daily 50k, monthly 500k
        policyEngine.registerTokenPolicy(
            address(token),
            "burn",
            5000 * 10**18,
            50000 * 10**18,
            500000 * 10**18,
            30
        );        
        // Transfer policy: max 1k, daily 10k, monthly 100k
        policyEngine.registerTokenPolicy(
            address(token),
            "transfer",
            1000 * 10**18,
            10000 * 10**18,
            100000 * 10**18,
            10
        );
    }
    
    // Test: Mint with valid policy
    function testMintWithValidPolicy() public {
        vm.startPrank(minter);
        
        // Validate operation - should pass
        (bool valid, string memory reason) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            1000 * 10**18
        );
        
        assertTrue(valid, "Operation should be valid");
        assertEq(reason, "", "No reason should be provided for valid operation");
        
        vm.stopPrank();
    }
    
    // Test: Mint exceeds max amount
    function testMintExceedsMaxAmount() public {
        vm.startPrank(minter);
        
        // Validate operation - should fail
        (bool valid, string memory reason) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            20000 * 10**18 // Exceeds 10k max
        );
        
        assertFalse(valid, "Operation should be invalid");
        assertEq(reason, "Amount exceeds maximum", "Should return correct error");
        
        vm.stopPrank();
    }
    
    // Test: Cooldown period enforcement
    function testCooldownPeriod() public {
        vm.startPrank(minter);
        
        // First operation - should pass
        (bool valid1,) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            1000 * 10**18
        );
        assertTrue(valid1, "First operation should pass");
        
        // Second operation immediately - should fail
        (bool valid2, string memory reason2) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            1000 * 10**18
        );
        assertFalse(valid2, "Second operation should fail due to cooldown");
        assertEq(reason2, "Cooldown period active", "Should return cooldown error");
        
        // Fast forward past cooldown
        vm.warp(block.timestamp + 61);
        
        // Third operation after cooldown - should pass
        (bool valid3,) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            1000 * 10**18
        );
        assertTrue(valid3, "Operation after cooldown should pass");
        
        vm.stopPrank();
    }
    
    // Test: Daily limit enforcement
    function testDailyLimit() public {
        vm.startPrank(minter);
        
        // Multiple operations within daily limit
        for (uint i = 0; i < 5; i++) {
            vm.warp(block.timestamp + 61); // Skip cooldown
            
            (bool valid,) = policyEngine.validateOperation(
                address(token),
                minter,
                "mint",
                10000 * 10**18 // 10k each
            );
            assertTrue(valid, "Operations within daily limit should pass");
        }
        
        // Next operation exceeds daily limit
        vm.warp(block.timestamp + 61);
        (bool validExceed, string memory reasonExceed) = policyEngine.validateOperation(
            address(token),
            minter,
            "mint",
            60000 * 10**18 // This would exceed 100k daily limit
        );
        assertFalse(validExceed, "Operation exceeding daily limit should fail");
        assertEq(reasonExceed, "Daily limit exceeded", "Should return daily limit error");
        
        vm.stopPrank();
    }
    
    // Test: Blacklist enforcement
    function testBlacklistEnforcement() public {
        vm.startPrank(admin);
        
        // Blacklist user1
        policyEngine.blacklistAddress(user1);
        
        // Try to validate operation for blacklisted address
        (bool valid, string memory reason) = policyEngine.validateOperation(
            address(token),
            user1,
            "transfer",
            100 * 10**18
        );
        
        assertFalse(valid, "Blacklisted address should not be allowed");
        assertEq(reason, "Operator blacklisted", "Should return blacklist error");
        
        vm.stopPrank();
    }
    
    // Test: Whitelist bypass
    function testWhitelistBypass() public {
        vm.startPrank(admin);
        
        // Whitelist user2
        policyEngine.whitelistAddress(user2);
        
        // Whitelisted address should bypass all limits
        (bool valid,) = policyEngine.validateOperation(
            address(token),
            user2,
            "mint",
            1000000 * 10**18 // Huge amount
        );
        
        assertTrue(valid, "Whitelisted address should bypass limits");
        
        vm.stopPrank();
    }
}