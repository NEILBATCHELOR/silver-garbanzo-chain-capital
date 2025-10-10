// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/consecutive/ERC721ConsecutiveModule.sol";

contract ERC721ConsecutiveModuleTest is Test {
    using Clones for address;
    
    ERC721ConsecutiveModule public implementation;
    ERC721ConsecutiveModule public module;
    
    address public admin = address(1);
    address public minter = address(2);
    address public recipient1 = address(3);
    address public recipient2 = address(4);
    address public nftContract = address(0x999);
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant START_TOKEN_ID = 0;
    
    event NFTContractSet(address indexed nftContract);
    event BatchMintCompleted(
        address indexed recipient,
        uint256 startTokenId,
        uint256 endTokenId,
        uint96 amount
    );
    event ConsecutiveTransfer(
        uint256 indexed fromTokenId,
        uint256 toTokenId,
        address indexed fromAddress,
        address indexed toAddress
    );
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC721ConsecutiveModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC721ConsecutiveModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract, START_TOKEN_ID);
        
        // Grant minter role
        vm.prank(admin);
        module.grantRole(MINTER_ROLE, minter);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract, "NFT contract should be set");
        assertEq(module.getNextConsecutiveId(), START_TOKEN_ID, "Start token ID should match");
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), admin), "Admin should have admin role");
        assertTrue(module.hasRole(MINTER_ROLE, admin), "Admin should have minter role");
    }
    
    // ============ Mint Consecutive Tests ============
    
    function testMintConsecutive() public {
        uint96 amount = 100;
        
        vm.expectEmit(true, false, false, true);
        emit ConsecutiveTransfer(0, 99, address(0), recipient1);
        
        vm.expectEmit(true, false, false, true);
        emit BatchMintCompleted(recipient1, 0, 99, amount);
        
        vm.prank(minter);
        uint256 firstTokenId = module.mintConsecutive(recipient1, amount);
        
        assertEq(firstTokenId, 0, "First token ID should be 0");
        assertEq(module.getNextConsecutiveId(), 100, "Next ID should be 100");
        assertTrue(module.isConsecutiveBatch(0), "Should be marked as consecutive batch");
    }
    
    function testMintConsecutiveMultipleBatches() public {
        vm.prank(minter);
        uint256 firstBatch = module.mintConsecutive(recipient1, 50);
        
        vm.prank(minter);
        uint256 secondBatch = module.mintConsecutive(recipient2, 75);
        
        assertEq(firstBatch, 0, "First batch should start at 0");
        assertEq(secondBatch, 50, "Second batch should start at 50");
        assertEq(module.getNextConsecutiveId(), 125, "Next ID should be 125");
    }
    
    function testMintConsecutiveRevertsForZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert();
        module.mintConsecutive(address(0), 100);
    }
    
    function testMintConsecutiveRevertsForZeroAmount() public {
        vm.prank(minter);
        vm.expectRevert();
        module.mintConsecutive(recipient1, 0);
    }
    
    function testMintConsecutiveRevertsForExcessiveAmount() public {
        vm.prank(minter);
        vm.expectRevert();
        module.mintConsecutive(recipient1, 5001); // Max is 5000
    }
    
    function testMintConsecutiveRequiresMinterRole() public {
        vm.prank(recipient1);
        vm.expectRevert();
        module.mintConsecutive(recipient1, 100);
    }
    
    // ============ Batch Mint Tests ============
    
    function testMintConsecutiveBatch() public {
        address[] memory recipients = new address[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient2;
        recipients[2] = address(5);
        
        uint96[] memory amounts = new uint96[](3);
        amounts[0] = 100;
        amounts[1] = 50;
        amounts[2] = 25;
        
        vm.prank(minter);
        module.mintConsecutiveBatch(recipients, amounts);
        
        assertEq(module.getNextConsecutiveId(), 175, "Next ID should be 175");
        assertTrue(module.isConsecutiveBatch(0), "First batch should be marked");
        assertTrue(module.isConsecutiveBatch(100), "Second batch should be marked");
        assertTrue(module.isConsecutiveBatch(150), "Third batch should be marked");
    }
    
    function testMintConsecutiveBatchRevertsForMismatchedArrays() public {
        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;
        
        uint96[] memory amounts = new uint96[](3);
        amounts[0] = 100;
        amounts[1] = 50;
        amounts[2] = 25;
        
        vm.prank(minter);
        vm.expectRevert();
        module.mintConsecutiveBatch(recipients, amounts);
    }
    
    function testMintConsecutiveBatchRevertsForEmptyArrays() public {
        address[] memory recipients = new address[](0);
        uint96[] memory amounts = new uint96[](0);
        
        vm.prank(minter);
        vm.expectRevert();
        module.mintConsecutiveBatch(recipients, amounts);
    }
    
    // ============ Gas Savings Tests ============
    
    function testCalculateGasSavings() public view {
        (uint256 savedGas, uint256 percentSaved) = module.calculateGasSavings(1000);
        
        uint256 expectedIndividualCost = 1000 * 50000;
        uint256 expectedConsecutiveCost = 5000;
        uint256 expectedSavedGas = expectedIndividualCost - expectedConsecutiveCost;
        
        assertEq(savedGas, expectedSavedGas, "Saved gas should match calculation");
        assertTrue(percentSaved > 9000, "Should save over 90%"); // Should be ~99%
    }
    
    function testGasSavingsForSmallBatch() public view {
        (uint256 savedGas, uint256 percentSaved) = module.calculateGasSavings(10);
        
        assertGt(savedGas, 0, "Should save gas even for small batches");
        assertGt(percentSaved, 9000, "Should still save over 90%");
    }
    
    // ============ Admin Tests ============
    
    function testSetNFTContract() public {
        address newNFTContract = address(0x888);
        
        vm.expectEmit(true, false, false, false);
        emit NFTContractSet(newNFTContract);
        
        vm.prank(admin);
        module.setNFTContract(newNFTContract);
        
        assertEq(module.nftContract(), newNFTContract, "NFT contract should be updated");
    }
    
    function testSetNFTContractRevertsForZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setNFTContract(address(0));
    }
    
    function testSetNFTContractRequiresAdminRole() public {
        vm.prank(minter);
        vm.expectRevert();
        module.setNFTContract(address(0x888));
    }
    
    function testSetNextConsecutiveId() public {
        vm.prank(admin);
        module.setNextConsecutiveId(1000);
        
        assertEq(module.getNextConsecutiveId(), 1000, "Next ID should be updated");
        
        // Verify minting starts from new ID
        vm.prank(minter);
        uint256 firstTokenId = module.mintConsecutive(recipient1, 10);
        
        assertEq(firstTokenId, 1000, "Should mint from new starting ID");
        assertEq(module.getNextConsecutiveId(), 1010, "Should increment from new ID");
    }
    
    function testSetNextConsecutiveIdRequiresAdminRole() public {
        vm.prank(minter);
        vm.expectRevert();
        module.setNextConsecutiveId(1000);
    }
}
