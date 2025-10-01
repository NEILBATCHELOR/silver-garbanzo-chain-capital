// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/deployers/UniversalDeployer.sol";
import "../src/optimizations/L2GasOptimizer.sol";
import "../src/masters/ERC20Master.sol";

/**
 * @title MultiChainDeploymentTest
 * @notice Comprehensive test suite for cross-chain deployment
 * @dev Tests CREATE2 determinism, gas costs, and cross-chain consistency
 */
contract MultiChainDeploymentTest is Test {
    using L2GasOptimizer for uint256;
    
    UniversalDeployer public deployer;
    
    // Test configuration
    bytes32 constant TEST_SALT = keccak256("TEST_TOKEN_V1");
    string constant TOKEN_NAME = "Test Token";
    string constant TOKEN_SYMBOL = "TEST";
    uint256 constant MAX_SUPPLY = 1000000 * 10**18;
    uint256 constant INITIAL_SUPPLY = 100000 * 10**18;
    
    function setUp() public {
        deployer = new UniversalDeployer();
    }
    
    /**
     * @notice Test CREATE2 address prediction
     * @dev Predicted address should match actual deployment address
     */
    function testAddressPrediction() public {
        // Predict address
        address predicted = deployer.predictERC20Address(TEST_SALT);
        
        // Deploy token
        address actual = deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: TEST_SALT
            })
        );
        
        // Verify addresses match
        assertEq(predicted, actual, "Address prediction failed");
        
        console.log("Predicted:", predicted);
        console.log("Actual:", actual);
    }
    
    /**
     * @notice Test gas costs on different chains
     * @dev Should show significant savings on L2
     */
    function testGasCostsAcrossChains() public {
        console.log("\n===================================");
        console.log("GAS COST ANALYSIS");
        console.log("===================================");
        
        uint256[] memory chainIds = new uint256[](5);
        chainIds[0] = 1;     // Ethereum
        chainIds[1] = 8453;  // Base
        chainIds[2] = 42161; // Arbitrum
        chainIds[3] = 137;   // Polygon
        chainIds[4] = 10;    // Optimism
        
        uint256 gasUsed = 325000; // Estimated deployment gas
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(
                gasUsed,
                chainIds[i]
            );
            
            (uint256 savingsPercent, uint256 savingsUSD) = 
                L2GasOptimizer.calculateSavings(gasUsed, chainIds[i]);
            
            console.log(L2GasOptimizer.getChainName(chainIds[i]));
            console.log("  Cost: $", costUSD / 100, ".", costUSD % 100);
            console.log("  Savings: ", savingsPercent / 100, "%");
            console.log("");
        }
        
        console.log("===================================\n");
    }
    
    /**
     * @notice Test deployment tracking
     * @dev Should correctly track all deployments
     */
    function testDeploymentTracking() public {
        // Deploy first token
        address token1 = deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: "Token 1",
                symbol: "TK1",
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: keccak256("TOKEN1")
            })
        );
        
        // Deploy second token
        address token2 = deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: "Token 2",
                symbol: "TK2",
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: keccak256("TOKEN2")
            })
        );
        
        // Check total deployments
        assertEq(deployer.getTotalDeployments(), 2, "Wrong deployment count");
        
        // Check deployments by deployer
        address[] memory myDeployments = deployer.getDeploymentsByDeployer(address(this));
        assertEq(myDeployments.length, 2, "Wrong deployer deployment count");
        assertEq(myDeployments[0], token1, "Wrong token 1 address");
        assertEq(myDeployments[1], token2, "Wrong token 2 address");
        
        // Check deployment info
        UniversalDeployer.DeploymentInfo memory info = deployer.getDeploymentInfo(token1);
        assertEq(info.deployer, address(this), "Wrong deployer");
        assertEq(info.implementation, deployer.erc20Master(), "Wrong implementation");
        assertEq(info.chainId, block.chainid, "Wrong chain ID");
    }
    
    /**
     * @notice Test deployed token functionality
     * @dev Tokens should work correctly after deployment
     */
    function testDeployedTokenFunctionality() public {
        // Deploy token
        address tokenAddress = deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: TEST_SALT
            })
        );
        
        ERC20Master token = ERC20Master(tokenAddress);
        
        // Check basic properties
        assertEq(token.name(), TOKEN_NAME, "Wrong name");
        assertEq(token.symbol(), TOKEN_SYMBOL, "Wrong symbol");
        assertEq(token.decimals(), 18, "Wrong decimals");
        assertEq(token.totalSupply(), INITIAL_SUPPLY, "Wrong supply");
        assertEq(token.balanceOf(address(this)), INITIAL_SUPPLY, "Wrong balance");
        
        // Test transfer
        address recipient = address(0x123);
        uint256 amount = 1000 * 10**18;
        token.transfer(recipient, amount);
        assertEq(token.balanceOf(recipient), amount, "Transfer failed");
        
        // Test minting
        token.mint(recipient, amount);
        assertEq(token.balanceOf(recipient), amount * 2, "Mint failed");
    }
    
    /**
     * @notice Test duplicate deployment prevention
     * @dev Should revert when deploying with same salt twice
     */
    function testDuplicateDeploymentPrevention() public {
        // First deployment should succeed
        deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: TEST_SALT
            })
        );
        
        // Second deployment with same salt should fail
        vm.expectRevert();
        deployer.deployERC20Deterministic(
            UniversalDeployer.ERC20Config({
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                maxSupply: MAX_SUPPLY,
                initialSupply: INITIAL_SUPPLY,
                owner: address(this),
                salt: TEST_SALT
            })
        );
    }
}
