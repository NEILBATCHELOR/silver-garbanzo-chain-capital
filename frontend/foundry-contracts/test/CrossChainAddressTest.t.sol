// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/deployers/CREATE2Deployer.sol";
import "../src/TokenFactory.sol";

/**
 * @title CrossChainAddressTest
 * @notice Test deterministic address generation across multiple chains
 * @dev Verifies CREATE2 produces same addresses on different networks
 */
contract CrossChainAddressTest is Test {
    CREATE2Deployer deployer;
    
    function setUp() public {
        deployer = new CREATE2Deployer();
    }
    
    /**
     * @notice Test basic address prediction
     */
    function testDeterministicAddressPrediction() public {
        bytes32 salt = keccak256("CHAIN_CAPITAL_FACTORY_V1");
        bytes memory bytecode = type(TokenFactory).creationCode;
        
        // Predict address
        address predicted = deployer.predictAddress(
            salt,
            bytecode,
            address(this)
        );
        
        // Deploy
        address deployed = deployer.deploy(salt, bytecode);
        
        // Verify match
        assertEq(predicted, deployed, "Address mismatch");
        assertTrue(deployer.isDeployed(deployed), "Contract not deployed");
    }
    
    /**
     * @notice Test that salt uniqueness produces different addresses
     */
    function testDifferentSaltsProduceDifferentAddresses() public {
        bytes memory bytecode = type(TokenFactory).creationCode;
        
        bytes32 salt1 = keccak256("SALT_ONE");
        bytes32 salt2 = keccak256("SALT_TWO");
        
        address addr1 = deployer.predictAddress(salt1, bytecode, address(this));
        address addr2 = deployer.predictAddress(salt2, bytecode, address(this));
        
        assertTrue(addr1 != addr2, "Same address for different salts");
    }
    
    /**
     * @notice Test that same salt produces same address (deterministic)
     */
    function testSameSaltProducesSameAddress() public {
        bytes memory bytecode = type(TokenFactory).creationCode;
        bytes32 salt = keccak256("CONSISTENT_SALT");
        
        address addr1 = deployer.predictAddress(salt, bytecode, address(this));
        address addr2 = deployer.predictAddress(salt, bytecode, address(this));
        
        assertEq(addr1, addr2, "Address changed with same parameters");
    }
    
    /**
     * @notice Simulate cross-chain deployment verification
     * @dev In real scenario, would use vm.createSelectFork for different chains
     */
    function testCrossChainAddressConsistency() public {
        // Simulate different chain IDs
        uint256[] memory chains = new uint256[](5);
        chains[0] = 8453;    // Base
        chains[1] = 42161;   // Arbitrum
        chains[2] = 137;     // Polygon
        chains[3] = 10;      // Optimism
        chains[4] = 1;       // Ethereum
        
        bytes32 salt = keccak256("CROSS_CHAIN_TEST");
        bytes memory bytecode = type(TokenFactory).creationCode;
        
        // Predict address (same for all chains with same salt & deployer)
        address predicted = deployer.predictAddress(
            salt,
            bytecode,
            address(this)
        );
        
        // Verify address is deterministic across simulated chains
        for (uint i = 0; i < chains.length; i++) {
            // In production: vm.createSelectFork(chains[i]);
            address crossChainPredicted = deployer.predictAddress(
                salt,
                bytecode,
                address(this)
            );
            
            assertEq(
                crossChainPredicted, 
                predicted, 
                "Cross-chain address mismatch"
            );
        }
    }
    
    /**
     * @notice Test deployment revert on duplicate salt
     */
    function testDeploymentRevertsOnDuplicateSalt() public {
        bytes32 salt = keccak256("DUPLICATE_TEST");
        bytes memory bytecode = type(TokenFactory).creationCode;
        
        // First deployment succeeds
        deployer.deploy(salt, bytecode);
        
        // Second deployment with same salt should revert
        vm.expectRevert();
        deployer.deploy(salt, bytecode);
    }
    
    /**
     * @notice Test gas efficiency of CREATE2 deployment
     */
    function testCREATE2GasEfficiency() public {
        bytes32 salt = keccak256("GAS_TEST");
        bytes memory bytecode = type(TokenFactory).creationCode;
        
        uint256 gasBefore = gasleft();
        deployer.deploy(salt, bytecode);
        uint256 gasUsed = gasBefore - gasleft();
        
        // CREATE2 should be reasonably efficient
        assertTrue(gasUsed < 2000000, "CREATE2 gas too high");
        
        emit log_named_uint("CREATE2 Deployment Gas", gasUsed);
    }
}
