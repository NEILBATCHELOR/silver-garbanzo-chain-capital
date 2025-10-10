// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/permit/ERC20PermitModule.sol";

contract ERC20PermitModuleTest is Test {
    using Clones for address;
    
    ERC20PermitModule public implementation;
    ERC20PermitModule public module;
    
    address public admin = address(1);
    address public owner = address(2);
    address public spender = address(3);
    
    uint256 public ownerPrivateKey = 0xA11CE;
    address public ownerAddress;
    
    string public constant NAME = "Test Token";
    string public constant VERSION = "1";
    
    function setUp() public {
        ownerAddress = vm.addr(ownerPrivateKey);
        
        // Deploy implementation
        implementation = new ERC20PermitModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC20PermitModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, NAME, VERSION);
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
