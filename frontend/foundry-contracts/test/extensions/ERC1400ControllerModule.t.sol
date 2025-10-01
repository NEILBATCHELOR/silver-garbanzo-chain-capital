// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/erc1400/ERC1400ControllerModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC1400ControllerModuleTest is Test {
    ERC1400ControllerModule public controller;
    
    address admin = address(1);
    address controller1 = address(2);
    address controller2 = address(3);
    address investor = address(4);
    
    function setUp() public {
        // Deploy implementation
        ERC1400ControllerModule implementation = new ERC1400ControllerModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1400ControllerModule.initialize.selector,
            admin,
            true // controllable
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        controller = ERC1400ControllerModule(address(proxy));
    }
    
    function testAddController() public {
        vm.prank(admin);
        controller.addController(controller1);
        
        assertTrue(controller.isController(controller1));
        
        address[] memory controllers = controller.getControllers();
        assertEq(controllers.length, 1);
        assertEq(controllers[0], controller1);
    }
    
    function testRemoveController() public {
        vm.startPrank(admin);
        
        controller.addController(controller1);
        assertTrue(controller.isController(controller1));
        
        controller.removeController(controller1);
        assertFalse(controller.isController(controller1));
        
        vm.stopPrank();
    }
    
    function testIsControllable() public {
        assertTrue(controller.isControllable());
    }
    
    function testSetControllable() public {
        vm.prank(admin);
        controller.setControllable(false);
        
        assertFalse(controller.isControllable());
    }
    
    function testControllerTransfer() public {
        vm.prank(admin);
        controller.addController(controller1);
        
        vm.prank(controller1);
        controller.controllerTransfer(
            investor,
            address(5),
            100,
            "",
            "Regulatory recovery"
        );
    }
    
    function testControllerRedeem() public {
        vm.prank(admin);
        controller.addController(controller1);
        
        vm.prank(controller1);
        controller.controllerRedeem(
            investor,
            100,
            "",
            "Court order"
        );
    }
    
    function testFreezeAccount() public {
        vm.prank(admin);
        bytes32 reason = keccak256("SANCTIONS");
        
        controller.freezeAccount(investor, reason);
        
        assertTrue(controller.isFrozen(investor));
        assertEq(controller.getFreezeReason(investor), reason);
        
        address[] memory frozenAccounts = controller.getFrozenAccounts();
        assertEq(frozenAccounts.length, 1);
        assertEq(frozenAccounts[0], investor);
    }
    
    function testUnfreezeAccount() public {
        vm.startPrank(admin);
        
        controller.freezeAccount(investor, keccak256("SANCTIONS"));
        assertTrue(controller.isFrozen(investor));
        
        controller.unfreezeAccount(investor);
        assertFalse(controller.isFrozen(investor));
        
        vm.stopPrank();
    }
    
    function testAccessControl() public {
        vm.expectRevert();
        controller.addController(controller1);
        
        vm.expectRevert();
        controller.freezeAccount(investor, bytes32(0));
    }
    
    function testCannotOperateWhenNotControllable() public {
        vm.prank(admin);
        controller.setControllable(false);
        
        vm.prank(admin);
        controller.addController(controller1);
        
        vm.prank(controller1);
        vm.expectRevert();
        controller.controllerTransfer(investor, address(5), 100, "", "");
    }
}
