// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/erc3525/ERC3525SlotManagerModule.sol";
import "../../src/extensions/erc3525/ERC3525ValueExchangeModule.sol";
import "../../src/masters/ERC3525Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC3525ExtensionsTest is Test {
    ERC3525SlotManagerModule public slotManager;
    ERC3525ValueExchangeModule public valueExchange;
    ERC3525Master public token;
    
    address admin = address(1);
    address user1 = address(2);
    address user2 = address(3);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy Slot Manager
        ERC3525SlotManagerModule slotManagerImpl = new ERC3525SlotManagerModule();
        bytes memory slotManagerData = abi.encodeWithSelector(
            ERC3525SlotManagerModule.initialize.selector,
            admin
        );
        ERC1967Proxy slotManagerProxy = new ERC1967Proxy(
            address(slotManagerImpl),
            slotManagerData
        );
        slotManager = ERC3525SlotManagerModule(address(slotManagerProxy));
        
        // Deploy ERC3525 Token
        ERC3525Master tokenImpl = new ERC3525Master();
        bytes memory tokenData = abi.encodeWithSelector(
            ERC3525Master.initialize.selector,
            "Test SFT",
            "TSFT",
            18,
            admin
        );
        ERC1967Proxy tokenProxy = new ERC1967Proxy(
            address(tokenImpl),
            tokenData
        );
        token = ERC3525Master(address(tokenProxy));
        
        // Deploy Value Exchange
        ERC3525ValueExchangeModule valueExchangeImpl = new ERC3525ValueExchangeModule();
        bytes memory valueExchangeData = abi.encodeWithSelector(
            ERC3525ValueExchangeModule.initialize.selector,
            admin,
            address(token)
        );
        ERC1967Proxy valueExchangeProxy = new ERC1967Proxy(
            address(valueExchangeImpl),
            valueExchangeData
        );
        valueExchange = ERC3525ValueExchangeModule(address(valueExchangeProxy));
        
        vm.stopPrank();
    }
    
    // ============ Slot Manager Tests ============
    
    function testCreateSlot() public {
        vm.prank(admin);
        slotManager.createSlot(1, "Gold Tier", "Premium membership tier");
        
        assertTrue(slotManager.slotExists(1));
        assertTrue(slotManager.isSlotActive(1));
        
        (string memory name, string memory description) = slotManager.getSlotInfo(1);
        assertEq(name, "Gold Tier");
        assertEq(description, "Premium membership tier");
    }
    
    function testCreateSlotBatch() public {
        uint256[] memory slotIds = new uint256[](3);
        slotIds[0] = 1;
        slotIds[1] = 2;
        slotIds[2] = 3;
        
        string[] memory names = new string[](3);
        names[0] = "Gold";
        names[1] = "Silver";
        names[2] = "Bronze";
        
        string[] memory descriptions = new string[](3);
        descriptions[0] = "Gold tier";
        descriptions[1] = "Silver tier";
        descriptions[2] = "Bronze tier";
        
        vm.prank(admin);
        slotManager.createSlotBatch(slotIds, names, descriptions);
        
        assertEq(slotManager.totalSlots(), 3);
        assertTrue(slotManager.slotExists(1));
        assertTrue(slotManager.slotExists(2));
        assertTrue(slotManager.slotExists(3));
    }
    
    function testSetSlotMetadata() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        slotManager.setSlotMetadata(1, '{"color":"gold","priority":1}');
        
        string memory metadata = slotManager.getSlotMetadata(1);
        assertEq(metadata, '{"color":"gold","priority":1}');
        
        vm.stopPrank();
    }
    
    function testSetSlotURI() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        slotManager.setSlotURI(1, "https://api.example.com/slot/1");
        
        string memory uri = slotManager.getSlotURI(1);
        assertEq(uri, "https://api.example.com/slot/1");
        
        vm.stopPrank();
    }
    
    function testActivateDeactivateSlot() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        assertTrue(slotManager.isSlotActive(1));
        
        slotManager.setSlotActive(1, false);
        assertFalse(slotManager.isSlotActive(1));
        
        slotManager.setSlotActive(1, true);
        assertTrue(slotManager.isSlotActive(1));
        
        vm.stopPrank();
    }
    
    function testSlotPermissions() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        
        bytes32 mintPermission = slotManager.MINT_PERMISSION();
        slotManager.grantSlotPermission(1, user1, mintPermission);
        
        assertTrue(slotManager.hasSlotPermission(1, user1, mintPermission));
        
        slotManager.revokeSlotPermission(1, user1, mintPermission);
        assertFalse(slotManager.hasSlotPermission(1, user1, mintPermission));
        
        vm.stopPrank();
    }
    
    function testSlotProperties() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        slotManager.setSlotProperty(1, "maxSupply", "1000");
        slotManager.setSlotProperty(1, "transferable", "true");
        
        assertEq(slotManager.getSlotProperty(1, "maxSupply"), "1000");
        assertEq(slotManager.getSlotProperty(1, "transferable"), "true");
        
        string[] memory keys = slotManager.getSlotPropertyKeys(1);
        assertEq(keys.length, 2);
        
        vm.stopPrank();
    }
    
    function testGetAllSlots() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        slotManager.createSlot(2, "Silver", "Silver tier");
        slotManager.createSlot(3, "Bronze", "Bronze tier");
        
        uint256[] memory slots = slotManager.getAllSlots();
        assertEq(slots.length, 3);
        assertEq(slots[0], 1);
        assertEq(slots[1], 2);
        assertEq(slots[2], 3);
        
        vm.stopPrank();
    }
    
    function testFailCreateDuplicateSlot() public {
        vm.startPrank(admin);
        
        slotManager.createSlot(1, "Gold", "Gold tier");
        slotManager.createSlot(1, "Gold2", "Gold tier 2"); // Should fail
        
        vm.stopPrank();
    }
    
    function testFailCreateSlotWithEmptyName() public {
        vm.prank(admin);
        slotManager.createSlot(1, "", "Description"); // Should fail
    }
    
    // ============ Value Exchange Tests ============
    
    function testSetExchangeRate() public {
        vm.prank(admin);
        valueExchange.setExchangeRate(1, 2, 15000); // 1.5x rate
        
        uint256 rate = valueExchange.getExchangeRate(1, 2);
        assertEq(rate, 15000);
        assertTrue(valueExchange.isExchangeEnabled(1, 2));
    }
    
    function testCalculateExchangeAmount() public {
        vm.prank(admin);
        valueExchange.setExchangeRate(1, 2, 15000); // 1.5x rate
        
        uint256 result = valueExchange.calculateExchangeAmount(1, 2, 1000);
        assertEq(result, 1500); // 1000 * 1.5 = 1500
    }
    
    function testCreateExchangePool() public {
        vm.prank(admin);
        uint256 poolId = valueExchange.createExchangePool(1, 2, 10000);
        
        assertEq(poolId, 1);
        
        (uint256 slot1, uint256 slot2, uint256 liquidity, bool active) = 
            valueExchange.getPoolInfo(poolId);
        
        assertEq(slot1, 1);
        assertEq(slot2, 2);
        assertEq(liquidity, 10000);
        assertTrue(active);
    }
    
    function testAddRemoveLiquidity() public {
        vm.startPrank(admin);
        
        uint256 poolId = valueExchange.createExchangePool(1, 2, 10000);
        
        vm.stopPrank();
        vm.startPrank(user1);
        
        valueExchange.addLiquidity(poolId, 5000);
        assertEq(valueExchange.getProviderLiquidity(poolId, user1), 5000);
        assertEq(valueExchange.getPoolLiquidity(poolId), 15000);
        
        valueExchange.removeLiquidity(poolId, 2000);
        assertEq(valueExchange.getProviderLiquidity(poolId, user1), 3000);
        assertEq(valueExchange.getPoolLiquidity(poolId), 13000);
        
        vm.stopPrank();
    }
    
    function testSetExchangeLimits() public {
        vm.startPrank(admin);
        
        valueExchange.setMinExchangeAmount(100);
        valueExchange.setMaxExchangeAmount(1000000);
        
        (uint256 min, uint256 max) = valueExchange.getExchangeLimits();
        assertEq(min, 100);
        assertEq(max, 1000000);
        
        vm.stopPrank();
    }
    
    function testEnableDisableExchange() public {
        vm.startPrank(admin);
        
        valueExchange.setExchangeRate(1, 2, 10000);
        assertTrue(valueExchange.isExchangeEnabled(1, 2));
        
        valueExchange.enableExchange(1, 2, false);
        assertFalse(valueExchange.isExchangeEnabled(1, 2));
        
        valueExchange.enableExchange(1, 2, true);
        assertTrue(valueExchange.isExchangeEnabled(1, 2));
        
        vm.stopPrank();
    }
    
    function testGlobalExchangeToggle() public {
        vm.startPrank(admin);
        
        valueExchange.setExchangeRate(1, 2, 10000);
        assertTrue(valueExchange.isExchangeEnabled(1, 2));
        
        valueExchange.setGlobalExchangeEnabled(false);
        assertFalse(valueExchange.isExchangeEnabled(1, 2));
        
        valueExchange.setGlobalExchangeEnabled(true);
        assertTrue(valueExchange.isExchangeEnabled(1, 2));
        
        vm.stopPrank();
    }
    
    function testFailSetInvalidExchangeRate() public {
        vm.prank(admin);
        valueExchange.setExchangeRate(1, 2, 0); // Should fail (rate too low)
    }
    
    function testFailSetSameSlotExchange() public {
        vm.prank(admin);
        valueExchange.setExchangeRate(1, 1, 10000); // Should fail (same slot)
    }
    
    // ============ Integration Tests ============
    
    function testSlotManagerIntegration() public {
        vm.startPrank(admin);
        
        // Create slots
        slotManager.createSlot(1, "Gold", "Gold membership");
        slotManager.createSlot(2, "Silver", "Silver membership");
        
        // Set metadata
        slotManager.setSlotMetadata(1, '{"benefits":["premium"]}');
        slotManager.setSlotURI(1, "ipfs://QmGold");
        
        // Mint tokens in these slots
        uint256 token1 = token.mint(user1, 1, 1000 * 10**18);
        uint256 token2 = token.mint(user2, 2, 500 * 10**18);
        
        // Verify
        assertEq(token.slotOf(token1), 1);
        assertEq(token.slotOf(token2), 2);
        assertTrue(slotManager.slotExists(1));
        assertTrue(slotManager.slotExists(2));
        
        vm.stopPrank();
    }
    
    function testValueExchangeIntegration() public {
        vm.startPrank(admin);
        
        // Setup exchange rate
        valueExchange.setExchangeRate(1, 2, 20000); // 2:1 rate
        
        // Mint tokens
        uint256 token1 = token.mint(user1, 1, 1000 * 10**18);
        uint256 token2 = token.mint(user2, 2, 0);
        
        vm.stopPrank();
        
        // Calculate expected exchange
        uint256 expectedAmount = valueExchange.calculateExchangeAmount(1, 2, 500 * 10**18);
        assertEq(expectedAmount, 1000 * 10**18); // 500 * 2 = 1000
    }
}
