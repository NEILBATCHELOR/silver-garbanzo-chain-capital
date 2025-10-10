// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC20RebasingMaster.sol";

contract ERC20RebasingMasterTest is Test {
    ERC20RebasingMaster public implementation;
    ERC20RebasingMaster public token;
    
    address public owner = address(1);
    address public rebaseRole = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    string constant NAME = "Rebasing Token";
    string constant SYMBOL = "rTKN";
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10**18;
    
    event Rebase(uint256 indexed epoch, uint256 oldTotalPooled, uint256 newTotalPooled);
    event SharesTransferred(address indexed from, address indexed to, uint256 sharesValue);
    
    function setUp() public {
        implementation = new ERC20RebasingMaster();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC20RebasingMaster.initialize.selector,
            NAME,
            SYMBOL,
            INITIAL_SUPPLY,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        token = ERC20RebasingMaster(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.getTotalShares(), INITIAL_SUPPLY);
        assertEq(token.getTotalPooled(), INITIAL_SUPPLY);
    }
    
    function testInitializeRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.REBASE_ROLE(), owner));
        assertTrue(token.hasRole(token.UPGRADER_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        token.initialize(NAME, SYMBOL, INITIAL_SUPPLY, owner);
    }
    
    function testInitializeWithZeroSupply() public {
        ERC20RebasingMaster newImpl = new ERC20RebasingMaster();
        bytes memory initData = abi.encodeWithSelector(
            ERC20RebasingMaster.initialize.selector,
            "Zero Token",
            "ZERO",
            0,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(newImpl), initData);
        ERC20RebasingMaster newToken = ERC20RebasingMaster(address(proxy));
        
        assertEq(newToken.totalSupply(), 0);
        assertEq(newToken.getTotalShares(), 0);
    }
    
    // ============ Shares Mechanism Tests ============
    
    function testSharesOfInitialHolder() public view {
        assertEq(token.sharesOf(owner), INITIAL_SUPPLY);
    }
    
    function testGetPooledTokenByShares() public view {
        uint256 shares = INITIAL_SUPPLY / 2;
        uint256 tokens = token.getPooledTokenByShares(shares);
        assertEq(tokens, INITIAL_SUPPLY / 2);
    }
    
    function testGetSharesByPooledToken() public view {
        uint256 tokens = INITIAL_SUPPLY / 2;
        uint256 shares = token.getSharesByPooledToken(tokens);
        assertEq(shares, INITIAL_SUPPLY / 2);
    }
    
    function testSharePriceInitially() public view {
        uint256 sharePrice = token.getSharePrice();
        assertEq(sharePrice, 1e18); // 1:1 ratio initially
    }
    
    // ============ Rebase Tests ============
    
    function testPositiveRebase() public {
        uint256 newTotalPooled = INITIAL_SUPPLY + (INITIAL_SUPPLY / 10); // +10%
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Rebase(block.number, INITIAL_SUPPLY, newTotalPooled);
        
        token.rebase(newTotalPooled);
        
        assertEq(token.getTotalPooled(), newTotalPooled);
        assertEq(token.totalSupply(), newTotalPooled);
        // Shares remain constant
        assertEq(token.getTotalShares(), INITIAL_SUPPLY);
    }
    
    function testNegativeRebase() public {
        uint256 newTotalPooled = INITIAL_SUPPLY - (INITIAL_SUPPLY / 10); // -10%
        
        vm.prank(owner);
        token.rebase(newTotalPooled);
        
        assertEq(token.getTotalPooled(), newTotalPooled);
        assertEq(token.totalSupply(), newTotalPooled);
    }
    
    function testRebaseAffectsAllBalances() public {
        // Transfer to user1
        uint256 transferAmount = INITIAL_SUPPLY / 4;
        vm.prank(owner);
        token.transfer(user1, transferAmount);
        
        uint256 ownerBalanceBefore = token.balanceOf(owner);
        uint256 user1BalanceBefore = token.balanceOf(user1);
        
        // Rebase +20%
        uint256 newTotalPooled = INITIAL_SUPPLY + (INITIAL_SUPPLY / 5);
        vm.prank(owner);
        token.rebase(newTotalPooled);
        
        // Both balances should increase proportionally
        uint256 ownerBalanceAfter = token.balanceOf(owner);
        uint256 user1BalanceAfter = token.balanceOf(user1);
        
        assertTrue(ownerBalanceAfter > ownerBalanceBefore);
        assertTrue(user1BalanceAfter > user1BalanceBefore);
    }
    
    function testCannotRebaseWithZero() public {
        vm.prank(owner);
        vm.expectRevert(ERC20RebasingMaster.InvalidRebaseAmount.selector);
        token.rebase(0);
    }
    
    function testOnlyRebaseRoleCanRebase() public {
        vm.prank(user1);
        vm.expectRevert();
        token.rebase(INITIAL_SUPPLY + 1);
    }
    
    // ============ Transfer Tests ============
    
    function testTransfer() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        bool success = token.transfer(user1, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
    }
    
    function testTransferUpdatesShares() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.transfer(user1, amount);
        
        uint256 expectedShares = token.getSharesByPooledToken(amount);
        assertEq(token.sharesOf(user1), expectedShares);
    }
    
    function testTransferEmitsSharesTransferred() public {
        uint256 amount = 1000 * 10**18;
        uint256 shares = token.getSharesByPooledToken(amount);
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit SharesTransferred(owner, user1, shares);
        
        token.transfer(user1, amount);
    }
    
    function testTransferAfterRebase() public {
        // Transfer before rebase
        vm.prank(owner);
        token.transfer(user1, INITIAL_SUPPLY / 4);
        
        // Rebase +50%
        vm.prank(owner);
        token.rebase(INITIAL_SUPPLY + (INITIAL_SUPPLY / 2));
        
        // Transfer after rebase
        uint256 balanceBeforeTransfer = token.balanceOf(user1);
        uint256 transferAmount = 500 * 10**18;
        
        vm.prank(user1);
        token.transfer(user2, transferAmount);
        
        assertEq(token.balanceOf(user1), balanceBeforeTransfer - transferAmount);
        assertEq(token.balanceOf(user2), transferAmount);
    }
    
    function testTransferFrom() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.approve(user1, amount);
        
        vm.prank(user1);
        token.transferFrom(owner, user2, amount);
        
        assertEq(token.balanceOf(user2), amount);
    }
    
    function testCannotTransferMoreThanBalance() public {
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 1);
    }
    
    function testCannotTransferToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ERC20RebasingMaster.ZeroAddress.selector);
        token.transfer(address(0), 1000 * 10**18);
    }
    
    // ============ Mint/Burn Tests ============
    
    function testMint() public {
        uint256 mintAmount = 10_000 * 10**18;
        
        vm.prank(owner);
        token.mint(user1, mintAmount);
        
        assertEq(token.balanceOf(user1), mintAmount);
        assertTrue(token.getTotalShares() > INITIAL_SUPPLY);
    }
    
    function testBurn() public {
        uint256 burnAmount = 1000 * 10**18;
        
        vm.prank(owner);
        token.burn(burnAmount);
        
        assertEq(token.totalSupply(), INITIAL_SUPPLY - burnAmount);
    }
    
    function testOnlyAdminCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, 1000 * 10**18);
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        token.setPolicyEngine(mockEngine);
        
        assertEq(token.policyEngine(), mockEngine);
    }
    
    function testOnlyAdminCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setPolicyEngine(address(0x1234));
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        ERC20RebasingMaster newImpl = new ERC20RebasingMaster();
        
        vm.prank(owner);
        token.upgradeToAndCall(address(newImpl), "");
        
        assertEq(token.name(), NAME);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC20RebasingMaster newImpl = new ERC20RebasingMaster();
        
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImpl), "");
    }
    
    // ============ Edge Cases ============
    
    function testRebaseWithVerySmallIncrease() public {
        uint256 newTotalPooled = INITIAL_SUPPLY + 1;
        
        vm.prank(owner);
        token.rebase(newTotalPooled);
        
        assertEq(token.getTotalPooled(), newTotalPooled);
    }
    
    function testMultipleRebasesInSequence() public {
        vm.startPrank(owner);
        
        token.rebase(INITIAL_SUPPLY + (INITIAL_SUPPLY / 10)); // +10%
        token.rebase(token.getTotalPooled() - (token.getTotalPooled() / 20)); // -5%
        token.rebase(token.getTotalPooled() + (token.getTotalPooled() / 5)); // +20%
        
        vm.stopPrank();
        
        // Total shares should remain constant
        assertEq(token.getTotalShares(), INITIAL_SUPPLY);
    }
    
    function testSharePriceAfterRebase() public {
        vm.prank(owner);
        token.rebase(INITIAL_SUPPLY * 2); // Double the pool
        
        uint256 sharePrice = token.getSharePrice();
        assertEq(sharePrice, 2 * 1e18); // Price should double
    }
}
