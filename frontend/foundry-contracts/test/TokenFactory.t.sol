// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";

contract TokenFactoryTest is Test {
    TokenFactory public factory;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    // Test constants
    string constant NAME = "Test Token";
    string constant SYMBOL = "TEST";
    uint256 constant MAX_SUPPLY = 1_000_000 * 10**18;
    uint256 constant INITIAL_SUPPLY = 100_000 * 10**18;
    
    function setUp() public {
        // Deploy factory without infrastructure (pass address(0) to disable)
        factory = new TokenFactory(
            address(0), // policyEngine
            address(0), // policyRegistry
            address(0), // tokenRegistry
            address(0), // upgradeGovernor
            address(0)  // l2GasOptimizer
        );
    }
    
    // ============ Initialization Tests ============
    
    function testFactoryInitialized() public view {
        assertTrue(factory.erc20Master() != address(0));
        assertTrue(factory.erc721Master() != address(0));
        assertTrue(factory.erc1155Master() != address(0));
        assertTrue(factory.erc3525Master() != address(0));
        assertTrue(factory.erc4626Master() != address(0));
        assertTrue(factory.erc1400Master() != address(0));
        assertTrue(factory.erc20RebasingMaster() != address(0));
    }
    
    function testBeaconsDeployed() public view {
        assertTrue(factory.erc20Beacon() != address(0));
        assertTrue(factory.erc721Beacon() != address(0));
        assertTrue(factory.erc1155Beacon() != address(0));
        assertTrue(factory.erc3525Beacon() != address(0));
        assertTrue(factory.erc4626Beacon() != address(0));
        assertTrue(factory.erc1400Beacon() != address(0));
    }
    
    function testExtensionModuleMastersDeployed() public view {
        assertTrue(factory.complianceModuleMaster() != address(0));
        assertTrue(factory.vestingModuleMaster() != address(0));
        assertTrue(factory.royaltyModuleMaster() != address(0));
        assertTrue(factory.feeModuleMaster() != address(0));
    }
    
    // ============ ERC20 Deployment Tests ============
    
    function testDeployERC20() public {
        address token = factory.deployERC20(NAME, SYMBOL, MAX_SUPPLY, INITIAL_SUPPLY, user1);
        
        assertTrue(token != address(0));
        
        ERC20Master erc20 = ERC20Master(token);
        assertEq(erc20.name(), NAME);
        assertEq(erc20.symbol(), SYMBOL);
        assertEq(erc20.totalSupply(), INITIAL_SUPPLY);
        assertEq(erc20.balanceOf(user1), INITIAL_SUPPLY);
    }
    
    function testDeployERC20TracksDeployment() public {
        address token = factory.deployERC20(NAME, SYMBOL, MAX_SUPPLY, INITIAL_SUPPLY, user1);
        
        // Check mapping
        address[] memory tokens = factory.getDeployedTokens(user1);
        assertEq(tokens.length, 1);
        assertEq(tokens[0], token);
        
        // Check array  
        assertEq(factory.allDeployedTokens(0), token);
    }
    
    function testCannotDeployERC20WithZeroOwner() public {
        vm.expectRevert(TokenFactory.InvalidOwner.selector);
        factory.deployERC20(NAME, SYMBOL, MAX_SUPPLY, INITIAL_SUPPLY, address(0));
    }
    
    function testDeployMultipleERC20Tokens() public {
        address token1 = factory.deployERC20("Token 1", "TK1", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        address token2 = factory.deployERC20("Token 2", "TK2", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        
        address[] memory tokens = factory.getDeployedTokens(user1);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], token1);
        assertEq(tokens[1], token2);
    }
    
    // ============ ERC721 Deployment Tests ============
    
    function testDeployERC721() public {
        string memory baseURI = "https://example.com/";
        uint256 maxSupply = 10000;
        address collection = factory.deployERC721(NAME, SYMBOL, baseURI, maxSupply, user1);
        
        assertTrue(collection != address(0));
        
        ERC721Master nft = ERC721Master(collection);
        assertEq(nft.name(), NAME);
        assertEq(nft.symbol(), SYMBOL);
    }
    
    function testCannotDeployERC721WithZeroOwner() public {
        vm.expectRevert(TokenFactory.InvalidOwner.selector);
        factory.deployERC721(NAME, SYMBOL, "https://example.com/", 10000, address(0));
    }
    
    // ============ ERC1155 Deployment Tests ============
    
    function testDeployERC1155() public {
        string memory uri = "https://example.com/{id}";
        address collection = factory.deployERC1155(NAME, SYMBOL, uri, user1);
        
        assertTrue(collection != address(0));
        
        ERC1155Master multiToken = ERC1155Master(collection);
        assertEq(multiToken.name(), NAME);
    }
    
    // ============ ERC3525 Deployment Tests ============
    
    function testDeployERC3525() public {
        uint8 decimals = 18;
        address token = factory.deployERC3525(NAME, SYMBOL, decimals, user1);
        
        assertTrue(token != address(0));
        
        ERC3525Master sft = ERC3525Master(token);
        assertEq(sft.name(), NAME);
    }
    
    // ============ ERC4626 Deployment Tests ============
    
    function testDeployERC4626() public {
        // First deploy an asset token
        address asset = factory.deployERC20("Asset Token", "ASSET", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        
        uint256 depositCap = 1_000_000 * 10**18;
        uint256 minimumDeposit = 1 * 10**18;
        address vault = factory.deployERC4626(asset, NAME, SYMBOL, depositCap, minimumDeposit, user1);
        
        assertTrue(vault != address(0));
        
        ERC4626Master vaultToken = ERC4626Master(vault);
        assertEq(address(vaultToken.asset()), asset);
    }
    
    function testCannotDeployERC4626WithZeroAsset() public {
        uint256 depositCap = 1_000_000 * 10**18;
        uint256 minimumDeposit = 1 * 10**18;
        vm.expectRevert(TokenFactory.InvalidAsset.selector);
        factory.deployERC4626(address(0), NAME, SYMBOL, depositCap, minimumDeposit, user1);
    }
    
    // ============ ERC1400 Deployment Tests ============
    
    function testDeployERC1400() public {
        uint8 decimals = 18;
        bytes32[] memory defaultPartitions = new bytes32[](2);
        defaultPartitions[0] = bytes32("TRANCHE_A");
        defaultPartitions[1] = bytes32("TRANCHE_B");
        bool isControllable = true;
        
        address securityToken = factory.deployERC1400(NAME, SYMBOL, decimals, defaultPartitions, isControllable, user1);
        
        assertTrue(securityToken != address(0));
        
        ERC1400Master st = ERC1400Master(securityToken);
        assertEq(st.name(), NAME);
    }
    
    // ============ ERC20 Rebasing Deployment Tests ============
    
    function testDeployERC20Rebasing() public {
        address rebasingToken = factory.deployERC20Rebasing(NAME, SYMBOL, INITIAL_SUPPLY, user1);
        
        assertTrue(rebasingToken != address(0));
        
        ERC20RebasingMaster rbToken = ERC20RebasingMaster(rebasingToken);
        assertEq(rbToken.name(), NAME);
        assertEq(rbToken.totalSupply(), INITIAL_SUPPLY);
        assertEq(rbToken.getTotalShares(), INITIAL_SUPPLY);
    }
    
    // ============ Beacon Deployment Tests ============
    
    function testDeployERC20UsingBeacon() public {
        address token = factory.deployERC20WithBeacon(NAME, SYMBOL, MAX_SUPPLY, INITIAL_SUPPLY, user1);
        
        assertTrue(token != address(0));
        
        ERC20Master erc20 = ERC20Master(token);
        assertEq(erc20.name(), NAME);
    }
    
    function testDeployERC721UsingBeacon() public {
        string memory baseURI = "https://example.com/";
        uint256 maxSupply = 10000;
        address collection = factory.deployERC721WithBeacon(NAME, SYMBOL, baseURI, maxSupply, user1);
        
        assertTrue(collection != address(0));
    }
    
    // ============ Multiple Deployments Tests ============
    
    function testMultipleDeploymentsByDifferentOwners() public {
        address token1 = factory.deployERC20("Token 1", "TK1", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        address token2 = factory.deployERC20("Token 2", "TK2", MAX_SUPPLY, INITIAL_SUPPLY, user2);
        
        address[] memory user1Tokens = factory.getDeployedTokens(user1);
        address[] memory user2Tokens = factory.getDeployedTokens(user2);
        
        assertEq(user1Tokens.length, 1);
        assertEq(user2Tokens.length, 1);
        assertEq(user1Tokens[0], token1);
        assertEq(user2Tokens[0], token2);
    }
    
    function testMultipleTokenTypes() public {
        address erc20 = factory.deployERC20("ERC20", "E20", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        address erc721 = factory.deployERC721("ERC721", "E721", "https://example.com/", 10000, user1);
        address erc1155 = factory.deployERC1155("ERC1155", "E1155", "https://example.com/{id}", user1);
        
        assertEq(factory.allDeployedTokens(0), erc20);
        assertEq(factory.allDeployedTokens(1), erc721);
        assertEq(factory.allDeployedTokens(2), erc1155);
    }
    
    // ============ Edge Cases ============
    
    function testDeployWithZeroInitialSupply() public {
        address token = factory.deployERC20(NAME, SYMBOL, MAX_SUPPLY, 0, user1);
        
        ERC20Master erc20 = ERC20Master(token);
        assertEq(erc20.totalSupply(), 0);
    }
    
    function testFactoryOwnership() public view {
        assertEq(factory.owner(), address(this));
    }
    
    // ============ Gas Optimization Tests ============
    
    function testMinimalProxyGasSavings() public {
        // Standard deployment
        uint256 gasBefore = gasleft();
        factory.deployERC20("Standard", "STD", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        uint256 gasUsedStandard = gasBefore - gasleft();
        
        // Beacon deployment
        gasBefore = gasleft();
        factory.deployERC20WithBeacon("Beacon", "BCN", MAX_SUPPLY, INITIAL_SUPPLY, user1);
        uint256 gasUsedBeacon = gasBefore - gasleft();
        
        // Both should be under reasonable limits
        assertTrue(gasUsedStandard < 1_000_000);
        assertTrue(gasUsedBeacon < 1_000_000);
    }
}
