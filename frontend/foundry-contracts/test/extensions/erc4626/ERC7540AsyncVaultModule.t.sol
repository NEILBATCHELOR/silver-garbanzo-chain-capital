// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../src/extensions/erc4626/async/ERC7540AsyncVaultModule.sol";
import {RequestStatus} from "../../../src/extensions/erc4626/async/interfaces/IERC7540AsyncVault.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 10000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock ERC4626 vault for testing
contract MockERC4626 is ERC20 {
    IERC20 public immutable asset;
    
    constructor(address _asset) ERC20("Mock Vault", "vMOCK") {
        asset = IERC20(_asset);
    }
    
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = previewDeposit(assets);
        asset.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        assets = previewRedeem(shares);
        _burn(owner, shares);
        asset.transfer(receiver, assets);
    }
    
    function previewDeposit(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return assets;
        return (assets * supply) / totalAssets();
    }
    
    function previewRedeem(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }
    
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }
}

contract ERC7540AsyncVaultModuleTest is Test {
    using Clones for address;
    
    ERC7540AsyncVaultModule public implementation;
    ERC7540AsyncVaultModule public module;
    MockERC4626 public vault;
    MockERC20 public asset;
    
    address public admin = address(1);
    address public operator = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    uint256 public constant MINIMUM_DELAY = 1 days;
    uint256 public constant MAX_PENDING_REQUESTS = 10;
    uint256 public constant INITIAL_DEPOSIT = 1000000 * 10**18;
    
    // Events for testing
    event DepositRequested(uint256 indexed requestId, address indexed controller, address indexed owner, uint256 assets);
    event DepositFulfilled(uint256 indexed requestId, address indexed controller, uint256 assets, uint256 shares);
    event DepositClaimed(uint256 indexed requestId, address indexed receiver, uint256 shares);
    event DepositCancelled(uint256 indexed requestId, address indexed controller);
    event RedeemRequested(uint256 indexed requestId, address indexed controller, address indexed owner, uint256 shares);
    event RedeemFulfilled(uint256 indexed requestId, address indexed controller, uint256 shares, uint256 assets);
    event RedeemClaimed(uint256 indexed requestId, address indexed receiver, uint256 assets);
    event RedeemCancelled(uint256 indexed requestId, address indexed controller);
    
    function setUp() public {
        // Deploy mock assets
        asset = new MockERC20();
        vault = new MockERC4626(address(asset));
        
        // Initialize vault with some assets
        asset.approve(address(vault), INITIAL_DEPOSIT);
        vault.deposit(INITIAL_DEPOSIT, admin);
        
        // Deploy implementation
        implementation = new ERC7540AsyncVaultModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC7540AsyncVaultModule(clone);
        
        vm.prank(admin);
        module.initialize(
            admin,
            address(vault),
            MINIMUM_DELAY,
            MAX_PENDING_REQUESTS
        );
        
        // Grant operator role
        vm.prank(admin);
        module.grantRole(OPERATOR_ROLE, operator);
        
        // Fund users with assets
        asset.transfer(user1, 100000 * 10**18);
        asset.transfer(user2, 100000 * 10**18);
        
        // Users approve module
        vm.prank(user1);
        asset.approve(address(module), type(uint256).max);
        vm.prank(user2);
        asset.approve(address(module), type(uint256).max);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public {
        assertEq(address(module.vault()), address(vault));
        assertEq(address(module.asset()), address(asset));
        assertEq(module.minimumFulfillmentDelay(), MINIMUM_DELAY);
        assertEq(module.maxPendingRequestsPerUser(), MAX_PENDING_REQUESTS);
    }
    
    // ============ Deposit Request Tests ============
    
    function testRequestDeposit() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit DepositRequested(1, user1, user1, depositAmount);
        uint256 requestId = module.requestDeposit(depositAmount, user1, user1);
        
        assertEq(requestId, 1);
        
        (
            address controller,
            address owner,
            uint256 assets,
            uint256 shares,
            RequestStatus status,
            uint256 requestedAt,
            uint256 fulfilledAt
        ) = module.getDepositRequest(requestId);
        
        assertEq(controller, user1);
        assertEq(owner, user1);
        assertEq(assets, depositAmount);
        assertEq(shares, 0);
        assertTrue(status == RequestStatus.PENDING);
        assertEq(requestedAt, block.timestamp);
        assertEq(fulfilledAt, 0);
        assertEq(module.pendingDepositAssets(), depositAmount);
    }
    
    function testRequestDepositWithDifferentController() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user2, user1);
        
        (address controller, address owner,,,,,) = module.getDepositRequest(requestId);
        assertEq(controller, user2);
        assertEq(owner, user1);
    }
    
    function testCannotRequestDepositExceedingMaxPending() public {
        uint256 depositAmount = 1000 * 10**18;
        
        // Create MAX_PENDING_REQUESTS requests
        vm.startPrank(user1);
        for (uint256 i = 0; i < MAX_PENDING_REQUESTS; i++) {
            module.requestDeposit(depositAmount, user1, user1);
        }
        
        // Try to create one more
        vm.expectRevert(ERC7540AsyncVaultModule.TooManyPendingRequests.selector);
        module.requestDeposit(depositAmount, user1, user1);
        vm.stopPrank();
    }
    
    function testGetUserDepositRequests() public {
        vm.startPrank(user1);
        uint256 req1 = module.requestDeposit(1000 * 10**18, user1, user1);
        uint256 req2 = module.requestDeposit(2000 * 10**18, user1, user1);
        vm.stopPrank();
        
        uint256[] memory requests = module.getUserDepositRequests(user1);
        assertEq(requests.length, 2);
        assertEq(requests[0], req1);
        assertEq(requests[1], req2);
    }
    
    // ============ Deposit Fulfillment Tests ============
    
    function testFulfillDepositRequest() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user1, user1);
        
        // Fast forward past minimum delay
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        
        // Fund module with assets for vault interaction
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        vm.expectEmit(true, true, false, false);
        emit DepositFulfilled(requestId, user1, 0, 0);
        module.fulfillDepositRequest(requestId);
        
        (,,,uint256 shares, RequestStatus status,,uint256 fulfilledAt) = module.getDepositRequest(requestId);
        assertTrue(shares > 0);
        assertTrue(status == RequestStatus.FULFILLED);
        assertEq(fulfilledAt, block.timestamp);
        assertTrue(module.isDepositClaimable(requestId));
    }
    
    function testCannotFulfillBeforeMinimumDelay() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.prank(operator);
        vm.expectRevert(ERC7540AsyncVaultModule.FulfillmentDelayNotMet.selector);
        module.fulfillDepositRequest(requestId);
    }
    
    function testCannotFulfillNonPendingRequest() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), 10000 * 10**18);
        
        vm.prank(operator);
        module.fulfillDepositRequest(requestId);
        
        // Try to fulfill again
        vm.prank(operator);
        vm.expectRevert(ERC7540AsyncVaultModule.RequestNotPending.selector);
        module.fulfillDepositRequest(requestId);
    }
    
    function testOnlyOperatorCanFulfillDeposit() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        
        vm.prank(user2);
        vm.expectRevert();
        module.fulfillDepositRequest(requestId);
    }
    
    // ============ Deposit Claim Tests ============
    
    function testClaimDeposit() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(requestId);
        
        (,, , uint256 expectedShares,,,) = module.getDepositRequest(requestId);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit DepositClaimed(requestId, user1, expectedShares);
        uint256 claimedShares = module.claimDeposit(requestId, user1);
        
        assertEq(claimedShares, expectedShares);
        assertEq(IERC20(address(vault)).balanceOf(user1), claimedShares);
        
        (,,,, RequestStatus status,,) = module.getDepositRequest(requestId);
        assertTrue(status == RequestStatus.CLAIMED);
    }
    
    function testCannotClaimNonFulfilledDeposit() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.prank(user1);
        vm.expectRevert(ERC7540AsyncVaultModule.RequestNotFulfilled.selector);
        module.claimDeposit(requestId, user1);
    }
    
    function testControllerCanClaimDeposit() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user2, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(requestId);
        
        // Controller (user2) claims
        vm.prank(user2);
        module.claimDeposit(requestId, user2);
        
        assertTrue(IERC20(address(vault)).balanceOf(user2) > 0);
    }
    
    function testOnlyControllerOrOwnerCanClaimDeposit() public {
        uint256 depositAmount = 10000 * 10**18;
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(requestId);
        
        // Unauthorized user tries to claim
        vm.prank(address(5));
        vm.expectRevert(ERC7540AsyncVaultModule.UnauthorizedController.selector);
        module.claimDeposit(requestId, address(5));
    }
    
    // ============ Deposit Cancellation Tests ============
    
    function testCancelDepositRequest() public {
        uint256 depositAmount = 10000 * 10**18;
        uint256 balanceBefore = asset.balanceOf(user1);
        
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit DepositCancelled(requestId, user1);
        module.cancelDepositRequest(requestId);
        
        (,,,, RequestStatus status,,) = module.getDepositRequest(requestId);
        assertTrue(status == RequestStatus.CANCELLED);
        assertEq(asset.balanceOf(user1), balanceBefore);
        assertEq(module.pendingDepositAssets(), 0);
    }
    
    function testControllerCanCancelDepositRequest() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user2, user1);
        
        vm.prank(user2);
        module.cancelDepositRequest(requestId);
        
        (,,,, RequestStatus status,,) = module.getDepositRequest(requestId);
        assertTrue(status == RequestStatus.CANCELLED);
    }
    
    function testCannotCancelNonPendingDeposit() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.prank(user1);
        module.cancelDepositRequest(requestId);
        
        // Try to cancel again
        vm.prank(user1);
        vm.expectRevert(ERC7540AsyncVaultModule.RequestNotPending.selector);
        module.cancelDepositRequest(requestId);
    }
    
    function testOnlyControllerOrOwnerCanCancelDeposit() public {
        vm.prank(user1);
        uint256 requestId = module.requestDeposit(10000 * 10**18, user1, user1);
        
        vm.prank(address(5));
        vm.expectRevert(ERC7540AsyncVaultModule.UnauthorizedController.selector);
        module.cancelDepositRequest(requestId);
    }
    
    // ============ Redeem Request Tests ============
    
    function testRequestRedeem() public {
        // First get some shares
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(user1);
        uint256 depReqId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(depReqId);
        
        vm.prank(user1);
        uint256 shares = module.claimDeposit(depReqId, user1);
        
        // Now request redeem
        vm.prank(user1);
        IERC20(address(vault)).approve(address(module), shares);
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit RedeemRequested(2, user1, user1, shares);
        uint256 requestId = module.requestRedeem(shares, user1, user1);
        
        assertEq(requestId, 2);
        
        (
            address controller,
            address owner,
            uint256 reqShares,
            uint256 reqAssets,
            RequestStatus status,
            uint256 requestedAt,
            uint256 fulfilledAt
        ) = module.getRedeemRequest(requestId);
        
        assertEq(controller, user1);
        assertEq(owner, user1);
        assertEq(reqShares, shares);
        assertEq(reqAssets, 0);
        assertTrue(status == RequestStatus.PENDING);
        assertEq(requestedAt, block.timestamp);
        assertEq(fulfilledAt, 0);
        assertEq(module.pendingRedeemShares(), shares);
    }
    
    function testCannotRequestRedeemExceedingMaxPending() public {
        // Setup: Get shares first
        uint256 depositAmount = 1000 * 10**18;
        vm.prank(user1);
        uint256 depReqId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(depReqId);
        
        vm.prank(user1);
        uint256 shares = module.claimDeposit(depReqId, user1);
        
        uint256 shareChunk = shares / (MAX_PENDING_REQUESTS + 1);
        
        vm.prank(user1);
        IERC20(address(vault)).approve(address(module), shares);
        
        // Create MAX_PENDING_REQUESTS redeem requests
        vm.startPrank(user1);
        for (uint256 i = 0; i < MAX_PENDING_REQUESTS; i++) {
            module.requestRedeem(shareChunk, user1, user1);
        }
        
        // Try one more
        vm.expectRevert(ERC7540AsyncVaultModule.TooManyPendingRequests.selector);
        module.requestRedeem(shareChunk, user1, user1);
        vm.stopPrank();
    }
    
    // ============ Redeem Fulfillment Tests ============
    
    function testFulfillRedeemRequest() public {
        // Setup: Get shares and request redeem
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(user1);
        uint256 depReqId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(depReqId);
        
        vm.prank(user1);
        uint256 shares = module.claimDeposit(depReqId, user1);
        
        vm.prank(user1);
        IERC20(address(vault)).approve(address(module), shares);
        
        vm.prank(user1);
        uint256 requestId = module.requestRedeem(shares, user1, user1);
        
        // Fast forward and fulfill
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        
        vm.prank(operator);
        vm.expectEmit(true, true, false, false);
        emit RedeemFulfilled(requestId, user1, 0, 0);
        module.fulfillRedeemRequest(requestId);
        
        (,,, uint256 claimableAssets, RequestStatus status, , uint256 fulfilledAt) = module.getRedeemRequest(requestId);
        assertTrue(claimableAssets > 0);
        assertTrue(status == RequestStatus.FULFILLED);
        assertEq(fulfilledAt, block.timestamp);
        assertTrue(module.isRedeemClaimable(requestId));
    }
    
    // ============ Redeem Claim Tests ============
    
    function testClaimRedeem() public {
        // Setup: Full deposit and redeem cycle
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(user1);
        uint256 depReqId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(depReqId);
        
        vm.prank(user1);
        uint256 shares = module.claimDeposit(depReqId, user1);
        
        vm.prank(user1);
        IERC20(address(vault)).approve(address(module), shares);
        
        vm.prank(user1);
        uint256 redeemReqId = module.requestRedeem(shares, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        
        vm.prank(operator);
        module.fulfillRedeemRequest(redeemReqId);
        
        (,,, uint256 expectedAssets,,,) = module.getRedeemRequest(redeemReqId);
        
        uint256 balanceBefore = asset.balanceOf(user1);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit RedeemClaimed(redeemReqId, user1, expectedAssets);
        uint256 claimedAssets = module.claimRedeem(redeemReqId, user1);
        
        assertEq(claimedAssets, expectedAssets);
        assertEq(asset.balanceOf(user1), balanceBefore + claimedAssets);
        
        (,,,, RequestStatus status,,) = module.getRedeemRequest(redeemReqId);
        assertTrue(status == RequestStatus.CLAIMED);
    }
    
    // ============ Admin Function Tests ============
    
    function testSetMinimumFulfillmentDelay() public {
        uint256 newDelay = 2 days;
        
        vm.prank(admin);
        module.setMinimumFulfillmentDelay(newDelay);
        
        assertEq(module.minimumFulfillmentDelay(), newDelay);
    }
    
    function testOnlyAdminCanSetMinimumFulfillmentDelay() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setMinimumFulfillmentDelay(2 days);
    }
    
    function testSetMaxPendingRequestsPerUser() public {
        uint256 newMax = 20;
        
        vm.prank(admin);
        module.setMaxPendingRequestsPerUser(newMax);
        
        assertEq(module.maxPendingRequestsPerUser(), newMax);
    }
    
    function testOnlyAdminCanSetMaxPendingRequestsPerUser() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setMaxPendingRequestsPerUser(20);
    }
    
    // ============ View Function Tests ============
    
    function testPendingDepositAssets() public {
        vm.prank(user1);
        module.requestDeposit(5000 * 10**18, user1, user1);
        
        vm.prank(user2);
        module.requestDeposit(3000 * 10**18, user2, user2);
        
        assertEq(module.pendingDepositAssets(), 8000 * 10**18);
    }
    
    function testGetUserRedeemRequests() public {
        // Setup
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(user1);
        uint256 depReqId = module.requestDeposit(depositAmount, user1, user1);
        
        vm.warp(block.timestamp + MINIMUM_DELAY + 1);
        asset.transfer(address(module), depositAmount);
        
        vm.prank(operator);
        module.fulfillDepositRequest(depReqId);
        
        vm.prank(user1);
        uint256 shares = module.claimDeposit(depReqId, user1);
        
        // Create redeem requests
        vm.prank(user1);
        IERC20(address(vault)).approve(address(module), shares);
        
        vm.startPrank(user1);
        uint256 req1 = module.requestRedeem(shares / 2, user1, user1);
        uint256 req2 = module.requestRedeem(shares / 2, user1, user1);
        vm.stopPrank();
        
        uint256[] memory requests = module.getUserRedeemRequests(user1);
        assertEq(requests.length, 2);
        assertEq(requests[0], req1);
        assertEq(requests[1], req2);
    }
}
