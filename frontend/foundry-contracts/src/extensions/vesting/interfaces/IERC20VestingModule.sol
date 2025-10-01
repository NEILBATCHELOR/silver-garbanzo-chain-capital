// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20VestingModule
 * @notice Interface for token vesting functionality
 * @dev Modular vesting system for token sales and employee incentives
 */
interface IERC20VestingModule {
    // ============ Structs ============
    
    /**
     * @dev Vesting schedule details
     */
    struct VestingSchedule {
        address beneficiary;      // Who receives the vested tokens
        uint256 totalAmount;      // Total tokens to be vested
        uint256 startTime;        // When vesting starts
        uint256 cliffDuration;    // Time before first tokens vest
        uint256 vestingDuration;  // Total vesting period
        uint256 released;         // Tokens already released
        bool revocable;           // Can schedule be revoked
        bool revoked;             // Has schedule been revoked
        string category;          // e.g., "employee", "advisor", "investor"
    }
    
    // ============ Events ============
    
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    
    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );
    
    event VestingRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 unvestedAmount
    );
    
    // ============ Errors ============
    
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidDuration();
    error ScheduleNotFound();
    error NothingToRelease();
    error NotRevocable();
    error AlreadyRevoked();
    error InsufficientVestedTokens();
    
    // ============ Schedule Management ============
    
    /**
     * @notice Create a vesting schedule
     * @param beneficiary Who will receive vested tokens
     * @param amount Total tokens to vest
     * @param startTime When vesting starts
     * @param cliffDuration Time before first tokens vest (seconds)
     * @param vestingDuration Total vesting period (seconds)
     * @param revocable Can this schedule be cancelled
     * @param category Schedule category (e.g., "employee", "investor")
     * @return scheduleId Unique identifier for this schedule
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string memory category
    ) external returns (bytes32 scheduleId);
    
    /**
     * @notice Batch create multiple vesting schedules
     * @param beneficiaries Array of recipients
     * @param amounts Array of token amounts
     * @param startTime Common start time
     * @param cliffDuration Common cliff duration
     * @param vestingDuration Common vesting duration
     * @param revocable Common revocability
     * @param category Common category
     * @return scheduleIds Array of created schedule IDs
     */
    function createVestingSchedules(
        address[] memory beneficiaries,
        uint256[] memory amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string memory category
    ) external returns (bytes32[] memory scheduleIds);
    
    /**
     * @notice Release vested tokens for a schedule
     * @param scheduleId Schedule to release from
     * @return amount Tokens released
     */
    function release(bytes32 scheduleId) external returns (uint256 amount);
    
    /**
     * @notice Revoke a vesting schedule
     * @param scheduleId Schedule to revoke
     */
    function revoke(bytes32 scheduleId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get vesting schedule details
     * @param scheduleId Schedule identifier
     * @return schedule Full schedule details
     */
    function getVestingSchedule(bytes32 scheduleId) 
        external 
        view 
        returns (VestingSchedule memory schedule);
    
    /**
     * @notice Get all schedules for a beneficiary
     * @param beneficiary Address to query
     * @return scheduleIds Array of schedule IDs
     */
    function getSchedulesForBeneficiary(address beneficiary)
        external
        view
        returns (bytes32[] memory scheduleIds);
    
    /**
     * @notice Calculate vested amount for a schedule
     * @param scheduleId Schedule identifier
     * @return vestedAmount Total vested amount
     */
    function getVestedAmount(bytes32 scheduleId) 
        external 
        view 
        returns (uint256 vestedAmount);
    
    /**
     * @notice Calculate releasable amount for a schedule
     * @param scheduleId Schedule identifier
     * @return releaseableAmount Amount that can be released now
     */
    function getReleaseableAmount(bytes32 scheduleId)
        external
        view
        returns (uint256 releaseableAmount);
    
    /**
     * @notice Get total locked tokens for beneficiary
     * @param beneficiary Address to query
     * @return lockedAmount Total locked tokens across all schedules
     */
    function getLockedAmount(address beneficiary)
        external
        view
        returns (uint256 lockedAmount);
    
    /**
     * @notice Get total vesting schedules count
     * @return count Total number of schedules
     */
    function getTotalSchedulesCount() external view returns (uint256 count);
}
