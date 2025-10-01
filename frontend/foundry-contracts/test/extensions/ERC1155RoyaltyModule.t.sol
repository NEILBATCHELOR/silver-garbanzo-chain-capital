// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/royalty/ERC1155RoyaltyModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC1155RoyaltyModuleTest
 * @notice Comprehensive test suite for ERC1155 royalty module
 * @dev Tests all functionality: default royalty, per-token, batch operations
 */
contract ERC1155RoyaltyModuleTest is Test {
    ERC1155RoyaltyModule public royaltyImpl;
    ERC1155RoyaltyModule public royalty;
    
    address public admin = address(1);
    address public royaltyManager = address(2);
    address public creator1 = address(3);
    address public creator2 = address(4);
    address public buyer = address(5);
    
    // Standard basis points
    uint96 constant BPS_100 = 10000;  // 100%
    uint96 constant BPS_10 = 1000;    // 10%
    uint96 constant BPS_5 = 500;      // 5%
    uint96 constant BPS_2_5 = 250;    // 2.5%
    
    event DefaultRoyaltySet(address indexed receiver, uint96 feeNumerator);
    event TokenRoyaltySet(uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator);
    event TokenRoyaltyReset(uint256 indexed tokenId);
    
    function setUp() public {
        // Deploy implementation
        royaltyImpl = new ERC1155RoyaltyModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1155RoyaltyModule.initialize.selector,
            admin,
            creator1,  // default receiver
            BPS_2_5    // 2.5% default royalty
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(royaltyImpl),
            initData
        );
        
        royalty = ERC1155RoyaltyModule(address(proxy));
        
        // Grant roles
        vm.prank(admin);
        royalty.grantRole(royalty.ROYALTY_MANAGER_ROLE(), royaltyManager);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        (address receiver, uint96 feeNumerator) = royalty.getDefaultRoyalty();
        assertEq(receiver, creator1);
        assertEq(feeNumerator, BPS_2_5);
    }
    
    function testInitializationWithZeroReceiver() public {
        ERC1155RoyaltyModule newImpl = new ERC1155RoyaltyModule();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC1155RoyaltyModule.initialize.selector,
            admin,
            address(0),  // zero receiver
            0            // zero royalty
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(newImpl),
            initData
        );
        
        ERC1155RoyaltyModule newRoyalty = ERC1155RoyaltyModule(address(proxy));
        (address receiver, uint96 feeNumerator) = newRoyalty.getDefaultRoyalty();
        assertEq(receiver, address(0));
        assertEq(feeNumerator, 0);
    }
    
    // ============ Default Royalty Tests ============
    
    function testSetDefaultRoyalty() public {
        vm.prank(royaltyManager);
        vm.expectEmit(true, false, false, true);
        emit DefaultRoyaltySet(creator2, BPS_5);
        royalty.setDefaultRoyalty(creator2, BPS_5);
        
        (address receiver, uint96 feeNumerator) = royalty.getDefaultRoyalty();
        assertEq(receiver, creator2);
        assertEq(feeNumerator, BPS_5);
    }
    
    function testSetDefaultRoyaltyUnauthorized() public {
        vm.prank(buyer);
        vm.expectRevert();
        royalty.setDefaultRoyalty(creator2, BPS_5);
    }
    
    function testSetDefaultRoyaltyInvalidPercentage() public {
        vm.prank(royaltyManager);
        vm.expectRevert();
        royalty.setDefaultRoyalty(creator2, BPS_100 + 1);
    }
    
    function testDeleteDefaultRoyalty() public {
        vm.prank(royaltyManager);
        vm.expectEmit(true, false, false, true);
        emit DefaultRoyaltySet(address(0), 0);
        royalty.deleteDefaultRoyalty();
        
        (address receiver, uint96 feeNumerator) = royalty.getDefaultRoyalty();
        assertEq(receiver, address(0));
        assertEq(feeNumerator, 0);
    }
    
    // ============ Per-Token Royalty Tests ============
    
    function testSetTokenRoyalty() public {
        uint256 tokenId = 1;
        
        vm.prank(royaltyManager);
        vm.expectEmit(true, true, false, true);
        emit TokenRoyaltySet(tokenId, creator2, BPS_10);
        royalty.setTokenRoyalty(tokenId, creator2, BPS_10);
        
        (address receiver, uint96 feeNumerator, bool hasCustom) = royalty.getTokenRoyalty(tokenId);
        assertEq(receiver, creator2);
        assertEq(feeNumerator, BPS_10);
        assertTrue(hasCustom);
    }
    
    function testGetTokenRoyaltyUsesDefault() public view {
        uint256 tokenId = 99;
        
        (address receiver, uint96 feeNumerator, bool hasCustom) = royalty.getTokenRoyalty(tokenId);
        assertEq(receiver, creator1);  // default receiver
        assertEq(feeNumerator, BPS_2_5);  // default rate
        assertFalse(hasCustom);
    }
    
    function testResetTokenRoyalty() public {
        uint256 tokenId = 1;
        
        // Set custom royalty
        vm.prank(royaltyManager);
        royalty.setTokenRoyalty(tokenId, creator2, BPS_10);
        
        // Reset to default
        vm.prank(royaltyManager);
        vm.expectEmit(true, false, false, false);
        emit TokenRoyaltyReset(tokenId);
        royalty.resetTokenRoyalty(tokenId);
        
        (address receiver, uint96 feeNumerator, bool hasCustom) = royalty.getTokenRoyalty(tokenId);
        assertEq(receiver, creator1);  // back to default
        assertEq(feeNumerator, BPS_2_5);
        assertFalse(hasCustom);
    }
    
    // ============ Royalty Info Tests (EIP-2981) ============
    
    function testRoyaltyInfoDefault() public view {
        uint256 tokenId = 1;
        uint256 salePrice = 1 ether;
        
        (address receiver, uint256 royaltyAmount) = royalty.royaltyInfo(tokenId, salePrice);
        
        assertEq(receiver, creator1);
        assertEq(royaltyAmount, (salePrice * BPS_2_5) / 10000);  // 2.5% of 1 ETH
    }
    
    function testRoyaltyInfoCustomToken() public {
        uint256 tokenId = 1;
        uint256 salePrice = 1 ether;
        
        // Set custom royalty
        vm.prank(royaltyManager);
        royalty.setTokenRoyalty(tokenId, creator2, BPS_10);
        
        (address receiver, uint256 royaltyAmount) = royalty.royaltyInfo(tokenId, salePrice);
        
        assertEq(receiver, creator2);
        assertEq(royaltyAmount, (salePrice * BPS_10) / 10000);  // 10% of 1 ETH
    }
    
    function testRoyaltyInfoZeroSalePrice() public view {
        uint256 tokenId = 1;
        uint256 salePrice = 0;
        
        (address receiver, uint256 royaltyAmount) = royalty.royaltyInfo(tokenId, salePrice);
        
        assertEq(receiver, creator1);
        assertEq(royaltyAmount, 0);
    }
    
    function testRoyaltyInfoHighSalePrice() public view {
        uint256 tokenId = 1;
        uint256 salePrice = 1000 ether;
        
        (address receiver, uint256 royaltyAmount) = royalty.royaltyInfo(tokenId, salePrice);
        
        assertEq(receiver, creator1);
        assertEq(royaltyAmount, (salePrice * BPS_2_5) / 10000);  // 2.5% of 1000 ETH
    }
    
    // ============ Batch Operations Tests ============
    
    function testSetBatchTokenRoyalties() public {
        uint256[] memory tokenIds = new uint256[](3);
        tokenIds[0] = 1;
        tokenIds[1] = 2;
        tokenIds[2] = 3;
        
        address[] memory receivers = new address[](3);
        receivers[0] = creator1;
        receivers[1] = creator2;
        receivers[2] = creator1;
        
        uint96[] memory feeNumerators = new uint96[](3);
        feeNumerators[0] = BPS_2_5;
        feeNumerators[1] = BPS_10;
        feeNumerators[2] = BPS_5;
        
        vm.prank(royaltyManager);
        royalty.setBatchTokenRoyalties(tokenIds, receivers, feeNumerators);
        
        // Verify each token
        for (uint256 i = 0; i < tokenIds.length; i++) {
            (address receiver, uint96 feeNumerator, bool hasCustom) = 
                royalty.getTokenRoyalty(tokenIds[i]);
            assertEq(receiver, receivers[i]);
            assertEq(feeNumerator, feeNumerators[i]);
            assertTrue(hasCustom);
        }
    }
    
    function testSetBatchTokenRoyaltiesLengthMismatch() public {
        uint256[] memory tokenIds = new uint256[](3);
        address[] memory receivers = new address[](2);  // Wrong length
        uint96[] memory feeNumerators = new uint96[](3);
        
        vm.prank(royaltyManager);
        vm.expectRevert("Length mismatch");
        royalty.setBatchTokenRoyalties(tokenIds, receivers, feeNumerators);
    }
    
    function testGetBatchRoyaltyInfo() public {
        // Set up mixed royalties
        vm.startPrank(royaltyManager);
        royalty.setTokenRoyalty(1, creator2, BPS_10);
        royalty.setTokenRoyalty(2, creator1, BPS_5);
        // Token 3 uses default
        vm.stopPrank();
        
        uint256[] memory tokenIds = new uint256[](3);
        tokenIds[0] = 1;
        tokenIds[1] = 2;
        tokenIds[2] = 3;
        
        uint256[] memory salePrices = new uint256[](3);
        salePrices[0] = 1 ether;
        salePrices[1] = 2 ether;
        salePrices[2] = 0.5 ether;
        
        (address[] memory receivers, uint256[] memory royaltyAmounts) = 
            royalty.getBatchRoyaltyInfo(tokenIds, salePrices);
        
        // Token 1: 10% of 1 ETH
        assertEq(receivers[0], creator2);
        assertEq(royaltyAmounts[0], (1 ether * BPS_10) / 10000);
        
        // Token 2: 5% of 2 ETH
        assertEq(receivers[1], creator1);
        assertEq(royaltyAmounts[1], (2 ether * BPS_5) / 10000);
        
        // Token 3: 2.5% of 0.5 ETH (default)
        assertEq(receivers[2], creator1);
        assertEq(royaltyAmounts[2], (0.5 ether * BPS_2_5) / 10000);
    }
    
    function testGetBatchRoyaltyInfoLengthMismatch() public {
        uint256[] memory tokenIds = new uint256[](3);
        uint256[] memory salePrices = new uint256[](2);  // Wrong length
        
        vm.expectRevert("Length mismatch");
        royalty.getBatchRoyaltyInfo(tokenIds, salePrices);
    }
    
    // ============ Gas Benchmarking ============
    
    function testGasSetDefaultRoyalty() public {
        vm.prank(royaltyManager);
        uint256 gasBefore = gasleft();
        royalty.setDefaultRoyalty(creator2, BPS_5);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for setDefaultRoyalty:", gasUsed);
        assertLt(gasUsed, 50000, "Gas should be < 50k");
    }
    
    function testGasSetTokenRoyalty() public {
        vm.prank(royaltyManager);
        uint256 gasBefore = gasleft();
        royalty.setTokenRoyalty(1, creator2, BPS_10);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for setTokenRoyalty:", gasUsed);
        assertLt(gasUsed, 50000, "Gas should be < 50k");
    }
    
    function testGasRoyaltyInfo() public view {
        uint256 gasBefore = gasleft();
        royalty.royaltyInfo(1, 1 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for royaltyInfo:", gasUsed);
        assertLt(gasUsed, 3000, "Gas should be < 3k");
    }
    
    function testGasBatchRoyaltyInfo() public {
        // Set up 10 tokens
        vm.startPrank(royaltyManager);
        for (uint256 i = 1; i <= 10; i++) {
            royalty.setTokenRoyalty(i, creator2, BPS_10);
        }
        vm.stopPrank();
        
        uint256[] memory tokenIds = new uint256[](10);
        uint256[] memory salePrices = new uint256[](10);
        for (uint256 i = 0; i < 10; i++) {
            tokenIds[i] = i + 1;
            salePrices[i] = 1 ether;
        }
        
        uint256 gasBefore = gasleft();
        royalty.getBatchRoyaltyInfo(tokenIds, salePrices);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for batch royaltyInfo (10 tokens):", gasUsed);
        console.log("Gas per token:", gasUsed / 10);
    }
    
    // ============ ERC165 Interface Tests ============
    
    function testSupportsInterface() public view {
        // EIP-2981 interface ID
        bytes4 eip2981InterfaceId = 0x2a55205a;
        assertTrue(royalty.supportsInterface(eip2981InterfaceId));
        
        // AccessControl interface
        bytes4 accessControlInterfaceId = 0x7965db0b;
        assertTrue(royalty.supportsInterface(accessControlInterfaceId));
    }
}
