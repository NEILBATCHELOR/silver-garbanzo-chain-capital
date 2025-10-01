// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/permit/ERC20PermitModule.sol";
import "../src/extensions/permit/interfaces/IERC20PermitModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC20PermitModuleTest is Test {
    ERC20PermitModule public permitModule;
    ERC20PermitModule public permitImplementation;
    
    address admin = address(1);
    address tokenContract = address(2);
    address owner = address(3);
    address spender = address(4);
    
    uint256 ownerPrivateKey = 0xA11CE;
    
    string constant TOKEN_NAME = "Test Token";
    string constant VERSION = "1";
    
    function setUp() public {
        owner = vm.addr(ownerPrivateKey);
        
        // Deploy implementation
        permitImplementation = new ERC20PermitModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC20PermitModule.initialize.selector,
            admin,
            tokenContract,
            TOKEN_NAME,
            VERSION
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(permitImplementation),
            initData
        );
        
        permitModule = ERC20PermitModule(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(permitModule.tokenContract(), tokenContract);
    }
    
    function testDomainSeparator() public view {
        bytes32 separator = permitModule.DOMAIN_SEPARATOR();
        assertTrue(separator != bytes32(0));
    }
    
    // ============ Nonce Tests ============
    
    function testInitialNonce() public view {
        assertEq(permitModule.nonces(owner), 0);
    }
    
    function testNonceIncrementsAfterPermit() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 1000 ether;
        
        // Create permit signature
        bytes32 structHash = keccak256(
            abi.encode(
                permitModule.PERMIT_TYPEHASH(),
                owner,
                spender,
                value,
                0, // nonce
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                permitModule.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        // Execute permit
        permitModule.permit(owner, spender, value, deadline, v, r, s);
        
        // Check nonce incremented
        assertEq(permitModule.nonces(owner), 1);
    }
    
    // ============ Permit Tests ============
    
    function testPermitValidSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 1000 ether;
        uint256 nonce = permitModule.nonces(owner);
        
        // Create signature
        bytes32 structHash = keccak256(
            abi.encode(
                permitModule.PERMIT_TYPEHASH(),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                permitModule.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        // Execute permit - should not revert
        permitModule.permit(owner, spender, value, deadline, v, r, s);
    }
    
    function testPermitExpiredSignature() public {
        uint256 deadline = block.timestamp - 1; // Past deadline
        uint256 value = 1000 ether;
        uint256 nonce = permitModule.nonces(owner);
        
        bytes32 structHash = keccak256(
            abi.encode(
                permitModule.PERMIT_TYPEHASH(),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                permitModule.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        // Should revert with expired signature
        vm.expectRevert(IERC20PermitModule.ExpiredSignature.selector);
        permitModule.permit(owner, spender, value, deadline, v, r, s);
    }
    
    function testPermitInvalidSigner() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 1000 ether;
        uint256 nonce = permitModule.nonces(owner);
        
        // Sign with wrong private key
        uint256 wrongPrivateKey = 0xBAD;
        
        bytes32 structHash = keccak256(
            abi.encode(
                permitModule.PERMIT_TYPEHASH(),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                permitModule.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, digest);
        
        // Should revert with invalid signer
        vm.expectRevert(IERC20PermitModule.InvalidSigner.selector);
        permitModule.permit(owner, spender, value, deadline, v, r, s);
    }
    
    // ============ Helper Function Tests ============
    
    function testHashPermit() public view {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 1000 ether;
        uint256 nonce = 0;
        
        bytes32 hash = permitModule.hashPermit(owner, spender, value, nonce, deadline);
        assertTrue(hash != bytes32(0));
    }
    
    function testBuildDomainSeparator() public view {
        bytes32 separator = permitModule.buildDomainSeparator();
        assertEq(separator, permitModule.DOMAIN_SEPARATOR());
    }
    
    // ============ Gas Benchmarks ============
    
    function testGasPermitExecution() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 1000 ether;
        uint256 nonce = permitModule.nonces(owner);
        
        bytes32 structHash = keccak256(
            abi.encode(
                permitModule.PERMIT_TYPEHASH(),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                permitModule.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        
        uint256 gasBefore = gasleft();
        permitModule.permit(owner, spender, value, deadline, v, r, s);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for permit:", gasUsed);
        // Permit should be gas-efficient
        assertLt(gasUsed, 100000);
    }
}
