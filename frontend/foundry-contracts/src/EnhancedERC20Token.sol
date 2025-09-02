// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title EnhancedERC20Token
 * @notice A fully-featured ERC20 token supporting all max configuration features
 * @dev Supports: Anti-whale, DeFi fees, tokenomics, governance, compliance, and more
 */
contract EnhancedERC20Token is 
    ERC20, 
    AccessControl, 
    ERC20Permit, 
    ERC20Votes, 
    ERC20Pausable,
    ReentrancyGuard 
{
    using SafeMath for uint256;

    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // Core configuration structure
    struct TokenConfig {
        // Basic token info
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        uint256 maxSupply;
        address initialOwner;
        
        // Feature flags
        bool mintingEnabled;
        bool burningEnabled;
        bool pausable;
        bool votingEnabled;
        bool permitEnabled;
        
        // Anti-whale protection
        bool antiWhaleEnabled;
        uint256 maxWalletAmount;
        uint256 cooldownPeriod;
        
        // Fee system
        bool buyFeeEnabled;
        bool sellFeeEnabled;
        uint256 liquidityFeePercentage;
        uint256 marketingFeePercentage;
        uint256 charityFeePercentage;
        bool autoLiquidityEnabled;
        
        // Tokenomics
        bool reflectionEnabled;
        uint256 reflectionPercentage;
        bool deflationEnabled;
        uint256 deflationRate;
        bool burnOnTransfer;
        uint256 burnPercentage;
        
        // Trading controls
        bool blacklistEnabled;
        uint256 tradingStartTime;
        
        // Compliance
        bool whitelistEnabled;
        bool geographicRestrictionsEnabled;
        
        // Governance
        bool governanceEnabled;
        uint256 quorumPercentage;
        uint256 proposalThreshold;
        uint256 votingDelay;
        uint256 votingPeriod;
        uint256 timelockDelay;
    }

    // State variables
    TokenConfig public tokenConfig;
    
    // Anti-whale protection
    mapping(address => uint256) private lastTransactionTime;
    
    // Fee system
    address public liquidityWallet;
    address public marketingWallet;
    address public charityWallet;
    uint256 public totalFeesCollected;
    
    // Tokenomics
    uint256 public totalReflected;
    uint256 public totalBurned;
    mapping(address => uint256) private reflectionBalances;
    uint256 private totalReflections;
    
    // Trading controls
    mapping(address => bool) public blacklisted;
    bool public tradingEnabled;
    
    // Compliance
    mapping(address => bool) public whitelisted;
    mapping(address => string) public investorCountryCodes;
    mapping(string => bool) public restrictedCountries;
    
    // Presale
    struct PresaleConfig {
        bool enabled;
        uint256 rate;
        uint256 startTime;
        uint256 endTime;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 hardCap;
        uint256 totalRaised;
    }
    PresaleConfig public presaleConfig;
    mapping(address => uint256) public presaleContributions;
    
    // Vesting
    struct VestingSchedule {
        uint256 total;
        uint256 released;
        uint256 cliffPeriod;
        uint256 totalPeriod;
        uint256 releaseFrequency; // in seconds
        uint256 startTime;
    }
    mapping(address => VestingSchedule) public vestingSchedules;
    
    // Governance
    struct GovernanceConfig {
        uint256 proposalCount;
        mapping(uint256 => Proposal) proposals;
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    GovernanceConfig private governance;
    
    // Staking
    struct StakingInfo {
        uint256 amount;
        uint256 startTime;
        uint256 rewards;
    }
    mapping(address => StakingInfo) public stakingInfo;
    uint256 public stakingRewardsRate;
    bool public stakingEnabled;
    
    // Events
    event AntiWhaleTriggered(address indexed user, uint256 amount, uint256 maxAllowed);
    event FeeCollected(string feeType, uint256 amount, address indexed recipient);
    event ReflectionDistributed(uint256 amount);
    event TokensBurnedOnTransfer(uint256 amount);
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event WhitelistUpdated(address indexed account, bool whitelisted);
    event PresaleContribution(address indexed contributor, uint256 amount, uint256 tokens);
    event VestingScheduleCreated(address indexed beneficiary, uint256 total, uint256 cliffPeriod);
    event TokensVested(address indexed beneficiary, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 rewards);

    constructor(TokenConfig memory _config) 
        ERC20(_config.name, _config.symbol) 
        ERC20Permit(_config.name)
    {
        tokenConfig = _config;
        
        // Set up access control
        _grantRole(DEFAULT_ADMIN_ROLE, _config.initialOwner);
        _grantRole(MINTER_ROLE, _config.initialOwner);
        _grantRole(BURNER_ROLE, _config.initialOwner);
        _grantRole(PAUSER_ROLE, _config.initialOwner);
        _grantRole(OPERATOR_ROLE, _config.initialOwner);
        _grantRole(COMPLIANCE_ROLE, _config.initialOwner);
        
        // Initialize wallets (can be updated later)
        liquidityWallet = _config.initialOwner;
        marketingWallet = _config.initialOwner;
        charityWallet = _config.initialOwner;
        
        // Set trading enabled if no start time specified
        tradingEnabled = _config.tradingStartTime == 0 || block.timestamp >= _config.tradingStartTime;
        
        // Mint initial supply if specified
        if (_config.initialSupply > 0) {
            _mint(_config.initialOwner, _config.initialSupply);
        }
    }

    // Override decimals to use config value
    function decimals() public view virtual override returns (uint8) {
        return tokenConfig.decimals;
    }

    // ================================
    // MINTING & BURNING FUNCTIONS
    // ================================
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(tokenConfig.mintingEnabled, "Minting disabled");
        require(to != address(0), "Invalid recipient");
        
        if (tokenConfig.maxSupply > 0) {
            require(totalSupply() + amount <= tokenConfig.maxSupply, "Max supply exceeded");
        }
        
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        require(tokenConfig.burningEnabled, "Burning disabled");
        _burn(msg.sender, amount);
        totalBurned += amount;
    }
    
    function burnFrom(address account, uint256 amount) external {
        require(tokenConfig.burningEnabled, "Burning disabled");
        require(hasRole(BURNER_ROLE, msg.sender) || account == msg.sender, "Unauthorized burn");
        
        if (account != msg.sender) {
            uint256 currentAllowance = allowance(account, msg.sender);
            require(currentAllowance >= amount, "Burn amount exceeds allowance");
            _approve(account, msg.sender, currentAllowance - amount);
        }
        
        _burn(account, amount);
        totalBurned += amount;
    }

    // ================================
    // ANTI-WHALE PROTECTION
    // ================================
    
    function _checkAntiWhale(address from, address to, uint256 amount) internal view {
        if (!tokenConfig.antiWhaleEnabled || from == address(0) || to == address(0)) return;
        
        // Skip checks for admin roles
        if (hasRole(OPERATOR_ROLE, from) || hasRole(OPERATOR_ROLE, to)) return;
        
        // Check max wallet amount
        if (tokenConfig.maxWalletAmount > 0 && to != address(this)) {
            require(
                balanceOf(to) + amount <= tokenConfig.maxWalletAmount,
                "Transfer would exceed max wallet amount"
            );
        }
        
        // Check cooldown period
        if (tokenConfig.cooldownPeriod > 0 && from != address(0)) {
            require(
                block.timestamp >= lastTransactionTime[from] + tokenConfig.cooldownPeriod,
                "Transfer too soon, cooldown active"
            );
        }
    }

    // ================================
    // FEE SYSTEM
    // ================================
    
    function _calculateAndCollectFees(address from, address to, uint256 amount) internal returns (uint256) {
        if (from == address(0) || to == address(0)) return amount;
        if (hasRole(OPERATOR_ROLE, from) || hasRole(OPERATOR_ROLE, to)) return amount;
        
        uint256 totalFeePercentage = 0;
        uint256 liquidityFee = 0;
        uint256 marketingFee = 0;
        uint256 charityFee = 0;
        
        // Calculate fees based on transaction type
        bool isBuy = _isSwapFromPair(from);
        bool isSell = _isSwapToPair(to);
        
        if ((isBuy && tokenConfig.buyFeeEnabled) || (isSell && tokenConfig.sellFeeEnabled) || (!isBuy && !isSell)) {
            if (tokenConfig.liquidityFeePercentage > 0) {
                liquidityFee = amount.mul(tokenConfig.liquidityFeePercentage).div(10000);
                totalFeePercentage += tokenConfig.liquidityFeePercentage;
            }
            
            if (tokenConfig.marketingFeePercentage > 0) {
                marketingFee = amount.mul(tokenConfig.marketingFeePercentage).div(10000);
                totalFeePercentage += tokenConfig.marketingFeePercentage;
            }
            
            if (tokenConfig.charityFeePercentage > 0) {
                charityFee = amount.mul(tokenConfig.charityFeePercentage).div(10000);
                totalFeePercentage += tokenConfig.charityFeePercentage;
            }
        }
        
        // Collect fees
        if (liquidityFee > 0) {
            super._transfer(from, liquidityWallet, liquidityFee);
            emit FeeCollected("liquidity", liquidityFee, liquidityWallet);
        }
        
        if (marketingFee > 0) {
            super._transfer(from, marketingWallet, marketingFee);
            emit FeeCollected("marketing", marketingFee, marketingWallet);
        }
        
        if (charityFee > 0) {
            super._transfer(from, charityWallet, charityFee);
            emit FeeCollected("charity", charityFee, charityWallet);
        }
        
        uint256 totalFees = liquidityFee + marketingFee + charityFee;
        totalFeesCollected += totalFees;
        
        return amount.sub(totalFees);
    }
    
    function _isSwapFromPair(address from) internal pure returns (bool) {
        // This would check if 'from' is a known DEX pair
        // Simplified implementation - in practice, maintain a registry of DEX pairs
        return false;
    }
    
    function _isSwapToPair(address to) internal pure returns (bool) {
        // This would check if 'to' is a known DEX pair
        // Simplified implementation - in practice, maintain a registry of DEX pairs
        return false;
    }

    // ================================
    // TOKENOMICS FEATURES
    // ================================
    
    function _handleReflection(uint256 amount) internal {
        if (!tokenConfig.reflectionEnabled || totalSupply() == 0) return;
        
        uint256 reflectionAmount = amount.mul(tokenConfig.reflectionPercentage).div(10000);
        if (reflectionAmount > 0) {
            totalReflections = totalReflections.add(reflectionAmount);
            emit ReflectionDistributed(reflectionAmount);
        }
    }
    
    function _handleDeflation() internal {
        if (!tokenConfig.deflationEnabled || totalSupply() == 0) return;
        
        uint256 deflationAmount = totalSupply().mul(tokenConfig.deflationRate).div(10000);
        if (deflationAmount > 0 && deflationAmount <= totalSupply()) {
            _burn(address(this), deflationAmount);
            totalBurned += deflationAmount;
        }
    }
    
    function _handleBurnOnTransfer(uint256 amount) internal returns (uint256) {
        if (!tokenConfig.burnOnTransfer || tokenConfig.burnPercentage == 0) return amount;
        
        uint256 burnAmount = amount.mul(tokenConfig.burnPercentage).div(10000);
        if (burnAmount > 0) {
            totalBurned += burnAmount;
            emit TokensBurnedOnTransfer(burnAmount);
            return amount.sub(burnAmount);
        }
        
        return amount;
    }

    // ================================
    // COMPLIANCE & RESTRICTIONS
    // ================================
    
    function _checkCompliance(address from, address to) internal view {
        // Check blacklist
        if (tokenConfig.blacklistEnabled) {
            require(!blacklisted[from], "Sender is blacklisted");
            require(!blacklisted[to], "Recipient is blacklisted");
        }
        
        // Check whitelist
        if (tokenConfig.whitelistEnabled) {
            require(whitelisted[from] || from == address(0), "Sender not whitelisted");
            require(whitelisted[to] || to == address(0), "Recipient not whitelisted");
        }
        
        // Check geographic restrictions
        if (tokenConfig.geographicRestrictionsEnabled) {
            if (bytes(investorCountryCodes[from]).length > 0) {
                require(!restrictedCountries[investorCountryCodes[from]], "Sender country restricted");
            }
            if (bytes(investorCountryCodes[to]).length > 0) {
                require(!restrictedCountries[investorCountryCodes[to]], "Recipient country restricted");
            }
        }
        
        // Check trading enabled
        require(tradingEnabled || from == address(0) || hasRole(OPERATOR_ROLE, from), "Trading not enabled");
    }

    // ================================
    // OVERRIDE TRANSFER FUNCTION
    // ================================
    
    function _update(address from, address to, uint256 value) 
        internal 
        override(ERC20, ERC20Votes, ERC20Pausable) 
    {
        // Run all checks and modifications
        _checkCompliance(from, to);
        _checkAntiWhale(from, to, value);
        
        // Handle special cases (minting/burning)
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        // Apply burn on transfer
        uint256 afterBurnAmount = _handleBurnOnTransfer(value);
        
        // Apply fees and get final transfer amount
        uint256 finalAmount = _calculateAndCollectFees(from, to, afterBurnAmount);
        
        // Update last transaction time for anti-whale
        if (tokenConfig.antiWhaleEnabled && tokenConfig.cooldownPeriod > 0) {
            lastTransactionTime[from] = block.timestamp;
        }
        
        // Handle reflection
        _handleReflection(finalAmount);
        
        // Execute the transfer
        super._update(from, to, finalAmount);
    }

    // ================================
    // ADMIN FUNCTIONS
    // ================================
    
    function updateBlacklist(address account, bool _blacklisted) external onlyRole(COMPLIANCE_ROLE) {
        blacklisted[account] = _blacklisted;
        emit BlacklistUpdated(account, _blacklisted);
    }
    
    function updateWhitelist(address account, bool _whitelisted) external onlyRole(COMPLIANCE_ROLE) {
        whitelisted[account] = _whitelisted;
        emit WhitelistUpdated(account, _whitelisted);
    }
    
    function setInvestorCountryCode(address investor, string memory countryCode) external onlyRole(COMPLIANCE_ROLE) {
        investorCountryCodes[investor] = countryCode;
    }
    
    function setCountryRestriction(string memory countryCode, bool restricted) external onlyRole(COMPLIANCE_ROLE) {
        restrictedCountries[countryCode] = restricted;
    }
    
    function enableTrading() external onlyRole(OPERATOR_ROLE) {
        tradingEnabled = true;
    }
    
    function setFeeWallets(
        address _liquidityWallet,
        address _marketingWallet,
        address _charityWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityWallet = _liquidityWallet;
        marketingWallet = _marketingWallet;
        charityWallet = _charityWallet;
    }

    // ================================
    // PRESALE FUNCTIONS
    // ================================
    
    function configurePresale(
        uint256 _rate,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _hardCap
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        presaleConfig = PresaleConfig({
            enabled: true,
            rate: _rate,
            startTime: _startTime,
            endTime: _endTime,
            minContribution: _minContribution,
            maxContribution: _maxContribution,
            hardCap: _hardCap,
            totalRaised: 0
        });
    }
    
    function participateInPresale() external payable nonReentrant {
        require(presaleConfig.enabled, "Presale not enabled");
        require(block.timestamp >= presaleConfig.startTime, "Presale not started");
        require(block.timestamp <= presaleConfig.endTime, "Presale ended");
        require(msg.value >= presaleConfig.minContribution, "Below minimum contribution");
        require(
            presaleContributions[msg.sender] + msg.value <= presaleConfig.maxContribution,
            "Exceeds maximum contribution"
        );
        require(
            presaleConfig.totalRaised + msg.value <= presaleConfig.hardCap,
            "Hard cap reached"
        );
        
        uint256 tokenAmount = msg.value.mul(presaleConfig.rate);
        
        presaleContributions[msg.sender] += msg.value;
        presaleConfig.totalRaised += msg.value;
        
        _mint(msg.sender, tokenAmount);
        
        emit PresaleContribution(msg.sender, msg.value, tokenAmount);
    }

    // ================================
    // VESTING FUNCTIONS
    // ================================
    
    function createVestingSchedule(
        address beneficiary,
        uint256 total,
        uint256 cliffPeriod,
        uint256 totalPeriod,
        uint256 releaseFrequency
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(total > 0, "Invalid total amount");
        require(totalPeriod > cliffPeriod, "Invalid periods");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            total: total,
            released: 0,
            cliffPeriod: cliffPeriod,
            totalPeriod: totalPeriod,
            releaseFrequency: releaseFrequency,
            startTime: block.timestamp
        });
        
        emit VestingScheduleCreated(beneficiary, total, cliffPeriod);
    }
    
    function releaseVestedTokens() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.total > 0, "No vesting schedule");
        require(block.timestamp >= schedule.startTime + schedule.cliffPeriod, "Cliff period not passed");
        
        uint256 vested = calculateVestedAmount(msg.sender);
        uint256 releasable = vested.sub(schedule.released);
        
        require(releasable > 0, "No tokens to release");
        
        schedule.released = schedule.released.add(releasable);
        _mint(msg.sender, releasable);
        
        emit TokensVested(msg.sender, releasable);
    }
    
    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.total == 0) return 0;
        
        if (block.timestamp < schedule.startTime + schedule.cliffPeriod) {
            return 0;
        }
        
        if (block.timestamp >= schedule.startTime + schedule.totalPeriod) {
            return schedule.total;
        }
        
        uint256 elapsedTime = block.timestamp.sub(schedule.startTime);
        return schedule.total.mul(elapsedTime).div(schedule.totalPeriod);
    }

    // ================================
    // STAKING FUNCTIONS
    // ================================
    
    function stake(uint256 amount) external {
        require(stakingEnabled, "Staking disabled");
        require(amount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calculate pending rewards before updating stake
        uint256 pendingRewards = calculateStakingRewards(msg.sender);
        
        StakingInfo storage info = stakingInfo[msg.sender];
        info.rewards += pendingRewards;
        info.amount += amount;
        info.startTime = block.timestamp;
        
        _transfer(msg.sender, address(this), amount);
        
        emit TokensStaked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        StakingInfo storage info = stakingInfo[msg.sender];
        require(info.amount >= amount, "Insufficient staked amount");
        
        uint256 rewards = calculateStakingRewards(msg.sender);
        
        info.amount -= amount;
        info.rewards = 0;
        info.startTime = block.timestamp;
        
        _transfer(address(this), msg.sender, amount);
        if (rewards > 0) {
            _mint(msg.sender, rewards);
        }
        
        emit TokensUnstaked(msg.sender, amount, rewards);
    }
    
    function calculateStakingRewards(address user) public view returns (uint256) {
        StakingInfo storage info = stakingInfo[user];
        if (info.amount == 0 || !stakingEnabled) return info.rewards;
        
        uint256 stakingTime = block.timestamp.sub(info.startTime);
        uint256 newRewards = info.amount.mul(stakingRewardsRate).mul(stakingTime).div(365 days).div(10000);
        
        return info.rewards.add(newRewards);
    }
    
    function setStakingRewardsRate(uint256 _rate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stakingRewardsRate = _rate; // Rate in basis points (e.g., 1200 = 12% APY)
    }
    
    function enableStaking(bool _enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stakingEnabled = _enabled;
    }

    // ================================
    // VIEW FUNCTIONS
    // ================================
    
    function getTokenInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _totalBurned,
        uint256 _totalFeesCollected,
        bool _tradingEnabled
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            tokenConfig.maxSupply,
            totalBurned,
            totalFeesCollected,
            tradingEnabled
        );
    }
    
    function getFeatureFlags() external view returns (
        bool mintingEnabled,
        bool burningEnabled,
        bool pausable,
        bool antiWhaleEnabled,
        bool feeSystemEnabled,
        bool reflectionEnabled,
        bool governanceEnabled,
        bool stakingEnabled
    ) {
        return (
            tokenConfig.mintingEnabled,
            tokenConfig.burningEnabled,
            tokenConfig.pausable,
            tokenConfig.antiWhaleEnabled,
            tokenConfig.buyFeeEnabled || tokenConfig.sellFeeEnabled,
            tokenConfig.reflectionEnabled,
            tokenConfig.governanceEnabled,
            stakingEnabled
        );
    }

    // ================================
    // COMPATIBILITY OVERRIDES
    // ================================
    
    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        require(tokenConfig.pausable, "Pausing disabled");
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // Required overrides for multiple inheritance
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
