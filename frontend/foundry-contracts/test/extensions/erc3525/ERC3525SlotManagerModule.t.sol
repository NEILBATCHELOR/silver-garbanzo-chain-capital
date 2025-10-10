// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../../src/extensions/erc3525/ERC3525SlotManagerModule.sol";
import "../../../src/extensions/erc3525/interfaces/IERC3525SlotManagerModule.sol";

/**
 * @title ERC3525SlotManagerModuleTest
 * @notice Comprehensive tests for dynamic slot management functionality
 * @dev Tests cover slot creation, metadata, permissions, and properties
 */
contract ERC3525SlotManagerModuleTest is Test {
    
    ERC3525SlotManagerModule public slotManager;
    
    address public admin = address(1);
    address public slotAdmin = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public unauthorized = address(5);
    
    uint256 public constant SLOT_GOLD = 1;
    uint256 public constant SLOT_SILVER = 2;
    uint256 public constant SLOT_BRONZE = 3;
    
    bytes32 public constant MINT_PERMISSION = keccak256("MINT");
    bytes32 public constant TRANSFER_PERMISSION = keccak256("TRANSFER");
    bytes32 public constant SLOT_ADMIN_ROLE = keccak256("SLOT_ADMIN_ROLE");
    
    event SlotCreated(uint256 indexed slotId, string name, string description, address indexed creator);
    event SlotMetadataUpdated(uint256 indexed slotId, string metadata, address indexed updater);
    event SlotURIUpdated(uint256 indexed slotId, string uri);
    event SlotStatusChanged(uint256 indexed slotId, bool active);
    event SlotPermissionGranted(uint256 indexed slotId, address indexed account, bytes32 indexed permission);
    event SlotPermissionRevoked(uint256 indexed slotId, address indexed account, bytes32 indexed permission);
    
    function setUp() public {
        slotManager = new ERC3525SlotManagerModule();
        slotManager.initialize(admin);
        
        // Grant slot admin role
        vm.prank(admin);
        slotManager.grantRole(SLOT_ADMIN_ROLE, slotAdmin);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public {
        assertTrue(slotManager.hasRole(slotManager.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(slotManager.hasRole(SLOT_ADMIN_ROLE, admin));
        assertTrue(slotManager.hasRole(slotManager.UPGRADER_ROLE(), admin));
        assertEq(slotManager.totalSlots(), 0);
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        slotManager.initialize(admin);
    }
    
    // ============ Slot Creation Tests ============
    
    function testCreateSlot() public {
        vm.prank(slotAdmin);
        vm.expectEmit(true, false, false, true);
        emit SlotCreated(SLOT_GOLD, "Gold Tier", "Premium gold tier slot", slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold Tier", "Premium gold tier slot");
        
        assertTrue(slotManager.slotExists(SLOT_GOLD));
        assertTrue(slotManager.isSlotActive(SLOT_GOLD));
        assertEq(slotManager.totalSlots(), 1);
        
        (string memory name, string memory description) = slotManager.getSlotInfo(SLOT_GOLD);
        assertEq(name, "Gold Tier");
        assertEq(description, "Premium gold tier slot");
    }
    
    function testCreateMultipleSlots() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold Tier", "Premium gold");
        slotManager.createSlot(SLOT_SILVER, "Silver Tier", "Standard silver");
        slotManager.createSlot(SLOT_BRONZE, "Bronze Tier", "Basic bronze");
        vm.stopPrank();
        
        assertEq(slotManager.totalSlots(), 3);
        uint256[] memory allSlots = slotManager.getAllSlots();
        assertEq(allSlots.length, 3);
        assertEq(allSlots[0], SLOT_GOLD);
        assertEq(allSlots[1], SLOT_SILVER);
        assertEq(allSlots[2], SLOT_BRONZE);
    }
    
    function testCreateSlotBatch() public {
        uint256[] memory slotIds = new uint256[](3);
        slotIds[0] = SLOT_GOLD;
        slotIds[1] = SLOT_SILVER;
        slotIds[2] = SLOT_BRONZE;
        
        string[] memory names = new string[](3);
        names[0] = "Gold";
        names[1] = "Silver";
        names[2] = "Bronze";
        
        string[] memory descriptions = new string[](3);
        descriptions[0] = "Gold tier";
        descriptions[1] = "Silver tier";
        descriptions[2] = "Bronze tier";
        
        vm.prank(slotAdmin);
        slotManager.createSlotBatch(slotIds, names, descriptions);
        
        assertEq(slotManager.totalSlots(), 3);
        assertTrue(slotManager.slotExists(SLOT_GOLD));
        assertTrue(slotManager.slotExists(SLOT_SILVER));
        assertTrue(slotManager.slotExists(SLOT_BRONZE));
    }
    
    function testCannotCreateZeroSlot() public {
        vm.prank(slotAdmin);
        vm.expectRevert(IERC3525SlotManagerModule.InvalidSlotId.selector);
        slotManager.createSlot(0, "Invalid", "Cannot use slot 0");
    }
    
    function testCannotCreateDuplicateSlot() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "First");
        
        vm.expectRevert(abi.encodeWithSelector(IERC3525SlotManagerModule.SlotAlreadyExists.selector, SLOT_GOLD));
        slotManager.createSlot(SLOT_GOLD, "Gold", "Duplicate");
        vm.stopPrank();
    }
    
    function testCannotCreateSlotWithEmptyName() public {
        vm.prank(slotAdmin);
        vm.expectRevert(IERC3525SlotManagerModule.EmptySlotName.selector);
        slotManager.createSlot(SLOT_GOLD, "", "No name");
    }
    
    function testUnauthorizedCannotCreateSlot() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        slotManager.createSlot(SLOT_GOLD, "Gold", "Unauthorized");
    }
    
    // ============ Metadata Management Tests ============
    
    function testSetSlotMetadata() public {
        vm.prank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        
        vm.prank(slotAdmin);
        vm.expectEmit(true, false, false, true);
        emit SlotMetadataUpdated(SLOT_GOLD, '{"maturity":"2025-12-31"}', slotAdmin);
        slotManager.setSlotMetadata(SLOT_GOLD, '{"maturity":"2025-12-31"}');
        
        assertEq(slotManager.getSlotMetadata(SLOT_GOLD), '{"maturity":"2025-12-31"}');
    }
    
    function testSetSlotURI() public {
        vm.prank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        
        vm.prank(slotAdmin);
        vm.expectEmit(true, false, false, true);
        emit SlotURIUpdated(SLOT_GOLD, "ipfs://Qm...");
        slotManager.setSlotURI(SLOT_GOLD, "ipfs://Qm...");
        
        assertEq(slotManager.getSlotURI(SLOT_GOLD), "ipfs://Qm...");
    }
    
    function testCannotSetMetadataForNonexistentSlot() public {
        vm.prank(slotAdmin);
        vm.expectRevert(abi.encodeWithSelector(IERC3525SlotManagerModule.SlotDoesNotExist.selector, 999));
        slotManager.setSlotMetadata(999, "metadata");
    }
    
    // ============ Slot Status Tests ============
    
    function testSetSlotActive() public {
        vm.prank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        assertTrue(slotManager.isSlotActive(SLOT_GOLD));
        
        vm.prank(slotAdmin);
        vm.expectEmit(true, false, false, true);
        emit SlotStatusChanged(SLOT_GOLD, false);
        slotManager.setSlotActive(SLOT_GOLD, false);
        
        assertFalse(slotManager.isSlotActive(SLOT_GOLD));
        assertTrue(slotManager.slotExists(SLOT_GOLD)); // Still exists
    }
    
    function testReactivateSlot() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.setSlotActive(SLOT_GOLD, false);
        slotManager.setSlotActive(SLOT_GOLD, true);
        vm.stopPrank();
        
        assertTrue(slotManager.isSlotActive(SLOT_GOLD));
    }
    
    // ============ Slot Permission Tests ============
    
    function testGrantSlotPermission() public {
        vm.prank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        
        vm.prank(slotAdmin);
        vm.expectEmit(true, true, true, false);
        emit SlotPermissionGranted(SLOT_GOLD, user1, MINT_PERMISSION);
        slotManager.grantSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        
        assertTrue(slotManager.hasSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION));
    }
    
    function testRevokeSlotPermission() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.grantSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        
        vm.expectEmit(true, true, true, false);
        emit SlotPermissionRevoked(SLOT_GOLD, user1, MINT_PERMISSION);
        slotManager.revokeSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        vm.stopPrank();
        
        assertFalse(slotManager.hasSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION));
    }
    
    function testMultiplePermissions() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.grantSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        slotManager.grantSlotPermission(SLOT_GOLD, user1, TRANSFER_PERMISSION);
        vm.stopPrank();
        
        assertTrue(slotManager.hasSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION));
        assertTrue(slotManager.hasSlotPermission(SLOT_GOLD, user1, TRANSFER_PERMISSION));
    }
    
    function testPermissionsIsolatedBetweenUsers() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.grantSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        vm.stopPrank();
        
        assertTrue(slotManager.hasSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION));
        assertFalse(slotManager.hasSlotPermission(SLOT_GOLD, user2, MINT_PERMISSION));
    }
    
    // ============ Slot Property Tests ============
    
    function testSetSlotProperty() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.setSlotProperty(SLOT_GOLD, "maturity", "2025-12-31");
        slotManager.setSlotProperty(SLOT_GOLD, "couponRate", "5.5");
        vm.stopPrank();
        
        assertEq(slotManager.getSlotProperty(SLOT_GOLD, "maturity"), "2025-12-31");
        assertEq(slotManager.getSlotProperty(SLOT_GOLD, "couponRate"), "5.5");
    }
    
    function testUpdateSlotProperty() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.setSlotProperty(SLOT_GOLD, "status", "active");
        slotManager.setSlotProperty(SLOT_GOLD, "status", "paused");
        vm.stopPrank();
        
        assertEq(slotManager.getSlotProperty(SLOT_GOLD, "status"), "paused");
    }
    
    function testGetSlotPropertyKeys() public {
        vm.startPrank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        slotManager.setSlotProperty(SLOT_GOLD, "maturity", "2025-12-31");
        slotManager.setSlotProperty(SLOT_GOLD, "couponRate", "5.5");
        slotManager.setSlotProperty(SLOT_GOLD, "issuer", "Company XYZ");
        vm.stopPrank();
        
        string[] memory keys = slotManager.getSlotPropertyKeys(SLOT_GOLD);
        assertEq(keys.length, 3);
        assertEq(keys[0], "maturity");
        assertEq(keys[1], "couponRate");
        assertEq(keys[2], "issuer");
    }
    
    function testCannotSetPropertyForNonexistentSlot() public {
        vm.prank(slotAdmin);
        vm.expectRevert(abi.encodeWithSelector(IERC3525SlotManagerModule.SlotDoesNotExist.selector, 999));
        slotManager.setSlotProperty(999, "key", "value");
    }
    
    // ============ Information Query Tests ============
    
    function testGetSlotCreatedAt() public {
        uint256 timestamp = block.timestamp;
        
        vm.prank(slotAdmin);
        slotManager.createSlot(SLOT_GOLD, "Gold", "Gold tier");
        
        assertEq(slotManager.getSlotCreatedAt(SLOT_GOLD), timestamp);
    }
    
    function testGetSlotInfoForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC3525SlotManagerModule.SlotDoesNotExist.selector, 999));
        slotManager.getSlotInfo(999);
    }
    
    function testSlotExistsReturnsFalseForNonexistent() public {
        assertFalse(slotManager.slotExists(999));
    }
    
    function testIsSlotActiveReturnsFalseForNonexistent() public {
        assertFalse(slotManager.isSlotActive(999));
    }
    
    // ============ Complex Scenario Tests ============
    
    function testCompleteSlotLifecycle() public {
        vm.startPrank(slotAdmin);
        
        // Create slot
        slotManager.createSlot(SLOT_GOLD, "Gold Bond", "5Y 5.5% Corporate");
        
        // Set metadata
        slotManager.setSlotMetadata(SLOT_GOLD, '{"type":"bond","rating":"AAA"}');
        slotManager.setSlotURI(SLOT_GOLD, "ipfs://Qm123");
        
        // Set properties
        slotManager.setSlotProperty(SLOT_GOLD, "maturity", "2030-12-31");
        slotManager.setSlotProperty(SLOT_GOLD, "couponRate", "5.5");
        slotManager.setSlotProperty(SLOT_GOLD, "issuer", "Corp XYZ");
        
        // Grant permissions
        slotManager.grantSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION);
        slotManager.grantSlotPermission(SLOT_GOLD, user1, TRANSFER_PERMISSION);
        
        vm.stopPrank();
        
        // Verify everything
        assertTrue(slotManager.slotExists(SLOT_GOLD));
        assertTrue(slotManager.isSlotActive(SLOT_GOLD));
        assertEq(slotManager.getSlotMetadata(SLOT_GOLD), '{"type":"bond","rating":"AAA"}');
        assertEq(slotManager.getSlotURI(SLOT_GOLD), "ipfs://Qm123");
        assertEq(slotManager.getSlotProperty(SLOT_GOLD, "maturity"), "2030-12-31");
        assertTrue(slotManager.hasSlotPermission(SLOT_GOLD, user1, MINT_PERMISSION));
    }
    
    function testBatchCreationEfficiency() public {
        uint256[] memory slotIds = new uint256[](10);
        string[] memory names = new string[](10);
        string[] memory descriptions = new string[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            slotIds[i] = i + 1;
            names[i] = string(abi.encodePacked("Slot ", vm.toString(i + 1)));
            descriptions[i] = string(abi.encodePacked("Description ", vm.toString(i + 1)));
        }
        
        vm.prank(slotAdmin);
        slotManager.createSlotBatch(slotIds, names, descriptions);
        
        assertEq(slotManager.totalSlots(), 10);
        uint256[] memory allSlots = slotManager.getAllSlots();
        assertEq(allSlots.length, 10);
    }
    
    function testBatchCreationArrayMismatch() public {
        uint256[] memory slotIds = new uint256[](2);
        slotIds[0] = SLOT_GOLD;
        slotIds[1] = SLOT_SILVER;
        
        string[] memory names = new string[](3);
        names[0] = "Gold";
        names[1] = "Silver";
        names[2] = "Bronze";
        
        string[] memory descriptions = new string[](2);
        descriptions[0] = "Gold tier";
        descriptions[1] = "Silver tier";
        
        vm.prank(slotAdmin);
        vm.expectRevert("Array length mismatch");
        slotManager.createSlotBatch(slotIds, names, descriptions);
    }
    
    // ============ ERC-165 Interface Support Tests ============
    
    function testSupportsInterface() public {
        assertTrue(slotManager.supportsInterface(type(IERC3525SlotManagerModule).interfaceId));
    }
}
