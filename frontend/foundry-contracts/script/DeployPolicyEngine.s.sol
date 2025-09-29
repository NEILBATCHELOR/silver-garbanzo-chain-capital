// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PolicyEngine.sol";
import "../src/EnhancedERC20Token.sol";

contract DeployPolicyEngine is Script {
    // Deployment configuration
    struct DeployConfig {
        address admin;
        address minter;
        address burner;
        address blocker;
        uint256 mintMaxAmount;
        uint256 mintDailyLimit;
        uint256 mintMonthlyLimit;
        uint256 mintCooldown;
        uint256 burnMaxAmount;
        uint256 burnDailyLimit;
        uint256 burnMonthlyLimit;
        uint256 burnCooldown;
        uint256 transferMaxAmount;
        uint256 transferDailyLimit;
        uint256 transferMonthlyLimit;
        uint256 transferCooldown;
        uint256 lockMaxAmount;
        uint256 lockDailyLimit;
        uint256 lockMonthlyLimit;
        uint256 lockCooldown;
    }

    function run() external returns (address policyEngine, address token) {
        // Load deployment configuration
        DeployConfig memory config = getConfig();
        
        // Start broadcast for deployment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PolicyEngine
        policyEngine = address(new PolicyEngine());
        console.log("PolicyEngine deployed at:", policyEngine);

        // Deploy Enhanced ERC20 Token with PolicyEngine integration
        token = address(new EnhancedERC20Token(
            "Chain Capital Token",
            "CCT",
            18,
            1000000 * 10**18, // Initial supply: 1M tokens
            policyEngine
        ));
        console.log("EnhancedERC20Token deployed at:", token);

        // Configure policies for each operation
        configurePolicies(PolicyEngine(policyEngine), token, config);
        
        // Set up roles and permissions
        setupRoles(EnhancedERC20Token(token), config);

        vm.stopBroadcast();

        // Log deployment results
        logDeployment(policyEngine, token);
        
        return (policyEngine, token);
    }

    function getConfig() internal view returns (DeployConfig memory) {
        return DeployConfig({
            admin: vm.envAddress("ADMIN_ADDRESS"),
            minter: vm.envAddress("MINTER_ADDRESS"),
            burner: vm.envAddress("BURNER_ADDRESS"),
            blocker: vm.envAddress("BLOCKER_ADDRESS"),
            mintMaxAmount: 10000 * 10**18,      // 10,000 tokens max per mint
            mintDailyLimit: 100000 * 10**18,    // 100,000 tokens daily limit
            mintMonthlyLimit: 1000000 * 10**18, // 1M tokens monthly limit
            mintCooldown: 60,                    // 60 seconds cooldown
            burnMaxAmount: 5000 * 10**18,       // 5,000 tokens max per burn
            burnDailyLimit: 50000 * 10**18,     // 50,000 tokens daily limit
            burnMonthlyLimit: 500000 * 10**18,  // 500K tokens monthly limit
            burnCooldown: 30,                    // 30 seconds cooldown
            transferMaxAmount: 1000 * 10**18,   // 1,000 tokens max per transfer
            transferDailyLimit: 10000 * 10**18, // 10,000 tokens daily limit
            transferMonthlyLimit: 100000 * 10**18, // 100K tokens monthly limit
            transferCooldown: 10,                // 10 seconds cooldown
            lockMaxAmount: 5000 * 10**18,       // 5,000 tokens max lock
            lockDailyLimit: 20000 * 10**18,     // 20,000 tokens daily lock limit
            lockMonthlyLimit: 200000 * 10**18,  // 200K tokens monthly lock limit
            lockCooldown: 120                    // 120 seconds cooldown
        });
    }

    function configurePolicies(
        PolicyEngine engine,
        address token,
        DeployConfig memory config
    ) internal {
        // Configure Mint Policy
        engine.registerTokenPolicy(
            token,
            "mint",
            config.mintMaxAmount,
            config.mintDailyLimit,
            config.mintMonthlyLimit,
            config.mintCooldown
        );
        console.log("Mint policy configured");

        // Configure Burn Policy
        engine.registerTokenPolicy(
            token,
            "burn",
            config.burnMaxAmount,
            config.burnDailyLimit,
            config.burnMonthlyLimit,
            config.burnCooldown
        );
        console.log("Burn policy configured");

        // Configure Transfer Policy
        engine.registerTokenPolicy(
            token,
            "transfer",
            config.transferMaxAmount,
            config.transferDailyLimit,
            config.transferMonthlyLimit,
            config.transferCooldown
        );
        console.log("Transfer policy configured");

        // Configure Lock Policy
        engine.registerTokenPolicy(
            token,
            "lock",
            config.lockMaxAmount,
            config.lockDailyLimit,
            config.lockMonthlyLimit,
            config.lockCooldown
        );
        console.log("Lock policy configured");

        // Note: Unlock, Block, and Unblock operations don't typically need amount-based policies
        // but can be added if needed
    }

    function setupRoles(EnhancedERC20Token token, DeployConfig memory config) internal {
        // Grant roles
        token.grantRole(token.MINTER_ROLE(), config.minter);
        token.grantRole(token.BURNER_ROLE(), config.burner);
        token.grantRole(token.PAUSER_ROLE(), config.admin);
        token.grantRole(token.COMPLIANCE_ROLE(), config.blocker);
        
        console.log("Roles configured:");
        console.log("  Minter:", config.minter);
        console.log("  Burner:", config.burner);
        console.log("  Blocker:", config.blocker);
        console.log("  Admin:", config.admin);
    }

    function logDeployment(address policyEngine, address token) internal view {
        console.log("\n========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log("PolicyEngine Address:", policyEngine);
        console.log("Token Address:", token);
        console.log("Network:", block.chainid == 1 ? "Mainnet" : 
                    block.chainid == 11155111 ? "Sepolia" :
                    block.chainid == 31337 ? "Local" : "Unknown");
        console.log("========================================\n");
    }
}