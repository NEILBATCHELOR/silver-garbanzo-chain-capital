// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "../../../src/extensions/flash-mint/ERC20FlashMintModule.sol";

contract MockFlashBorrower is IERC3156FlashBorrower {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    bool public shouldFail;
    
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        if (shouldFail) return bytes32(0);
        return CALLBACK_SUCCESS;
    }
    
    function setShouldFail(bool fail) external {
        shouldFail = fail;
    }
}

contract ERC20FlashMintModuleTest is Test {
    using Clones for address;
    
    ERC20FlashMintModule public implementation;
    ERC20FlashMintModule public module;
    MockFlashBorrower public borrower;
    
    address public admin = address(1);
    address public flashManager = address(2);
    address public tokenContract = address(0x999);
    address public feeRecipient = address(3);
    address public user = address(4);
    
    bytes32 public constant FLASH_MANAGER_ROLE = keccak256("FLASH_MANAGER_ROLE");
    uint256 public constant INITIAL_FEE_BP = 100; // 1%
    
    event FlashLoan(address indexed initiator, address indexed receiver, uint256 amount, uint256 fee);
    event FlashFeeUpdated(uint256 feeBasisPoints);
    event MaxFlashLoanUpdated(uint256 maxAmount);
    
    function setUp() public {
        implementation = new ERC20FlashMintModule();
        borrower = new MockFlashBorrower();
        
        address clone = address(implementation).clone();
        module = ERC20FlashMintModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, tokenContract, feeRecipient, INITIAL_FEE_BP);
        
        vm.prank(admin);
        module.grantRole(FLASH_MANAGER_ROLE, flashManager);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(module.tokenContract(), tokenContract, "Token contract should be set");
        assertEq(module.getFlashFeeBasisPoints(), INITIAL_FEE_BP, "Flash fee should be set");
        assertTrue(module.hasRole(FLASH_MANAGER_ROLE, flashManager), "Flash manager role should be granted");
    }
    
    // ============ Max Flash Loan Tests ============
    
    function testMaxFlashLoanUnlimited() public view {
        uint256 max = module.maxFlashLoan(tokenContract);
        assertEq(max, type(uint256).max, "Should be unlimited by default");
    }
    
    function testMaxFlashLoanWithLimit() public {
        uint256 limit = 1000000 ether;
        
        vm.prank(flashManager);
        module.setMaxFlashLoan(limit);
        
        assertEq(module.maxFlashLoan(tokenContract), limit, "Should return set limit");
    }
    
    function testMaxFlashLoanForUnsupportedToken() public view {
        assertEq(module.maxFlashLoan(address(0x888)), 0, "Should be 0 for unsupported token");
    }
    
    // ============ Flash Fee Calculation Tests ============
    
    function testFlashFeeCalculation() public view {
        uint256 amount = 10000 ether;
        uint256 expectedFee = (amount * INITIAL_FEE_BP) / 10000;
        
        uint256 actualFee = module.flashFee(tokenContract, amount);
        assertEq(actualFee, expectedFee, "Fee should be calculated correctly");
    }
    
    function testFlashFeeForUnsupportedToken() public {
        vm.expectRevert();
        module.flashFee(address(0x888), 10000 ether);
    }
    
    // ============ Flash Loan Tests ============
    
    function testFlashLoanSuccessful() public {
        uint256 amount = 1000 ether;
        uint256 fee = module.flashFee(tokenContract, amount);
        bytes memory data = abi.encode("test");
        
        // Mock the token calls
        vm.mockCall(
            tokenContract,
            abi.encodeWithSignature("mint(address,uint256)", address(borrower), amount),
            abi.encode(true)
        );
        
        vm.mockCall(
            tokenContract,
            abi.encodeWithSignature("burnFrom(address,uint256)", address(borrower), amount + fee),
            abi.encode(true)
        );
        
        vm.mockCall(
            tokenContract,
            abi.encodeWithSignature("mint(address,uint256)", feeRecipient, fee),
            abi.encode(true)
        );
        
        vm.expectEmit(true, true, false, true);
        emit FlashLoan(address(this), address(borrower), amount, fee);
        
        bool success = module.flashLoan(IERC3156FlashBorrower(address(borrower)), tokenContract, amount, data);
        assertTrue(success, "Flash loan should succeed");
    }
    
    function testFlashLoanRevertsForInvalidCallback() public {
        borrower.setShouldFail(true);
        
        uint256 amount = 1000 ether;
        bytes memory data = "";
        
        vm.mockCall(
            tokenContract,
            abi.encodeWithSignature("mint(address,uint256)", address(borrower), amount),
            abi.encode(true)
        );
        
        vm.expectRevert();
        module.flashLoan(IERC3156FlashBorrower(address(borrower)), tokenContract, amount, data);
    }
    
    function testFlashLoanRevertsForUnsupportedToken() public {
        vm.expectRevert();
        module.flashLoan(IERC3156FlashBorrower(address(borrower)), address(0x888), 1000 ether, "");
    }
    
    // ============ Admin Tests ============
    
    function testSetFlashFee() public {
        uint256 newFee = 250; // 2.5%
        
        vm.expectEmit(false, false, false, true);
        emit FlashFeeUpdated(newFee);
        
        vm.prank(flashManager);
        module.setFlashFee(newFee);
        
        assertEq(module.getFlashFeeBasisPoints(), newFee, "Flash fee should be updated");
    }
    
    function testSetFlashFeeRequiresRole() public {
        vm.prank(user);
        vm.expectRevert();
        module.setFlashFee(250);
    }
    
    function testSetMaxFlashLoan() public {
        uint256 maxAmount = 1000000 ether;
        
        vm.expectEmit(false, false, false, true);
        emit MaxFlashLoanUpdated(maxAmount);
        
        vm.prank(flashManager);
        module.setMaxFlashLoan(maxAmount);
        
        assertEq(module.maxFlashLoan(tokenContract), maxAmount, "Max flash loan should be updated");
    }
    
    function testSetMaxFlashLoanToUnlimited() public {
        vm.prank(flashManager);
        module.setMaxFlashLoan(1000 ether);
        
        vm.prank(flashManager);
        module.setMaxFlashLoan(0); // Reset to unlimited
        
        assertEq(module.maxFlashLoan(tokenContract), type(uint256).max, "Should be unlimited");
    }
}
