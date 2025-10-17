// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../../src/extensions/permit/ERC20PermitModule.sol";
import "../../../src/masters/ERC20Master.sol";

contract ERC20PermitModuleTest is Test {
    
    ERC20PermitModule public implementation;
    ERC20PermitModule public module;
    ERC20Master public token;
    
    address public admin = address(1);
    address public owner = address(2);
    address public spender = address(3);
    
    uint256 public ownerPrivateKey = 0xA11CE;
    address public ownerAddress;
    
    string public constant NAME = "Test Token";
    string public constant VERSION = "1";
    
    function setUp() public {
        ownerAddress = vm.addr(ownerPrivateKey);
        
        // Deploy token
        vm.startPrank(admin);
        token = new ERC20Master();
        token.initialize(NAME, "TEST", 1000000e18, 1000000e18, admin);
        
        // Deploy implementation
        implementation = new ERC20PermitModule();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC20PermitModule.initialize.selector,
            admin,
            address(token),
            NAME,
            VERSION
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        module = ERC20PermitModule(address(proxy));
        
        vm.stopPrank();
    }
    
    function testPermitWithValidSignature() public {
        uint256 value = 100;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 domainSeparator = module.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                ownerAddress,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        vm.prank(spender);
        module.permit(ownerAddress, spender, value, deadline, v, r, s);
        
        assertEq(module.nonces(ownerAddress), 1, "Nonce should increment");
    }
    
    function testPermitWithExpiredDeadline() public {
        uint256 value = 100;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp - 1; // Expired
        
        bytes32 domainSeparator = module.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                ownerAddress,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        vm.expectRevert();
        vm.prank(spender);
        module.permit(ownerAddress, spender, value, deadline, v, r, s);
    }
    
    function testPermitWithInvalidNonce() public {
        uint256 value = 100;
        uint256 nonce = 1; // Wrong nonce
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 domainSeparator = module.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                ownerAddress,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        vm.expectRevert();
        vm.prank(spender);
        module.permit(ownerAddress, spender, value, deadline, v, r, s);
    }
}
