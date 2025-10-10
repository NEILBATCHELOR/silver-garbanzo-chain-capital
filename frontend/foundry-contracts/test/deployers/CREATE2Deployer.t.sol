// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/deployers/CREATE2Deployer.sol";
import "../../src/masters/ERC20Master.sol";

contract CREATE2DeployerTest is Test {
    CREATE2Deployer public deployer;
    
    address public user1 = address(1);
    address public user2 = address(2);
    
    // Events
    event ContractDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        address indexed deployer
    );
    
    function setUp() public {
        deployer = new CREATE2Deployer();
    }
    
    // ============ Deployment Tests ============
    
    function testDeploy() public {
        bytes32 salt = bytes32(uint256(1));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        vm.expectEmit(false, true, true, true);
        emit ContractDeployed(address(0), salt, address(this));
        
        address deployed = deployer.deploy(salt, bytecode);
        
        assertTrue(deployed != address(0));
        assertTrue(deployer.isDeployed(deployed));
    }
    
    function testDeployByUser() public {
        bytes32 salt = bytes32(uint256(2));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        vm.prank(user1);
        address deployed = deployer.deploy(salt, bytecode);
        
        assertTrue(deployed != address(0));
        assertTrue(deployer.isDeployed(deployed));
    }
    
    function testDeployWithDifferentSalts() public {
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        bytes32 salt1 = bytes32(uint256(10));
        bytes32 salt2 = bytes32(uint256(20));
        
        address deployed1 = deployer.deploy(salt1, bytecode);
        address deployed2 = deployer.deploy(salt2, bytecode);
        
        // Different salts should produce different addresses
        assertTrue(deployed1 != deployed2);
        assertTrue(deployer.isDeployed(deployed1));
        assertTrue(deployer.isDeployed(deployed2));
    }
    
    function testCannotDeployWithSameSaltTwice() public {
        bytes32 salt = bytes32(uint256(3));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        deployer.deploy(salt, bytecode);
        
        // Second deployment with same salt should fail
        vm.expectRevert();
        deployer.deploy(salt, bytecode);
    }
    
    function testDeployEmitsEvent() public {
        bytes32 salt = bytes32(uint256(4));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        // Predict address for event verification
        address predicted = deployer.predictAddress(salt, bytecode, address(deployer));
        
        vm.expectEmit(true, true, true, true);
        emit ContractDeployed(predicted, salt, address(this));
        
        deployer.deploy(salt, bytecode);
    }
    
    // ============ Address Prediction Tests ============
    
    function testPredictAddress() public view {
        bytes32 salt = bytes32(uint256(5));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address predicted = deployer.predictAddress(salt, bytecode, address(deployer));
        
        assertTrue(predicted != address(0));
    }
    
    function testPredictAddressAccuracy() public {
        bytes32 salt = bytes32(uint256(6));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address predicted = deployer.predictAddress(salt, bytecode, address(deployer));
        address deployed = deployer.deploy(salt, bytecode);
        
        // Predicted address should match deployed address
        assertEq(predicted, deployed);
    }
    
    function testPredictAddressDifferentSalts() public view {
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        bytes32 salt1 = bytes32(uint256(11));
        bytes32 salt2 = bytes32(uint256(12));
        
        address predicted1 = deployer.predictAddress(salt1, bytecode, address(deployer));
        address predicted2 = deployer.predictAddress(salt2, bytecode, address(deployer));
        
        // Different salts should predict different addresses
        assertTrue(predicted1 != predicted2);
    }
    
    function testPredictAddressDifferentDeployers() public view {
        bytes32 salt = bytes32(uint256(7));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address predicted1 = deployer.predictAddress(salt, bytecode, address(deployer));
        address predicted2 = deployer.predictAddress(salt, bytecode, user1);
        
        // Same salt but different deployers should predict different addresses
        assertTrue(predicted1 != predicted2);
    }
    
    // ============ isDeployed Tests ============
    
    function testIsDeployedForNonContract() public view {
        assertFalse(deployer.isDeployed(address(999)));
    }
    
    function testIsDeployedForEOA() public view {
        assertFalse(deployer.isDeployed(user1));
    }
    
    function testIsDeployedForContract() public {
        bytes32 salt = bytes32(uint256(8));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address deployed = deployer.deploy(salt, bytecode);
        
        assertTrue(deployer.isDeployed(deployed));
    }
    
    function testIsDeployedForZeroAddress() public view {
        assertFalse(deployer.isDeployed(address(0)));
    }
    
    // ============ Edge Case Tests ============
    
    function testDeployEmptyBytecode() public {
        bytes32 salt = bytes32(uint256(9));
        bytes memory bytecode = new bytes(0);
        
        // Empty bytecode should revert
        vm.expectRevert();
        deployer.deploy(salt, bytecode);
    }
    
    function testDeployWithZeroSalt() public {
        bytes32 salt = bytes32(0);
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address deployed = deployer.deploy(salt, bytecode);
        
        assertTrue(deployed != address(0));
        assertTrue(deployer.isDeployed(deployed));
    }
    
    function testDeployWithMaxSalt() public {
        bytes32 salt = bytes32(type(uint256).max);
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address deployed = deployer.deploy(salt, bytecode);
        
        assertTrue(deployed != address(0));
        assertTrue(deployer.isDeployed(deployed));
    }
    
    function testPredictAddressBeforeDeployment() public view {
        bytes32 salt = bytes32(uint256(100));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        address predicted = deployer.predictAddress(salt, bytecode, address(deployer));
        
        // Predicted address should not be deployed yet
        assertFalse(deployer.isDeployed(predicted));
    }
    
    // ============ Multiple Deployments Tests ============
    
    function testMultipleDeploymentsByDifferentUsers() public {
        bytes32 salt = bytes32(uint256(13));
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        // User1 deploys
        vm.prank(user1);
        address deployed1 = deployer.deploy(salt, bytecode);
        
        // User2 can deploy with same salt (CREATE2 considers deployer address)
        vm.prank(user2);
        address deployed2 = deployer.deploy(salt, bytecode);
        
        // Both should be deployed
        assertTrue(deployer.isDeployed(deployed1));
        assertTrue(deployer.isDeployed(deployed2));
        // But should be different addresses
        assertTrue(deployed1 != deployed2);
    }
    
    function testSequentialDeploymentsWithDifferentSalts() public {
        bytes memory bytecode = type(ERC20Master).creationCode;
        
        for (uint i = 100; i < 105; i++) {
            bytes32 salt = bytes32(i);
            address deployed = deployer.deploy(salt, bytecode);
            assertTrue(deployer.isDeployed(deployed));
        }
    }
}
