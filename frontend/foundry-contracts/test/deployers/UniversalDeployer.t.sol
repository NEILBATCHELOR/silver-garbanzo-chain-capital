// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/deployers/UniversalDeployer.sol";
import "../../src/masters/ERC20Master.sol";

contract UniversalDeployerTest is Test {
    UniversalDeployer public deployer;
    
    address public user1 = address(1);
    address public user2 = address(2);
    
    // Test constants
    string constant NAME = "Test Token";
    string constant SYMBOL = "TEST";
    uint256 constant MAX_SUPPLY = 1_000_000 * 10**18;
    uint256 constant INITIAL_SUPPLY = 100_000 * 10**18;
    
    event TokenDeployed(
        address indexed proxy,
        address indexed implementation,
        address indexed deployer,
        uint256 chainId,
        bytes32 salt,
        string standard
    );
    
    function setUp() public {
        deployer = new UniversalDeployer();
    }
    
    // ============ Initialization Tests ============
    
    function testMasterAddressesSet() public view {
        assertTrue(deployer.erc20Master() != address(0));
    }
    
    function testTotalDeploymentsInitially() public view {
        assertEq(deployer.getTotalDeployments(), 0);
    }
    
    // ============ Deterministic Deployment Tests ============
    
    function testDeployERC20Deterministic() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(1))
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        
        assertTrue(proxy != address(0));
        
        ERC20Master token = ERC20Master(proxy);
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(user1), INITIAL_SUPPLY);
    }
    
    function testDeployERC20EmitsEvent() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(2))
        });
        
        vm.expectEmit(false, false, true, true);
        emit TokenDeployed(
            address(0), // proxy address not known yet
            deployer.erc20Master(),
            address(this),
            block.chainid,
            config.salt,
            "ERC20"
        );
        
        deployer.deployERC20Deterministic(config);
    }
    
    function testDeploymentTracking() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(3))
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        
        assertEq(deployer.getTotalDeployments(), 1);
        
        (
            address deployerAddr,
            address implementation,
            uint256 chainId,
            uint256 timestamp,
            bytes32 salt,
            string memory standard
        ) = deployer.deployments(proxy);
        
        assertEq(deployerAddr, address(this));
        assertEq(implementation, deployer.erc20Master());
        assertEq(chainId, block.chainid);
        assertEq(salt, config.salt);
        assertEq(standard, "ERC20");
    }
    
    // ============ Address Prediction Tests ============
    
    function testPredictERC20Address() public view {
        bytes32 salt = bytes32(uint256(4));
        address predicted = deployer.predictERC20Address(salt);
        
        assertTrue(predicted != address(0));
    }
    
    function testPredictedAddressMatchesDeployed() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(5))
        });
        
        address predicted = deployer.predictERC20Address(config.salt);
        address deployed = deployer.deployERC20Deterministic(config);
        
        assertEq(predicted, deployed);
    }
    
    function testDifferentSaltsDifferentAddresses() public view {
        bytes32 salt1 = bytes32(uint256(6));
        bytes32 salt2 = bytes32(uint256(7));
        
        address predicted1 = deployer.predictERC20Address(salt1);
        address predicted2 = deployer.predictERC20Address(salt2);
        
        assertTrue(predicted1 != predicted2);
    }
    
    // ============ Configuration Validation Tests ============
    
    function testCannotDeployWithEmptyName() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: "",
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(8))
        });
        
        vm.expectRevert(UniversalDeployer.InvalidConfiguration.selector);
        deployer.deployERC20Deterministic(config);
    }
    
    function testCannotDeployWithEmptySymbol() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: "",
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(9))
        });
        
        vm.expectRevert(UniversalDeployer.InvalidConfiguration.selector);
        deployer.deployERC20Deterministic(config);
    }
    
    function testCannotDeploySameSaltTwice() public {
        bytes32 salt = bytes32(uint256(10));
        
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: salt
        });
        
        deployer.deployERC20Deterministic(config);
        
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalDeployer.AlreadyDeployed.selector,
                deployer.predictERC20Address(salt)
            )
        );
        deployer.deployERC20Deterministic(config);
    }
    
    // ============ Deployment Queries Tests ============
    
    function testGetDeploymentsByDeployer() public {
        vm.startPrank(user1);
        
        UniversalDeployer.ERC20Config memory config1 = UniversalDeployer.ERC20Config({
            name: "Token 1",
            symbol: "TK1",
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(11))
        });
        
        UniversalDeployer.ERC20Config memory config2 = UniversalDeployer.ERC20Config({
            name: "Token 2",
            symbol: "TK2",
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(12))
        });
        
        deployer.deployERC20Deterministic(config1);
        deployer.deployERC20Deterministic(config2);
        
        vm.stopPrank();
        
        address[] memory deployments = deployer.getDeploymentsByDeployer(user1);
        assertEq(deployments.length, 2);
    }
    
    function testGetDeploymentInfo() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(13))
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        
        (
            address deployerAddr,
            ,
            ,
            uint256 timestamp,
            ,
            string memory standard
        ) = deployer.deployments(proxy);
        
        assertEq(deployerAddr, address(this));
        assertEq(standard, "ERC20");
        assertTrue(timestamp > 0);
    }
    
    // ============ Edge Cases Tests ============
    
    function testDeployWithZeroSalt() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(0)
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        assertTrue(proxy != address(0));
    }
    
    function testDeployWithMaxSalt() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(type(uint256).max)
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        assertTrue(proxy != address(0));
    }
    
    function testDeployWithZeroInitialSupply() public {
        UniversalDeployer.ERC20Config memory config = UniversalDeployer.ERC20Config({
            name: NAME,
            symbol: SYMBOL,
            maxSupply: MAX_SUPPLY,
            initialSupply: 0,
            owner: user1,
            salt: bytes32(uint256(14))
        });
        
        address proxy = deployer.deployERC20Deterministic(config);
        
        ERC20Master token = ERC20Master(proxy);
        assertEq(token.totalSupply(), 0);
    }
    
    function testMultipleDeployers() public {
        // User1 deploys
        vm.prank(user1);
        UniversalDeployer.ERC20Config memory config1 = UniversalDeployer.ERC20Config({
            name: "Token 1",
            symbol: "TK1",
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user1,
            salt: bytes32(uint256(15))
        });
        address proxy1 = deployer.deployERC20Deterministic(config1);
        
        // User2 deploys (same salt, different deployer)
        vm.prank(user2);
        UniversalDeployer.ERC20Config memory config2 = UniversalDeployer.ERC20Config({
            name: "Token 2",
            symbol: "TK2",
            maxSupply: MAX_SUPPLY,
            initialSupply: INITIAL_SUPPLY,
            owner: user2,
            salt: bytes32(uint256(15)) // same salt
        });
        address proxy2 = deployer.deployERC20Deterministic(config2);
        
        // Different deployers should produce different addresses even with same salt
        assertTrue(proxy1 != proxy2);
    }
}
