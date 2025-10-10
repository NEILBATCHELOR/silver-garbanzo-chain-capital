// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/optimizations/L2GasOptimizer.sol";

contract L2GasOptimizerTest is Test {
    using L2GasOptimizer for uint256;
    
    // Chain IDs
    uint256 constant ETHEREUM_MAINNET = 1;
    uint256 constant BASE_MAINNET = 8453;
    uint256 constant ARBITRUM_MAINNET = 42161;
    uint256 constant POLYGON_MAINNET = 137;
    uint256 constant OPTIMISM_MAINNET = 10;
    
    // Test gas amounts
    uint256 constant SMALL_DEPLOYMENT_GAS = 100_000;
    uint256 constant MEDIUM_DEPLOYMENT_GAS = 500_000;
    uint256 constant LARGE_DEPLOYMENT_GAS = 1_300_000;
    
    // ============ Gas Price Tests ============
    
    function testGetGasPriceEthereum() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(ETHEREUM_MAINNET);
        assertEq(gasPrice, 30 gwei);
    }
    
    function testGetGasPriceBase() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(BASE_MAINNET);
        assertEq(gasPrice, 0.01 gwei);
    }
    
    function testGetGasPriceArbitrum() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(ARBITRUM_MAINNET);
        assertEq(gasPrice, 0.1 gwei);
    }
    
    function testGetGasPricePolygon() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(POLYGON_MAINNET);
        assertEq(gasPrice, 30 gwei);
    }
    
    function testGetGasPriceOptimism() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(OPTIMISM_MAINNET);
        assertEq(gasPrice, 0.001 gwei);
    }
    
    function testGetGasPriceUnknownChain() public pure {
        uint256 gasPrice = L2GasOptimizer.getGasPrice(999);
        assertEq(gasPrice, 30 gwei); // Should default to Ethereum
    }
    
    // ============ Chain Name Tests ============
    
    function testGetChainNameEthereum() public pure {
        string memory name = L2GasOptimizer.getChainName(ETHEREUM_MAINNET);
        assertEq(name, "Ethereum");
    }
    
    function testGetChainNameBase() public pure {
        string memory name = L2GasOptimizer.getChainName(BASE_MAINNET);
        assertEq(name, "Base");
    }
    
    function testGetChainNameArbitrum() public pure {
        string memory name = L2GasOptimizer.getChainName(ARBITRUM_MAINNET);
        assertEq(name, "Arbitrum");
    }
    
    function testGetChainNamePolygon() public pure {
        string memory name = L2GasOptimizer.getChainName(POLYGON_MAINNET);
        assertEq(name, "Polygon");
    }
    
    function testGetChainNameOptimism() public pure {
        string memory name = L2GasOptimizer.getChainName(OPTIMISM_MAINNET);
        assertEq(name, "Optimism");
    }
    
    function testGetChainNameUnknown() public pure {
        string memory name = L2GasOptimizer.getChainName(999);
        assertEq(name, "Unknown");
    }
    
    // ============ Deployment Cost Tests ============
    
    function testCalculateDeploymentCostEthereum() public pure {
        uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, ETHEREUM_MAINNET);
        // 1,300,000 gas * 30 gwei * $3,500 / 1e18 = expected cost
        assertTrue(costUSD > 0);
    }
    
    function testCalculateDeploymentCostBase() public pure {
        uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, BASE_MAINNET);
        // Base should be much cheaper than Ethereum
        uint256 ethereumCost = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, ETHEREUM_MAINNET);
        assertTrue(costUSD < ethereumCost);
    }
    
    function testCalculateDeploymentCostOptimism() public pure {
        uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, OPTIMISM_MAINNET);
        // Optimism should be cheapest
        uint256 baseCost = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, BASE_MAINNET);
        assertTrue(costUSD < baseCost);
    }
    
    function testDeploymentCostScalesWithGas() public pure {
        uint256 smallCost = L2GasOptimizer.calculateDeploymentCost(SMALL_DEPLOYMENT_GAS, BASE_MAINNET);
        uint256 largeCost = L2GasOptimizer.calculateDeploymentCost(LARGE_DEPLOYMENT_GAS, BASE_MAINNET);
        
        // Large deployment should cost more
        assertTrue(largeCost > smallCost);
        
        // Should scale approximately linearly
        uint256 ratio = (largeCost * 100) / smallCost;
        uint256 expectedRatio = (LARGE_DEPLOYMENT_GAS * 100) / SMALL_DEPLOYMENT_GAS;
        assertEq(ratio, expectedRatio);
    }
    
    // ============ Savings Calculation Tests ============
    
    function testCalculateSavingsBase() public pure {
        (uint256 savingsPercent, uint256 savingsUSD) = L2GasOptimizer.calculateSavings(
            LARGE_DEPLOYMENT_GAS, 
            BASE_MAINNET
        );
        
        // Base should save >99% compared to Ethereum
        assertTrue(savingsPercent > 9900); // >99% (scaled by 100)
        assertTrue(savingsUSD > 0);
    }
    
    function testCalculateSavingsOptimism() public pure {
        (uint256 savingsPercent, uint256 savingsUSD) = L2GasOptimizer.calculateSavings(
            LARGE_DEPLOYMENT_GAS,
            OPTIMISM_MAINNET
        );
        
        // Optimism should save >99.9% compared to Ethereum
        assertTrue(savingsPercent > 9990); // >99.9%
        assertTrue(savingsUSD > 0);
    }
    
    function testCalculateSavingsArbitrum() public pure {
        (uint256 savingsPercent, uint256 savingsUSD) = L2GasOptimizer.calculateSavings(
            LARGE_DEPLOYMENT_GAS,
            ARBITRUM_MAINNET
        );
        
        // Arbitrum should save >99% compared to Ethereum
        assertTrue(savingsPercent > 9900);
        assertTrue(savingsUSD > 0);
    }
    
    function testCalculateSavingsEthereum() public pure {
        (uint256 savingsPercent, uint256 savingsUSD) = L2GasOptimizer.calculateSavings(
            LARGE_DEPLOYMENT_GAS,
            ETHEREUM_MAINNET
        );
        
        // No savings when comparing Ethereum to itself
        assertEq(savingsPercent, 0);
        assertEq(savingsUSD, 0);
    }
    
    // ============ Calldata Optimization Tests ============
    
    function testOptimizeCalldataNoZeros() public pure {
        bytes memory data = hex"0102030405";
        bytes memory optimized = L2GasOptimizer.optimizeCalldata(data);
        
        // No zeros, so no optimization
        assertEq(optimized.length, data.length);
    }
    
    function testOptimizeCalldataSomeZeros() public pure {
        bytes memory data = hex"01020000000000030405";
        bytes memory optimized = L2GasOptimizer.optimizeCalldata(data);
        
        // Function currently returns original data
        // This is a placeholder for future RLE compression
        assertEq(optimized.length, data.length);
    }
    
    function testOptimizeCalldataManyZeros() public pure {
        // Create data with >10% zeros
        bytes memory data = new bytes(100);
        for (uint i = 0; i < 50; i++) {
            data[i] = 0x00; // 50% zeros
        }
        for (uint i = 50; i < 100; i++) {
            data[i] = 0x01;
        }
        
        bytes memory optimized = L2GasOptimizer.optimizeCalldata(data);
        
        // Currently returns original (compression not implemented)
        assertEq(optimized.length, data.length);
    }
    
    function testOptimizeCalldataEmpty() public pure {
        bytes memory data = new bytes(0);
        bytes memory optimized = L2GasOptimizer.optimizeCalldata(data);
        
        assertEq(optimized.length, 0);
    }
    
    // ============ Edge Case Tests ============
    
    function testCalculateDeploymentCostZeroGas() public pure {
        uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(0, BASE_MAINNET);
        assertEq(costUSD, 0);
    }
    
    function testCalculateDeploymentCostVeryLargeGas() public pure {
        uint256 largeGas = 10_000_000; // 10M gas
        uint256 costUSD = L2GasOptimizer.calculateDeploymentCost(largeGas, ETHEREUM_MAINNET);
        assertTrue(costUSD > 0);
    }
    
    function testGasPriceConsistency() public pure {
        // Verify all known chains return non-zero gas prices
        assertTrue(L2GasOptimizer.getGasPrice(ETHEREUM_MAINNET) > 0);
        assertTrue(L2GasOptimizer.getGasPrice(BASE_MAINNET) > 0);
        assertTrue(L2GasOptimizer.getGasPrice(ARBITRUM_MAINNET) > 0);
        assertTrue(L2GasOptimizer.getGasPrice(POLYGON_MAINNET) > 0);
        assertTrue(L2GasOptimizer.getGasPrice(OPTIMISM_MAINNET) > 0);
    }
}
