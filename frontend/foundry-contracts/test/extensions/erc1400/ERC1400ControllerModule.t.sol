// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/erc1400/ERC1400ControllerModule.sol";

contract ERC1400ControllerModuleTest is Test {
    using Clones for address;
    
    ERC1400ControllerModule public implementation;
    ERC1400ControllerModule public module;
    
    address public admin = address(1);
    address public controller = address(2);
    address public user = address(3);
    address public token = address(4);
    
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event ControllableStatusChanged(bool status);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC1400ControllerModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC1400ControllerModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, true);
    }
    
    function testAddController() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit ControllerAdded(controller);
        module.addController(controller);
        
        assertTrue(module.isController(controller), "Controller should be added");
    }
    
    function testRemoveController() public {
        // First add controller
        vm.prank(admin);
        module.addController(controller);
        
        // Then remove
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit ControllerRemoved(controller);
        module.removeController(controller);
        
        assertFalse(module.isController(controller), "Controller should be removed");
    }
    
    function testIsController() public {
        vm.prank(admin);
        module.addController(controller);
        
        assertTrue(module.isController(controller), "Should be controller");
        assertFalse(module.isController(user), "Should not be controller");
    }
    
    function testOnlyAdminCanAddController() public {
        vm.prank(user);
        vm.expectRevert();
        module.addController(controller);
    }
    
    function testControllableToggle() public {
        vm.prank(admin);
        vm.expectEmit(false, false, false, true);
        emit ControllableStatusChanged(false);
        module.setControllable(false);
        
        assertFalse(module.isControllable(), "Should not be controllable");
        
        vm.prank(admin);
        vm.expectEmit(false, false, false, true);
        emit ControllableStatusChanged(true);
        module.setControllable(true);
        
        assertTrue(module.isControllable(), "Should be controllable");
    }
    
    function testInitialState() public view {
        assertTrue(module.isControllable(), "Should be controllable by default");
    }
}
