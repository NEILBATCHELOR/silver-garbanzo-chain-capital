// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IERC20VestingModule.sol";
import "./storage/VestingStorage.sol";

/**
 * @title ERC20VestingModule
 * @notice Modular vesting system for ERC20 tokens
 * @dev Separate contract to avoid stack depth in master contracts
 */
contract ERC20VestingModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20VestingModule,
    VestingStorage
{
    using SafeERC20 for IERC20;

    // ============ Roles ============
    
    bytes32 public constant VESTING_MANAGER_ROLE = keccak256("VESTING_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State ============
    
    IERC20 public token;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize vesting module
     * @param admin Admin address
     * @param _token Token to vest
     */
    function initialize(address admin, address _token) public initializer {
        if (admin == address(0)) revert InvalidBeneficiary();
        if (_token == address(0)) revert InvalidBeneficiary();
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VESTING_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        token = IERC20(_token);
    }
    
    // ============ Schedule Management ============
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string memory category
    ) external onlyRole(VESTING_MANAGER_ROLE) returns (bytes32 scheduleId) {
        return _createVestingSchedule(
            beneficiary,
            amount,
            startTime,
            cliffDuration,
            vestingDuration,
            revocable,
            category
        );
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function createVestingSchedules(
        address[] memory beneficiaries,
        uint256[] memory amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string memory category
    ) external onlyRole(VESTING_MANAGER_ROLE) returns (bytes32[] memory scheduleIds) {
        if (beneficiaries.length != amounts.length) revert InvalidAmount();
        
        scheduleIds = new bytes32[](beneficiaries.length);
        
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            scheduleIds[i] = _createVestingSchedule(
                beneficiaries[i],
                amounts[i],
                startTime,
                cliffDuration,
                vestingDuration,
                revocable,
                category
            );
        }
        
        return scheduleIds;
    }
    
    /**
     * @dev Internal function to create vesting schedule
     */
    function _createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string memory category
    ) internal returns (bytes32 scheduleId) {
        // Validations
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (amount == 0) revert InvalidAmount();
        if (vestingDuration == 0) revert InvalidDuration();
        if (startTime == 0) startTime = block.timestamp;
        
        // Generate unique schedule ID
        scheduleId = keccak256(
            abi.encodePacked(
                beneficiary,
                amount,
                startTime,
                block.timestamp,
                _scheduleCounter++
            )
        );
        
        // Create schedule
        _vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            released: 0,
            revocable: revocable,
            revoked: false,
            category: category
        });
        
        // Track schedule
        _beneficiarySchedules[beneficiary].push(scheduleId);
        _allScheduleIds.push(scheduleId);
        
        // Update statistics
        _totalLocked += amount;
        
        // Transfer tokens to contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            amount,
            startTime,
            cliffDuration,
            vestingDuration
        );
        
        return scheduleId;
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function release(bytes32 scheduleId) external returns (uint256 amount) {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound();
        if (schedule.revoked) revert AlreadyRevoked();
        
        // Only beneficiary can release
        if (msg.sender != schedule.beneficiary) revert InvalidBeneficiary();
        
        // Calculate releasable amount
        uint256 releasable = _calculateReleasableAmount(schedule);
        if (releasable == 0) revert NothingToRelease();
        
        // Update state
        schedule.released += releasable;
        _totalReleased += releasable;
        _totalLocked -= releasable;
        
        // Transfer tokens
        token.safeTransfer(schedule.beneficiary, releasable);
        
        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
        
        return releasable;
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function revoke(bytes32 scheduleId) external onlyRole(VESTING_MANAGER_ROLE) {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound();
        if (!schedule.revocable) revert NotRevocable();
        if (schedule.revoked) revert AlreadyRevoked();
        
        // Calculate vested amount
        uint256 vested = _calculateVestedAmount(schedule);
        uint256 unvested = schedule.totalAmount - vested;
        
        // Mark as revoked
        schedule.revoked = true;
        
        // Update statistics
        _totalLocked -= unvested;
        
        // Return unvested tokens to admin
        if (unvested > 0) {
            token.safeTransfer(msg.sender, unvested);
        }
        
        emit VestingRevoked(scheduleId, schedule.beneficiary, unvested);
    }
    
    // ============ View Functions ============
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getVestingSchedule(bytes32 scheduleId) 
        external 
        view 
        returns (VestingSchedule memory schedule) 
    {
        return _vestingSchedules[scheduleId];
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getSchedulesForBeneficiary(address beneficiary)
        external
        view
        returns (bytes32[] memory scheduleIds)
    {
        return _beneficiarySchedules[beneficiary];
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getVestedAmount(bytes32 scheduleId) 
        external 
        view 
        returns (uint256 vestedAmount) 
    {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound();
        
        return _calculateVestedAmount(schedule);
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getReleaseableAmount(bytes32 scheduleId)
        external
        view
        returns (uint256 releaseableAmount)
    {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        if (schedule.beneficiary == address(0)) revert ScheduleNotFound();
        
        return _calculateReleasableAmount(schedule);
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getLockedAmount(address beneficiary)
        external
        view
        returns (uint256 lockedAmount)
    {
        bytes32[] memory scheduleIds = _beneficiarySchedules[beneficiary];
        uint256 locked = 0;
        
        for (uint256 i = 0; i < scheduleIds.length; i++) {
            VestingSchedule storage schedule = _vestingSchedules[scheduleIds[i]];
            if (!schedule.revoked) {
                uint256 vested = _calculateVestedAmount(schedule);
                uint256 unvested = schedule.totalAmount - vested;
                locked += unvested;
            }
        }
        
        return locked;
    }
    
    /**
     * @inheritdoc IERC20VestingModule
     */
    function getTotalSchedulesCount() external view returns (uint256 count) {
        return _allScheduleIds.length;
    }
    
    // ============ Public View Functions ============
    
    /**
     * @notice Get total locked tokens
     * @return Total locked across all schedules
     */
    function getTotalLocked() external view returns (uint256) {
        return _totalLocked;
    }
    
    /**
     * @notice Get total released tokens
     * @return Total released across all schedules
     */
    function getTotalReleased() external view returns (uint256) {
        return _totalReleased;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Calculate vested amount for a schedule
     */
    function _calculateVestedAmount(VestingSchedule storage schedule) 
        internal 
        view 
        returns (uint256) 
    {
        if (schedule.revoked) {
            return schedule.released;
        }
        
        uint256 currentTime = block.timestamp;
        
        // Before start time
        if (currentTime < schedule.startTime) {
            return 0;
        }
        
        // Before cliff
        if (currentTime < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        // After full vesting
        uint256 vestingEnd = schedule.startTime + schedule.vestingDuration;
        if (currentTime >= vestingEnd) {
            return schedule.totalAmount;
        }
        
        // Linear vesting between start and end
        uint256 timeFromStart = currentTime - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * timeFromStart) / schedule.vestingDuration;
        
        return vestedAmount;
    }
    
    /**
     * @dev Calculate releasable amount (vested - released)
     */
    function _calculateReleasableAmount(VestingSchedule storage schedule)
        internal
        view
        returns (uint256)
    {
        uint256 vested = _calculateVestedAmount(schedule);
        return vested - schedule.released;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
